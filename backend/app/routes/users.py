from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.dependencies import get_current_user
from app.db import (
    users_collection,
    memberships_collection,
    emails_collection,
    organizations_collection,
    mail_accounts_collection,
    categories_collection,
    filters_collection,
    member_category_access_collection,
    thread_cases_collection,
)
from app.security import hash_password, verify_password

router = APIRouter(prefix="/users", tags=["users"])


class UpdateProfileRequest(BaseModel):
    full_name: str = Field(min_length=1, max_length=120)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


@router.patch("/{user_id}")
def update_profile(
    user_id: str,
    payload: UpdateProfileRequest,
    current_user: dict = Depends(get_current_user),
):
    """Update user profile information."""
    # Verify the user is updating their own profile
    if str(current_user["_id"]) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own profile",
        )

    # Validate user_id format
    try:
        user_object_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format",
        )

    # Update the user
    result = users_collection.update_one(
        {"_id": user_object_id},
        {"$set": {"full_name": payload.full_name}},
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return {"message": "Profile updated successfully"}


@router.post("/{user_id}/change-password")
def change_password(
    user_id: str,
    payload: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
):
    """Change user password."""
    # Verify the user is changing their own password
    if str(current_user["_id"]) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only change your own password",
        )

    # Verify current password
    if not verify_password(payload.current_password, current_user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect",
        )

    # Validate user_id format
    try:
        user_object_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format",
        )

    # Update the password
    result = users_collection.update_one(
        {"_id": user_object_id},
        {"$set": {"password_hash": hash_password(payload.new_password)}},
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return {"message": "Password changed successfully"}


@router.delete("/{user_id}")
def delete_account(
    user_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Delete user account and associated data.
    - Deletes organizations owned by the user (including all org data)
    - Removes user from organizations they don't own
    - Unassigns user from threads in other organizations
    - Deletes user account and personal data
    """
    # Verify the user is deleting their own account
    if str(current_user["_id"]) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own account",
        )

    # Validate user_id format
    try:
        user_object_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format",
        )

    # Find all organizations owned by the user
    owned_orgs = list(organizations_collection.find({"owner_user_id": user_id}))

    for org in owned_orgs:
        org_id = str(org["_id"])

        # Delete all data associated with owned organizations
        mail_accounts_collection.delete_many({"org_id": org_id})
        categories_collection.delete_many({"org_id": org_id})
        filters_collection.delete_many({"org_id": org_id})
        member_category_access_collection.delete_many({"org_id": org_id})
        emails_collection.delete_many({"org_id": org_id})
        thread_cases_collection.delete_many({"org_id": org_id})
        memberships_collection.delete_many({"org_id": org_id})

        # Delete the organization itself
        organizations_collection.delete_one({"_id": org["_id"]})

    # For organizations the user is a member of (but doesn't own)
    # Remove their memberships
    memberships_collection.delete_many({"user_id": user_id})

    # Unassign user from all emails/threads in other organizations
    emails_collection.update_many(
        {"assigned_to": user_id},
        {"$unset": {"assigned_to": ""}}
    )

    # Delete member category access for the user
    member_category_access_collection.delete_many({"user_id": user_id})

    # Delete the user account
    result = users_collection.delete_one({"_id": user_object_id})

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return {"message": "Account deleted successfully"}
