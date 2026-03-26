from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.db import filters_collection, inboxes_collection
from app.dependencies import get_current_user, require_org_admin, require_org_membership
from app.schemas import FilterCreateRequest, FilterOut, FilterUpdateRequest
from app.utils import parse_object_id

router = APIRouter(prefix="/organizations/{org_id}/filters", tags=["filters"])


def _to_filter_out(doc: dict) -> FilterOut:
    return FilterOut(
        id=str(doc["_id"]),
        org_id=doc["org_id"],
        name=doc["name"],
        description=doc.get("description"),
        match_query=doc["match_query"],
        target_inbox_id=doc["target_inbox_id"],
        is_active=doc["is_active"],
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


@router.post("", response_model=FilterOut, status_code=status.HTTP_201_CREATED)
def create_filter(
    org_id: str,
    payload: FilterCreateRequest,
    current_user: dict = Depends(get_current_user),
):
    require_org_admin(org_id, str(current_user["_id"]))
    target_oid = parse_object_id(payload.target_inbox_id, "target_inbox_id")
    target = inboxes_collection.find_one({"_id": target_oid, "org_id": org_id})
    if not target:
        raise HTTPException(status_code=400, detail="Target inbox not found in organization")

    now = datetime.now(timezone.utc)
    doc = {
        "org_id": org_id,
        "name": payload.name.strip(),
        "description": payload.description,
        "match_query": payload.match_query.strip(),
        "target_inbox_id": payload.target_inbox_id,
        "is_active": payload.is_active,
        "created_at": now,
        "updated_at": now,
    }
    result = filters_collection.insert_one(doc)
    created = filters_collection.find_one({"_id": result.inserted_id})
    return _to_filter_out(created)


@router.get("", response_model=list[FilterOut])
def list_filters(org_id: str, current_user: dict = Depends(get_current_user)):
    require_org_membership(org_id, str(current_user["_id"]))
    docs = list(filters_collection.find({"org_id": org_id}))
    return [_to_filter_out(d) for d in docs]


@router.put("/{filter_id}", response_model=FilterOut)
def update_filter(
    org_id: str,
    filter_id: str,
    payload: FilterUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    require_org_admin(org_id, str(current_user["_id"]))
    oid = parse_object_id(filter_id, "filter_id")
    existing = filters_collection.find_one({"_id": oid, "org_id": org_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Filter not found")

    update = payload.model_dump(exclude_unset=True)
    if "target_inbox_id" in update and update["target_inbox_id"] is not None:
        target_oid = parse_object_id(update["target_inbox_id"], "target_inbox_id")
        target = inboxes_collection.find_one({"_id": target_oid, "org_id": org_id})
        if not target:
            raise HTTPException(
                status_code=400, detail="Target inbox not found in organization"
            )
    if update:
        update["updated_at"] = datetime.now(timezone.utc)
        filters_collection.update_one({"_id": oid}, {"$set": update})
    updated = filters_collection.find_one({"_id": oid})
    return _to_filter_out(updated)


@router.delete("/{filter_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_filter(
    org_id: str, filter_id: str, current_user: dict = Depends(get_current_user)
):
    require_org_admin(org_id, str(current_user["_id"]))
    oid = parse_object_id(filter_id, "filter_id")
    result = filters_collection.delete_one({"_id": oid, "org_id": org_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Filter not found")
    return None
