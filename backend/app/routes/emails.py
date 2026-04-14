from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import os
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pymongo import UpdateOne
from pymongo.errors import BulkWriteError

from app.categorize import pick_category_id
from app.db import (
    categories_collection,
    emails_collection,
    member_category_access_collection,
    thread_cases_collection,
)
from app.dependencies import get_current_user, require_org_membership
from app.schemas import (
    CategorizeEmailsRequest,
    CategorizeEmailsResult,
    EmailIngestRequest,
    EmailIngestResult,
    EmailOut,
    ThreadCaseOut,
)

router = APIRouter(prefix="/organizations/{org_id}/emails", tags=["emails"])


def _dedupe_key(org_id: str, email: dict[str, Any]) -> str:
    """
    Prefer Message-ID (what Gmail uses for threading/dedup in practice).
    If missing, fall back to a stable hash of key fields so we don't insert duplicates.
    """
    mid = (email.get("message_id") or "").strip()
    if mid:
        return f"mid:{mid}"

    basis = "\n".join(
        [
            (email.get("from") or "").strip(),
            (email.get("to") or "").strip(),
            (email.get("date") or "").strip(),
            (email.get("subject") or "").strip(),
            (email.get("body") or "").strip(),
        ]
    ).encode("utf-8", errors="replace")
    digest = hashlib.sha256(basis).hexdigest()
    return f"sha256:{digest}"


def _thread_id(email: dict[str, Any]) -> str:
    # Gmail-style: root is the first References entry when present.
    refs = email.get("references") or []
    if refs:
        return refs[0]
    # Otherwise, fall back to parent id so replies are chained even if root isn't present.
    irt = email.get("in_reply_to") or []
    if irt:
        return irt[0]
    # Last resort: message id (or empty)
    return (email.get("message_id") or "").strip()


def _reopen_thread_case(org_id: str, thread_id: str, *, now: datetime) -> None:
    # Mark thread case open (idempotent) and reflect on all emails in thread.
    thread_cases_collection.update_one(
        {"org_id": org_id, "thread_id": thread_id},
        {
            "$set": {"status": "open", "updated_at": now},
            "$unset": {"closed_at": ""},
        },
        upsert=True,
    )
    emails_collection.update_many(
        {"org_id": org_id, "thread_id": thread_id},
        {"$set": {"case_status": "open", "case_updated_at": now}, "$unset": {"case_closed_at": ""}},
    )


def _close_thread_case(org_id: str, thread_id: str, *, now: datetime) -> ThreadCaseOut:
    thread_cases_collection.update_one(
        {"org_id": org_id, "thread_id": thread_id},
        {"$set": {"status": "closed", "updated_at": now, "closed_at": now}},
        upsert=True,
    )
    emails_collection.update_many(
        {"org_id": org_id, "thread_id": thread_id},
        {"$set": {"case_status": "closed", "case_updated_at": now, "case_closed_at": now}},
    )
    doc = thread_cases_collection.find_one({"org_id": org_id, "thread_id": thread_id}) or {}
    return ThreadCaseOut(
        org_id=org_id,
        thread_id=thread_id,
        status=doc.get("status", "closed"),
        updated_at=doc.get("updated_at", now),
        closed_at=doc.get("closed_at"),
    )


@router.get("/threads/{thread_id}/case", response_model=ThreadCaseOut)
def get_thread_case(
    org_id: str,
    thread_id: str,
    current_user: dict = Depends(get_current_user),
) -> ThreadCaseOut:
    require_org_membership(org_id, str(current_user["_id"]))
    doc = thread_cases_collection.find_one({"org_id": org_id, "thread_id": thread_id})
    if not doc:
        now = datetime.now(timezone.utc)
        return ThreadCaseOut(org_id=org_id, thread_id=thread_id, status="open", updated_at=now, closed_at=None)
    return ThreadCaseOut(
        org_id=org_id,
        thread_id=thread_id,
        status=doc.get("status", "open"),
        updated_at=doc.get("updated_at", datetime.now(timezone.utc)),
        closed_at=doc.get("closed_at"),
    )


@router.post("/threads/{thread_id}/close", response_model=ThreadCaseOut)
def close_thread_case(
    org_id: str,
    thread_id: str,
    current_user: dict = Depends(get_current_user),
) -> ThreadCaseOut:
    require_org_membership(org_id, str(current_user["_id"]))
    now = datetime.now(timezone.utc)
    return _close_thread_case(org_id, thread_id, now=now)


@router.post("/threads/{thread_id}/open", response_model=ThreadCaseOut)
def open_thread_case(
    org_id: str,
    thread_id: str,
    current_user: dict = Depends(get_current_user),
) -> ThreadCaseOut:
    require_org_membership(org_id, str(current_user["_id"]))
    now = datetime.now(timezone.utc)
    _reopen_thread_case(org_id, thread_id, now=now)
    doc = thread_cases_collection.find_one({"org_id": org_id, "thread_id": thread_id}) or {}
    return ThreadCaseOut(
        org_id=org_id,
        thread_id=thread_id,
        status=doc.get("status", "open"),
        updated_at=doc.get("updated_at", now),
        closed_at=doc.get("closed_at"),
    )


def _to_email_out(doc: dict) -> EmailOut:
    return EmailOut(
        id=str(doc["_id"]),
        org_id=doc["org_id"],
        sender=doc.get("from", ""),
        to=doc.get("to", ""),
        date=doc.get("date", ""),
        subject=doc.get("subject", ""),
        body=doc.get("body", ""),
        message_id=doc.get("message_id", ""),
        thread_id=doc.get("thread_id", ""),
        category_id=doc.get("category_id"),
        case_status=doc.get("case_status", "open"),
        created_at=doc["created_at"],
    )


