from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.db import (
    categories_collection,
    mail_accounts_collection,
    member_category_access_collection,
    memberships_collection,
)
from app.dependencies import get_current_user, require_org_admin, require_org_membership
from app.schemas import (
    CategoryCreateRequest,
    CategoryOut,
    CategoryUpdateRequest,
    MemberCategoryAccessUpdateRequest,
)
from app.utils import parse_object_id

router = APIRouter(prefix="/organizations/{org_id}/categories", tags=["categories"])


def _to_category_out(doc: dict) -> CategoryOut:
    return CategoryOut(
        id=str(doc["_id"]),
        org_id=doc["org_id"],
        name=doc["name"],
        description=doc.get("description"),
        mail_account_ids=doc.get("mail_account_ids"),
        is_system=bool(doc.get("is_system", False)),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    org_id: str,
    payload: CategoryCreateRequest,
    current_user: dict = Depends(get_current_user),
):
    require_org_admin(org_id, str(current_user["_id"]))
    mail_account_ids = None
    if payload.mail_account_ids is not None:
        mail_account_ids = list(dict.fromkeys(payload.mail_account_ids))
        if len(mail_account_ids) > 0:
            mail_oids = [parse_object_id(mid, "mail_account_id") for mid in mail_account_ids]
            found = list(
                mail_accounts_collection.find({"_id": {"$in": mail_oids}, "org_id": org_id})
            )
            found_ids = {str(m["_id"]) for m in found}
            if found_ids != set(mail_account_ids):
                raise HTTPException(status_code=400, detail="One or more mail accounts are invalid")

    now = datetime.now(timezone.utc)
    doc = {
        "org_id": org_id,
        "name": payload.name.strip(),
        "description": payload.description,
        "mail_account_ids": mail_account_ids,
        "is_system": False,
        "created_at": now,
        "updated_at": now,
    }
    result = categories_collection.insert_one(doc)
    created = categories_collection.find_one({"_id": result.inserted_id})
    return _to_category_out(created)


@router.get("", response_model=list[CategoryOut])
def list_categories(org_id: str, current_user: dict = Depends(get_current_user)):
    require_org_membership(org_id, str(current_user["_id"]))
    docs = list(categories_collection.find({"org_id": org_id}))
    return [_to_category_out(d) for d in docs]


@router.put("/{category_id}", response_model=CategoryOut)
def update_category(
    org_id: str,
    category_id: str,
    payload: CategoryUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    require_org_admin(org_id, str(current_user["_id"]))
    oid = parse_object_id(category_id, "category_id")
    existing = categories_collection.find_one({"_id": oid, "org_id": org_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    if existing.get("is_system"):
        raise HTTPException(status_code=403, detail="System category cannot be modified")

    update = payload.model_dump(exclude_unset=True)
    if "mail_account_ids" in update and update["mail_account_ids"] is not None:
        mail_account_ids = list(dict.fromkeys(update["mail_account_ids"]))
        if len(mail_account_ids) == 0:
            update["mail_account_ids"] = None
        else:
            mail_oids = [parse_object_id(mid, "mail_account_id") for mid in mail_account_ids]
            found = list(
                mail_accounts_collection.find({"_id": {"$in": mail_oids}, "org_id": org_id})
            )
            found_ids = {str(m["_id"]) for m in found}
            if found_ids != set(mail_account_ids):
                raise HTTPException(status_code=400, detail="One or more mail accounts are invalid")
            update["mail_account_ids"] = mail_account_ids
    if update:
        update["updated_at"] = datetime.now(timezone.utc)
        categories_collection.update_one({"_id": oid}, {"$set": update})
    updated = categories_collection.find_one({"_id": oid})
    return _to_category_out(updated)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(org_id: str, category_id: str, current_user: dict = Depends(get_current_user)):
    require_org_admin(org_id, str(current_user["_id"]))
    oid = parse_object_id(category_id, "category_id")
    existing = categories_collection.find_one({"_id": oid, "org_id": org_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    if existing.get("is_system"):
        raise HTTPException(status_code=403, detail="System category cannot be deleted")
    result = categories_collection.delete_one({"_id": oid, "org_id": org_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    member_category_access_collection.delete_many({"org_id": org_id, "category_id": category_id})
    return None


@router.put("/members/{member_user_id}/access", response_model=dict)
def set_member_category_access(
    org_id: str,
    member_user_id: str,
    payload: MemberCategoryAccessUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    require_org_admin(org_id, str(current_user["_id"]))
    member = memberships_collection.find_one({"org_id": org_id, "user_id": member_user_id})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found in organization")

    valid_category_oids = [parse_object_id(i, "category_id") for i in payload.category_ids]
    valid_categories = list(
        categories_collection.find({"_id": {"$in": valid_category_oids}, "org_id": org_id})
    )
    valid_ids = {str(c["_id"]) for c in valid_categories}
    requested_ids = set(payload.category_ids)
    if valid_ids != requested_ids:
        raise HTTPException(
            status_code=400,
            detail="One or more category IDs are invalid for this organization",
        )

    member_category_access_collection.delete_many({"org_id": org_id, "user_id": member_user_id})
    now = datetime.now(timezone.utc)
    if valid_ids:
        member_category_access_collection.insert_many(
            [
                {
                    "org_id": org_id,
                    "user_id": member_user_id,
                    "category_id": category_id,
                    "created_at": now,
                }
                for category_id in valid_ids
            ]
        )
    return {"user_id": member_user_id, "category_ids": sorted(valid_ids)}


@router.get("/members/{member_user_id}/access", response_model=dict)
def get_member_category_access(
    org_id: str, member_user_id: str, current_user: dict = Depends(get_current_user)
):
    require_org_membership(org_id, str(current_user["_id"]))
    docs = member_category_access_collection.find(
        {"org_id": org_id, "user_id": member_user_id}, {"category_id": 1}
    )
    category_ids = sorted([d["category_id"] for d in docs])
    return {"user_id": member_user_id, "category_ids": category_ids}
