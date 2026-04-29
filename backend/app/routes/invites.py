from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.db import memberships_collection, organizations_collection
from app.dependencies import get_current_user
from app.schemas import InviteDetailOut
from app.utils import ensure_timezone_aware, parse_object_id

router = APIRouter(prefix="/invites", tags=["invites"])


def _get_membership_by_token(token: str) -> dict:
    membership = memberships_collection.find_one({"invite_token": token})
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")
    return membership


@router.get("/{token}", response_model=InviteDetailOut)
def get_invite_details(token: str):
    membership = _get_membership_by_token(token)

    org = organizations_collection.find_one({"_id": parse_object_id(membership["org_id"], "org_id")})
    org_name = org["name"] if org else "Unknown Organization"

    expires_at = membership.get("invite_expires_at")
    is_expired = bool(expires_at and ensure_timezone_aware(expires_at) < datetime.now(timezone.utc))
    already_responded = membership.get("invitation_status") != "pending"

    return InviteDetailOut(
        org_name=org_name,
        invited_by_email=membership.get("invited_by_email", ""),
        is_expired=is_expired,
        already_responded=already_responded,
    )


@router.post("/{token}/accept", status_code=status.HTTP_200_OK)
def accept_invite(token: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    membership = memberships_collection.find_one({
        "invite_token": token,
        "user_id": user_id,
        "invitation_status": "pending",
    })
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invite not found, already responded, or does not belong to your account",
        )

    expires_at = membership.get("invite_expires_at")
    if expires_at and ensure_timezone_aware(expires_at) < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Invite has expired")

    memberships_collection.update_one(
        {"invite_token": token},
        {"$set": {"invitation_status": "accepted"}},
    )
    return {"message": "Invite accepted"}


@router.post("/{token}/decline", status_code=status.HTTP_200_OK)
def decline_invite(token: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    membership = memberships_collection.find_one({
        "invite_token": token,
        "user_id": user_id,
        "invitation_status": "pending",
    })
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invite not found, already responded, or does not belong to your account",
        )

    memberships_collection.delete_one({"invite_token": token, "user_id": user_id})
    return {"message": "Invite declined"}