@router.get("", response_model=list[EmailOut])
def list_emails(
    org_id: str,
    category_id: Optional[str] = Query(default=None),
    current_user: dict = Depends(get_current_user),
) -> list[EmailOut]:
    membership = require_org_membership(org_id, str(current_user["_id"]))

    query: dict[str, Any] = {"org_id": org_id}
    if category_id:
        if membership["role"] == "member":
            access = member_category_access_collection.find_one(
                {"org_id": org_id, "user_id": str(current_user["_id"]), "category_id": category_id}
            )
            if not access:
                raise HTTPException(status_code=403, detail="No access to this category")
        query["category_id"] = category_id

    docs = list(emails_collection.find(query).sort("created_at", -1).limit(200))
    return [_to_email_out(d) for d in docs]


@router.post("/ingest", response_model=EmailIngestResult)
def ingest_emails(
    org_id: str,
    payload: EmailIngestRequest,
    current_user: dict = Depends(get_current_user),
) -> EmailIngestResult:
    require_org_membership(org_id, str(current_user["_id"]))

    now = datetime.now(timezone.utc)
    ops: list[UpdateOne] = []
    touched_threads: set[str] = set()
    for e in payload.emails:
        item = e.model_dump(by_alias=True)
        key = _dedupe_key(org_id, item)
        tid = _thread_id(item)
        touched_threads.add(tid)

        ops.append(
            UpdateOne(
                {"org_id": org_id, "dedupe_key": key},
                {
                    "$setOnInsert": {
                        "org_id": org_id,
                        "dedupe_key": key,
                        "message_id": (item.get("message_id") or "").strip(),
                        "thread_id": tid,
                        "case_status": "open",
                        "case_updated_at": now,
                        "category_id": None,
                        "from": (item.get("from") or "").strip(),
                        "to": (item.get("to") or "").strip(),
                        "date": (item.get("date") or "").strip(),
                        "subject": (item.get("subject") or "").strip(),
                        "body": item.get("body") or "",
                        "in_reply_to": item.get("in_reply_to") or [],
                        "references": item.get("references") or [],
                        "mailbox": item.get("mailbox"),
                        "created_at": now,
                    }
                },
                upsert=True,
            )
        )

    if not ops:
        return EmailIngestResult(inserted=0, skipped=0)

    try:
        result = emails_collection.bulk_write(ops, ordered=False)
        inserted = int(getattr(result, "upserted_count", 0) or 0)
    except BulkWriteError as exc:
        # With ordered=False, duplicates can still occur in a single payload (same email twice)
        # Count successful upserts from the partial result.
        details = exc.details or {}
        inserted = int(details.get("nUpserted", 0) or 0)

    skipped = max(0, len(ops) - inserted)
    # Any ingest activity re-opens the thread (new reply should reopen)
    for tid in touched_threads:
        if tid:
            _reopen_thread_case(org_id, tid, now=now)
    return EmailIngestResult(inserted=inserted, skipped=skipped)


@router.post("/categorize", response_model=CategorizeEmailsResult)
def categorize_emails(
    org_id: str,
    payload: CategorizeEmailsRequest,
    current_user: dict = Depends(get_current_user),
) -> CategorizeEmailsResult:
    require_org_membership(org_id, str(current_user["_id"]))

    # Load categories for org (including system uncategorised)
    cats = list(categories_collection.find({"org_id": org_id}))
    unc = next((c for c in cats if c.get("is_system") and c.get("name") == "Uncategorised"), None)
    if not unc:
        now = datetime.now(timezone.utc)
        result = categories_collection.insert_one(
            {
                "org_id": org_id,
                "name": "Uncategorised",
                "description": "Fallback category for emails that do not match any category.",
                "color": None,
                "mail_account_ids": None,
                "is_system": True,
                "created_at": now,
                "updated_at": now,
            }
        )
        unc = categories_collection.find_one({"_id": result.inserted_id})
        cats.append(unc)

    unc_id = str(unc["_id"])
    categories = [
        {
            "id": str(c["_id"]),
            "name": c.get("name", ""),
            "description": c.get("description"),
            "is_system": bool(c.get("is_system", False)),
        }
        for c in cats
    ]

    query: dict[str, Any] = {"org_id": org_id, "case_status": "open"}
    if not payload.force:
        query["$or"] = [{"category_id": None}, {"category_id": {"$exists": False}}, {"category_id": unc_id}]

    emails = list(emails_collection.find(query).sort("created_at", -1).limit(payload.limit))
    processed = 0
    categorized = 0
    uncategorised = 0
    skipped = 0

    for e in emails:
        processed += 1
        if not payload.force and e.get("category_id") not in (None, unc_id) and e.get("category_id") is not None:
            skipped += 1
            continue

        cid = pick_category_id(
            model=os.environ.get("OPENAI_MODEL", "o4-mini"),
            categories=categories,
            uncategorised_category_id=unc_id,
            email=e,
        )
        now = datetime.now(timezone.utc)
        emails_collection.update_one(
            {"_id": e["_id"]},
            {"$set": {"category_id": cid, "categorized_at": now, "categorization_model": os.environ.get("OPENAI_MODEL", "o4-mini")}},
        )
        if cid == unc_id:
            uncategorised += 1
        else:
            categorized += 1

    return CategorizeEmailsResult(
        processed=processed,
        categorized=categorized,
        uncategorised=uncategorised,
        skipped=skipped,
    )

