from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.db import (
    inboxes_collection,
    mail_accounts_collection,
    member_inbox_access_collection,
    memberships_collection,
)
from app.dependencies import get_current_user, require_org_admin, require_org_membership
from app.schemas import (
    InboxCreateRequest,
    InboxOut,
    InboxUpdateRequest,
    MemberInboxAccessUpdateRequest,
)
from app.utils import parse_object_id

router = APIRouter(prefix="/organizations/{org_id}/inboxes", tags=["inboxes"])


def _to_inbox_out(doc: dict) -> InboxOut:
    return InboxOut(
        id=str(doc["_id"]),
        org_id=doc["org_id"],
        name=doc["name"],
        description=doc.get("description"),
        color=doc.get("color"),
        mail_account_ids=doc.get("mail_account_ids"),
        is_system=bool(doc.get("is_system", False)),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


@router.post("", response_model=InboxOut, status_code=status.HTTP_201_CREATED)
def create_inbox(
    org_id: str,
    payload: InboxCreateRequest,
    current_user: dict = Depends(get_current_user),
):
    require_org_admin(org_id, str(current_user["_id"]))
    # None => applies to all mail accounts. Otherwise validate specified ids.
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
        "color": payload.color,
        "mail_account_ids": mail_account_ids,
        "is_system": False,
        "created_at": now,
        "updated_at": now,
    }
    result = inboxes_collection.insert_one(doc)
    created = inboxes_collection.find_one({"_id": result.inserted_id})
    return _to_inbox_out(created)


@router.get("", response_model=list[InboxOut])
def list_inboxes(org_id: str, current_user: dict = Depends(get_current_user)):
    require_org_membership(org_id, str(current_user["_id"]))
    docs = list(inboxes_collection.find({"org_id": org_id}))
    return [_to_inbox_out(d) for d in docs]


@router.put("/{inbox_id}", response_model=InboxOut)
def update_inbox(
    org_id: str,
    inbox_id: str,
    payload: InboxUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    require_org_admin(org_id, str(current_user["_id"]))
    oid = parse_object_id(inbox_id, "inbox_id")
    existing = inboxes_collection.find_one({"_id": oid, "org_id": org_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Inbox not found")
    if existing.get("is_system"):
        raise HTTPException(status_code=403, detail="System inbox cannot be modified")

    update = payload.model_dump(exclude_unset=True)
    if "mail_account_ids" in update and update["mail_account_ids"] is not None:
        mail_account_ids = list(dict.fromkeys(update["mail_account_ids"]))
        # [] => applies to all mail accounts
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
        inboxes_collection.update_one({"_id": oid}, {"$set": update})
    updated = inboxes_collection.find_one({"_id": oid})
    return _to_inbox_out(updated)


@router.delete("/{inbox_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_inbox(org_id: str, inbox_id: str, current_user: dict = Depends(get_current_user)):
    require_org_admin(org_id, str(current_user["_id"]))
    oid = parse_object_id(inbox_id, "inbox_id")
    existing = inboxes_collection.find_one({"_id": oid, "org_id": org_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Inbox not found")
    if existing.get("is_system"):
        raise HTTPException(status_code=403, detail="System inbox cannot be deleted")
    result = inboxes_collection.delete_one({"_id": oid, "org_id": org_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Inbox not found")
    member_inbox_access_collection.delete_many({"org_id": org_id, "inbox_id": inbox_id})
    return None


@router.put("/members/{member_user_id}/access", response_model=dict)
def set_member_inbox_access(
    org_id: str,
    member_user_id: str,
    payload: MemberInboxAccessUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    require_org_admin(org_id, str(current_user["_id"]))
    member = memberships_collection.find_one({"org_id": org_id, "user_id": member_user_id})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found in organization")

    valid_inbox_oids = [parse_object_id(i, "inbox_id") for i in payload.inbox_ids]
    valid_inboxes = list(
        inboxes_collection.find({"_id": {"$in": valid_inbox_oids}, "org_id": org_id})
    )
    valid_ids = {str(i["_id"]) for i in valid_inboxes}
    requested_ids = set(payload.inbox_ids)
    if valid_ids != requested_ids:
        raise HTTPException(
            status_code=400,
            detail="One or more inbox IDs are invalid for this organization",
        )

    member_inbox_access_collection.delete_many({"org_id": org_id, "user_id": member_user_id})
    now = datetime.now(timezone.utc)
    if valid_ids:
        member_inbox_access_collection.insert_many(
            [
                {
                    "org_id": org_id,
                    "user_id": member_user_id,
                    "inbox_id": inbox_id,
                    "created_at": now,
                }
                for inbox_id in valid_ids
            ]
        )
    return {"user_id": member_user_id, "inbox_ids": sorted(valid_ids)}


@router.get("/members/{member_user_id}/access", response_model=dict)
def get_member_inbox_access(
    org_id: str, member_user_id: str, current_user: dict = Depends(get_current_user)
):
    require_org_membership(org_id, str(current_user["_id"]))
    docs = member_inbox_access_collection.find(
        {"org_id": org_id, "user_id": member_user_id}, {"inbox_id": 1}
    )
    inbox_ids = sorted([d["inbox_id"] for d in docs])
    return {"user_id": member_user_id, "inbox_ids": inbox_ids}
