from __future__ import annotations

from datetime import datetime, timezone
import hashlib
from typing import Any

from fastapi import APIRouter, Depends
from pymongo import UpdateOne
from pymongo.errors import BulkWriteError

from app.db import emails_collection, thread_cases_collection
from app.dependencies import get_current_user, require_org_membership
from app.schemas import EmailIngestRequest, EmailIngestResult, ThreadCaseOut

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

