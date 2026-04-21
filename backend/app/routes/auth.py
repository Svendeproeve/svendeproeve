from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.config import settings
from app.dependencies import get_current_user
from app.db import users_collection
from app.email import generate_password_reset_email, send_email
from app.schemas import (
    AuthResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    SigninRequest,
    SignupRequest,
    UserOut,
)
from app.security import (
    create_access_token,
    generate_reset_token,
    hash_password,
    verify_password,
)
from app.utils import ensure_timezone_aware

router = APIRouter(prefix="/auth", tags=["auth"])


def _to_user_out(user_doc: dict) -> UserOut:
    return UserOut(
        id=str(user_doc["_id"]),
        email=user_doc["email"],
        full_name=user_doc.get("full_name"),
        created_at=user_doc["created_at"],
    )


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest):
    document = {
        "email": payload.email.lower(),
        "password_hash": hash_password(payload.password),
        "full_name": payload.full_name,
        "created_at": datetime.now(timezone.utc),
    }

    try:
        result = users_collection.insert_one(document)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already registered"
        )

    created_user = users_collection.find_one({"_id": result.inserted_id})
    token = create_access_token(subject=created_user["email"])
    return AuthResponse(access_token=token, user=_to_user_out(created_user))


@router.post("/signin", response_model=AuthResponse)
def signin(payload: SigninRequest):
    user = users_collection.find_one({"email": payload.email.lower()})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )

    if not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )

    token = create_access_token(subject=user["email"])
    return AuthResponse(access_token=token, user=_to_user_out(user))


@router.get("/me", response_model=UserOut)
def me(current_user: dict = Depends(get_current_user)):
    return _to_user_out(current_user)


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password(payload: ForgotPasswordRequest):
    """
    Request a password reset email.
    Returns 200 even if email doesn't exist (security best practice).
    """
    user = users_collection.find_one({"email": payload.email.lower()})

    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If the email exists, a password reset link has been sent"}

    # Generate reset token
    reset_token = generate_reset_token()
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.password_reset_expire_minutes
    )

    # Update user with reset token
    users_collection.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "password_reset_token": reset_token,
                "password_reset_token_expires_at": expires_at,
            }
        },
    )

    # Generate reset link
    reset_link = f"{settings.frontend_url}/reset-password?token={reset_token}"

    # Send email
    email_html = generate_password_reset_email(reset_link, user["email"])
    await send_email(
        to_email=user["email"],
        subject="Password Reset Request",
        html_content=email_html,
    )

    return {"message": "If the email exists, a password reset link has been sent"}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(payload: ResetPasswordRequest):
    """
    Reset password using a valid reset token.
    """
    user = users_collection.find_one({"password_reset_token": payload.token})

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    # Check if token has expired
    if user.get("password_reset_token_expires_at"):
        expires_at = ensure_timezone_aware(user["password_reset_token_expires_at"])
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token",
            )

    # Update password and clear reset token
    users_collection.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "password_hash": hash_password(payload.new_password),
            },
            "$unset": {
                "password_reset_token": "",
                "password_reset_token_expires_at": "",
            },
        },
    )

    return {"message": "Password has been reset successfully"}
