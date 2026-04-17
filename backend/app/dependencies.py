from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.db import memberships_collection, users_collection
from app.security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/signin")


def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    try:
        payload = decode_access_token(token)
    except ValueError:
        # Expired or malformed JWT — must be 401 so clients can redirect to login.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    subject = payload.get("sub")
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject"
        )
    user = users_collection.find_one({"email": subject})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )
    return user


def require_org_membership(org_id: str, user_id: str) -> dict:
    membership = memberships_collection.find_one({"org_id": org_id, "user_id": user_id})
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this organization",
        )
    return membership


def require_org_admin(org_id: str, user_id: str) -> dict:
    membership = require_org_membership(org_id, user_id)
    if membership["role"] not in ("owner", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required",
        )
    return membership
