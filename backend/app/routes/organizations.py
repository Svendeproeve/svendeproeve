from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from app.config import settings
from app.db import (
    categories_collection,
    memberships_collection,
    org_invitations_collection,
    organizations_collection,
    users_collection,
)
from app.dependencies import get_current_user, require_org_admin, require_org_membership
from app.email import generate_org_invite_email, send_email
from app.schemas import (
    InviteMemberRequest,
    MembershipOut,
    OrganizationCreateRequest,
    OrganizationOut,
    UpdateMemberRoleRequest,
)
from app.security import generate_secure_token
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
    memberships = list(
        memberships_collection.find({"user_id": str(current_user["_id"])}, {"org_id": 1})
    )
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
        )
        for m in members
    ]


@router.post("/{org_id}/members/invite", status_code=status.HTTP_200_OK)
async def invite_member(
    org_id: str,
    payload: InviteMemberRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    require_org_admin(org_id, str(current_user["_id"]))

    email = payload.email.lower()

    # Reject if already a member
    existing_user = users_collection.find_one({"email": email})
    if existing_user and memberships_collection.find_one({"org_id": org_id, "user_id": str(existing_user["_id"])}):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already a member of this organization",
        )

    org = organizations_collection.find_one({"_id": parse_object_id(org_id, "org_id")})

    token = generate_secure_token()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.invite_token_expire_hours)

    # Upsert: re-invite refreshes the token and expiry
    org_invitations_collection.update_one(
        {"org_id": org_id, "email": email},
        {"$set": {
            "role": payload.role,
            "token": token,
            "expires_at": expires_at,
            "invited_by_user_id": str(current_user["_id"]),
            "invited_by_email": current_user["email"],
            "created_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )

    invite_link = f"{settings.frontend_url}/accept-invite?token={token}"
    email_html = generate_org_invite_email(invite_link, org["name"], current_user["email"], email)
    background_tasks.add_task(send_email, email, f"You've been invited to join {org['name']} on Sortr", email_html)

    return {"message": f"Invitation sent to {email}"}


@router.patch("/{org_id}/members/{user_id}/role", response_model=MembershipOut)
def update_member_role(
    org_id: str,
    user_id: str,
    payload: UpdateMemberRoleRequest,
    current_user: dict = Depends(get_current_user),
):
    caller_membership = require_org_admin(org_id, str(current_user["_id"]))

    target = memberships_collection.find_one({"org_id": org_id, "user_id": user_id})
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    if target["role"] == "owner":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot change the owner's role")

    if str(current_user["_id"]) == user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot change your own role")

    if caller_membership["role"] == "admin" and target["role"] == "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins cannot change other admins' roles")

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
    )


@router.delete("/{org_id}/members/{user_id}", status_code=status.HTTP_200_OK)
def remove_member(
    org_id: str,
    user_id: str,
    current_user: dict = Depends(get_current_user),
):
    caller_membership = require_org_admin(org_id, str(current_user["_id"]))

    target = memberships_collection.find_one({"org_id": org_id, "user_id": user_id})
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    if target["role"] == "owner":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="The owner cannot be removed")

    if str(current_user["_id"]) == user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot remove yourself")

    if caller_membership["role"] == "admin" and target["role"] == "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins cannot remove other admins")

    memberships_collection.delete_one({"org_id": org_id, "user_id": user_id})
    return {"message": "Member removed"}
