from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.db import inboxes_collection, memberships_collection, organizations_collection, users_collection
from app.dependencies import get_current_user, require_org_admin, require_org_membership
from app.schemas import (
    InviteMemberRequest,
    MembershipOut,
    OrganizationCreateRequest,
    OrganizationOut,
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
    inboxes_collection.insert_one(
        {
            "org_id": org_id,
            "name": "Uncategorised",
            "description": "Fallback category for emails that do not match any category.",
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


@router.post("/{org_id}/members/invite", response_model=MembershipOut)
def invite_existing_user(
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
        return MembershipOut(
            user_id=existing["user_id"],
            user_email=user["email"],
            user_full_name=user.get("full_name"),
            role=existing["role"],
            created_at=existing["created_at"],
        )

    membership = {
        "org_id": org_id,
        "user_id": str(user["_id"]),
        "role": payload.role,
        "created_at": datetime.now(timezone.utc),
    }
    memberships_collection.insert_one(membership)
    return MembershipOut(
        user_id=membership["user_id"],
        user_email=user["email"],
        user_full_name=user.get("full_name"),
        role=membership["role"],
        created_at=membership["created_at"],
    )
