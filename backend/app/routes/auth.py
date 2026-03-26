from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.dependencies import get_current_user
from app.db import users_collection
from app.schemas import AuthResponse, SigninRequest, SignupRequest, UserOut
from app.security import create_access_token, hash_password, verify_password

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
