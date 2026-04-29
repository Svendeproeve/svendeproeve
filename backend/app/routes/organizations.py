import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.db import categories_collection, member_category_access_collection, memberships_collection, organizations_collection, users_collection
from app.dependencies import get_current_user, require_org_admin, require_org_membership
from app.config import settings
from app.email import generate_invitation_email, send_email
from app.schemas import (
    InviteMemberRequest,
    MembershipOut,
    OrganizationCreateRequest,
    OrganizationOut,
    UpdateMemberRoleRequest,
)
from app.utils import parse_object_id

router = APIRouter(prefix="/organizations", tags=["organizations"])


@router.post("", response_model=OrganizationOut, status_code=status.HTTP_201_CREATED)
def create_organization(
    payload: OrganizationCreateRequest, current_user: dict = Depends(get_current_user)
):
    now = datetime.now(timezone.utc)
    org_doc = {
        "name": payload.name.strip(),
        "owner_user_id": str(current_user["_id"]),
        "created_at": now,
    }
    result = organizations_collection.insert_one(org_doc)
    org_id = str(result.inserted_id)

    memberships_collection.insert_one(
        {
            "org_id": org_id,
            "user_id": str(current_user["_id"]),
            "role": "owner",
            "created_at": now,
        }
    )
    # System fallback category: uncategorised
    categories_collection.insert_one(
        {
            "org_id": org_id,
            "name": "Uncategorised",
            "description": "Fallback category for emails that do not match any category.",
            "color": None,
            "mail_account_ids": None,  # applies to all mail accounts
            "is_system": True,
            "created_at": now,
            "updated_at": now,
        }
    )
    return OrganizationOut(id=org_id, **org_doc)


@router.get("", response_model=list[OrganizationOut])
def list_my_organizations(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    memberships = list(memberships_collection.find(
        {"user_id": user_id, "invitation_status": {"$ne": "pending"}},
        {"org_id": 1},
    ))

    org_ids = [parse_object_id(m["org_id"], "org_id") for m in memberships]
    if not org_ids:
        return []
    orgs = organizations_collection.find({"_id": {"$in": org_ids}})
    return [
        OrganizationOut(
            id=str(org["_id"]),
            name=org["name"],
            owner_user_id=org["owner_user_id"],
            created_at=org["created_at"],
        )
        for org in orgs
    ]


@router.get("/{org_id}/members", response_model=list[MembershipOut])
def list_members(org_id: str, current_user: dict = Depends(get_current_user)):
    require_org_membership(org_id, str(current_user["_id"]))
    members = list(memberships_collection.find({"org_id": org_id}))
    user_ids = [parse_object_id(m["user_id"], "user_id") for m in members]
    users = {
        str(u["_id"]): u for u in users_collection.find({"_id": {"$in": user_ids}})
    } if user_ids else {}
    return [
        MembershipOut(
            user_id=m["user_id"],
            user_email=users.get(m["user_id"], {}).get("email", "unknown@example.com"),
            user_full_name=users.get(m["user_id"], {}).get("full_name"),
            role=m["role"],
            created_at=m["created_at"],
            invitation_status=m.get("invitation_status", "accepted"),
        )
        for m in members
    ]


@router.post("/{org_id}/members/invite", response_model=MembershipOut)
async def invite_existing_user(
    org_id: str,
    payload: InviteMemberRequest,
    current_user: dict = Depends(get_current_user),
):
    require_org_admin(org_id, str(current_user["_id"]))
    user = users_collection.find_one({"email": payload.email.lower()})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User with that email does not exist",
        )

    existing = memberships_collection.find_one(
        {"org_id": org_id, "user_id": str(user["_id"])}
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already a member of this organization",
        )

    invite_token = secrets.token_urlsafe(32)
    invite_expires_at = datetime.now(timezone.utc) + timedelta(days=settings.invite_expire_days)

    membership = {
        "org_id": org_id,
        "user_id": str(user["_id"]),
        "role": payload.role,
        "created_at": datetime.now(timezone.utc),
        "invitation_status": "pending",
        "invite_token": invite_token,
        "invite_expires_at": invite_expires_at,
        "invited_by_email": current_user["email"],
    }
    memberships_collection.insert_one(membership)

    org = organizations_collection.find_one({"_id": parse_object_id(org_id, "org_id")})
    org_name = org["name"] if org else "an organization"
    invite_link = f"{settings.frontend_url}/invite/{invite_token}"
    email_html = generate_invitation_email(org_name, current_user["email"], invite_link)
    await send_email(
        to_email=user["email"],
        subject=f"You've been invited to {org_name} on Sortr",
        html_content=email_html,
    )

    return MembershipOut(
        user_id=membership["user_id"],
        user_email=user["email"],
        user_full_name=user.get("full_name"),
        role=membership["role"],
        created_at=membership["created_at"],
        invitation_status="pending",
    )


@router.patch("/{org_id}/members/{user_id}", response_model=MembershipOut)
def update_member_role(
    org_id: str,
    user_id: str,
    payload: UpdateMemberRoleRequest,
    current_user: dict = Depends(get_current_user),
):
    caller = require_org_admin(org_id, str(current_user["_id"]))

    target = memberships_collection.find_one({"org_id": org_id, "user_id": user_id})
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    if target["role"] == "owner":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot change the owner's role")
    if caller["role"] == "admin" and target["role"] == "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins cannot change another admin's role")

    memberships_collection.update_one(
        {"org_id": org_id, "user_id": user_id},
        {"$set": {"role": payload.role}},
    )

    user = users_collection.find_one({"_id": parse_object_id(user_id, "user_id")})
    return MembershipOut(
        user_id=user_id,
        user_email=user["email"] if user else "unknown@example.com",
        user_full_name=user.get("full_name") if user else None,
        role=payload.role,
        created_at=target["created_at"],
        invitation_status=target.get("invitation_status", "accepted"),
    )


@router.delete("/{org_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    org_id: str,
    user_id: str,
    current_user: dict = Depends(get_current_user),
):
    caller = require_org_admin(org_id, str(current_user["_id"]))

    target = memberships_collection.find_one({"org_id": org_id, "user_id": user_id})
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    if target["role"] == "owner":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot remove the organization owner")
    if caller["role"] == "admin" and target["role"] == "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins can only remove members, not other admins")

    memberships_collection.delete_one({"org_id": org_id, "user_id": user_id})


@router.delete("/{org_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
def leave_organization(
    org_id: str,
    current_user: dict = Depends(get_current_user),
):
    user_id = str(current_user["_id"])
    membership = memberships_collection.find_one({"org_id": org_id, "user_id": user_id})
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="You are not a member of this organization")
    if membership["role"] == "owner":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Organization owners cannot leave")

    memberships_collection.delete_one({"org_id": org_id, "user_id": user_id})
    member_category_access_collection.delete_many({"org_id": org_id, "user_id": user_id})
