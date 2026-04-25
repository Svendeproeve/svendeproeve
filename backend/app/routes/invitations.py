from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.db import memberships_collection, org_invitations_collection, organizations_collection, users_collection
from app.dependencies import get_current_user
from app.schemas import AcceptAndRegisterRequest, AuthResponse, OrgInvitationPreview, UserOut
from app.security import create_access_token, hash_password
from app.utils import ensure_timezone_aware, parse_object_id

router = APIRouter(prefix="/invitations", tags=["invitations"])


def _get_valid_invite(token: str) -> dict:
    invite = org_invitations_collection.find_one({"token": token})
    if not invite:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found")
    if ensure_timezone_aware(invite["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Invitation has expired")
    return invite


def _create_membership(org_id: str, user_id: str, role: str) -> None:
    try:
        memberships_collection.insert_one({
            "org_id": org_id,
            "user_id": user_id,
            "role": role,
            "created_at": datetime.now(timezone.utc),
        })
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Already a member of this organization",
        )


def _to_user_out(user_doc: dict) -> UserOut:
    return UserOut(
        id=str(user_doc["_id"]),
        email=user_doc["email"],
        full_name=user_doc.get("full_name"),
        created_at=user_doc["created_at"],
    )


@router.get("/{token}", response_model=OrgInvitationPreview)
def get_invite_preview(token: str):
    invite = _get_valid_invite(token)
    org = organizations_collection.find_one({"_id": parse_object_id(invite["org_id"], "org_id")})
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    user_exists = users_collection.find_one({"email": invite["email"]}) is not None
    return OrgInvitationPreview(
        org_name=org["name"],
        role=invite["role"],
        invited_email=invite["email"],
        invited_by_email=invite["invited_by_email"],
        user_exists=user_exists,
    )


@router.post("/{token}/accept", status_code=status.HTTP_200_OK)
def accept_invite(token: str, current_user: dict = Depends(get_current_user)):
    invite = _get_valid_invite(token)

    if current_user["email"] != invite["email"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This invitation was sent to a different email address",
        )

    _create_membership(invite["org_id"], str(current_user["_id"]), invite["role"])
    org_invitations_collection.delete_one({"token": token})

    org = organizations_collection.find_one({"_id": parse_object_id(invite["org_id"], "org_id")})
    return {"message": f"Successfully joined {org['name'] if org else 'the organization'}"}


@router.post("/{token}/accept-and-register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def accept_and_register(token: str, payload: AcceptAndRegisterRequest):
    invite = _get_valid_invite(token)

    if users_collection.find_one({"email": invite["email"]}):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists. Please log in and accept the invitation.",
        )

    try:
        result = users_collection.insert_one({
            "email": invite["email"],
            "password_hash": hash_password(payload.password),
            "full_name": payload.full_name,
            "created_at": datetime.now(timezone.utc),
        })
    except DuplicateKeyError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = users_collection.find_one({"_id": result.inserted_id})
    _create_membership(invite["org_id"], str(user["_id"]), invite["role"])
    org_invitations_collection.delete_one({"token": token})

    return AuthResponse(
        access_token=create_access_token(subject=user["email"]),
        user=_to_user_out(user),
    )


@router.delete("/{token}", status_code=status.HTTP_200_OK)
def decline_invite(token: str):
    _get_valid_invite(token)
    org_invitations_collection.delete_one({"token": token})
    return {"message": "Invitation declined"}
