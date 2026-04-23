from __future__ import annotations

from datetime import datetime, timezone
from email.mime.text import MIMEText
from email.utils import formataddr, formatdate, make_msgid
import hashlib
import imaplib
import os
import smtplib
from typing import Any, Optional
import uuid

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from pymongo import UpdateOne
from pymongo.errors import BulkWriteError

from app.categorize import pick_category_and_severity
from app.email_threading import inherited_thread_categorization, is_reply_message, set_thread_categorization
from app.db import (
    categories_collection,
    emails_collection,
    mail_accounts_collection,
    member_category_access_collection,
    memberships_collection,
    thread_cases_collection,
    users_collection,
)
from app.dependencies import get_current_user, require_org_membership
from app.utils import parse_object_id
from app.schemas import (
    CategorizeEmailsRequest,
    CategorizeEmailsResult,
    EmailIngestRequest,
    EmailIngestResult,
    EmailOut,
    EmailSeverityUpdateRequest,
    MembershipOut,
    ThreadAssignRequest,
    ThreadCaseOut,
    ThreadCategoryUpdateRequest,
    ThreadReplyRequest,
    ThreadStatusUpdateRequest,
)

router = APIRouter(prefix="/organizations/{org_id}/emails", tags=["emails"])


def _uncategorised_category_doc(org_id: str) -> Optional[dict[str, Any]]:
    return categories_collection.find_one({"org_id": org_id, "is_system": True, "name": "Uncategorised"})


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


def _resolve_user_name(user_id: Optional[str]) -> Optional[str]:
    if not user_id:
        return None
    if not ObjectId.is_valid(user_id):
        return None
    u = users_collection.find_one({"_id": ObjectId(user_id)})
    if not u:
        return None
    return (u.get("full_name") or u.get("email") or "").strip() or None


def _build_thread_case_out(org_id: str, thread_id: str, doc: dict[str, Any]) -> ThreadCaseOut:
    assigned = doc.get("assigned_to")
    return ThreadCaseOut(
        org_id=org_id,
        thread_id=thread_id,
        status=doc.get("status", "open"),
        updated_at=doc.get("updated_at", datetime.now(timezone.utc)),
        closed_at=doc.get("closed_at"),
        assigned_to=assigned,
        assigned_to_name=_resolve_user_name(assigned),
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
    return _build_thread_case_out(org_id, thread_id, doc)


@router.get("/threads/{thread_id}/case", response_model=ThreadCaseOut)
def get_thread_case(
    org_id: str,
    thread_id: str,
    current_user: dict = Depends(get_current_user),
) -> ThreadCaseOut:
    require_org_membership(org_id, str(current_user["_id"]))
    canonical_tid, _ = _resolve_canonical_thread(org_id, thread_id)
    tid = canonical_tid or thread_id
    doc = thread_cases_collection.find_one({"org_id": org_id, "thread_id": tid})
    if not doc:
        now = datetime.now(timezone.utc)
        return ThreadCaseOut(org_id=org_id, thread_id=tid, status="open", updated_at=now, closed_at=None)
    return _build_thread_case_out(org_id, tid, doc)


@router.post("/threads/{thread_id}/close", response_model=ThreadCaseOut)
def close_thread_case(
    org_id: str,
    thread_id: str,
    current_user: dict = Depends(get_current_user),
) -> ThreadCaseOut:
    require_org_membership(org_id, str(current_user["_id"]))
    canonical_tid, _ = _resolve_canonical_thread(org_id, thread_id)
    tid = canonical_tid or thread_id
    now = datetime.now(timezone.utc)
    return _close_thread_case(org_id, tid, now=now)


@router.post("/threads/{thread_id}/open", response_model=ThreadCaseOut)
def open_thread_case(
    org_id: str,
    thread_id: str,
    current_user: dict = Depends(get_current_user),
) -> ThreadCaseOut:
    require_org_membership(org_id, str(current_user["_id"]))
    canonical_tid, _ = _resolve_canonical_thread(org_id, thread_id)
    tid = canonical_tid or thread_id
    now = datetime.now(timezone.utc)
    _reopen_thread_case(org_id, tid, now=now)
    doc = thread_cases_collection.find_one({"org_id": org_id, "thread_id": tid}) or {}
    return _build_thread_case_out(org_id, tid, doc)


@router.patch("/threads/{thread_id}/status", response_model=ThreadCaseOut)
def update_thread_status(
    org_id: str,
    thread_id: str,
    payload: ThreadStatusUpdateRequest,
    current_user: dict = Depends(get_current_user),
) -> ThreadCaseOut:
    require_org_membership(org_id, str(current_user["_id"]))
    canonical_tid, thread_filter = _resolve_canonical_thread(org_id, thread_id)
    if not thread_filter:
        raise HTTPException(status_code=404, detail="No emails found for this thread")
    now = datetime.now(timezone.utc)
    updates: dict[str, Any] = {"status": payload.status, "updated_at": now}
    email_updates: dict[str, Any] = {"$set": {"case_status": payload.status, "case_updated_at": now}}
    if payload.status == "closed":
        updates["closed_at"] = now
        email_updates["$set"]["case_closed_at"] = now
    else:
        email_updates["$unset"] = {"case_closed_at": ""}
    thread_cases_collection.update_one(
        {"org_id": org_id, "thread_id": canonical_tid},
        {"$set": updates} if payload.status == "closed" else {"$set": updates, "$unset": {"closed_at": ""}},
        upsert=True,
    )
    emails_collection.update_many(thread_filter, email_updates)
    doc = thread_cases_collection.find_one({"org_id": org_id, "thread_id": canonical_tid}) or {}
    return _build_thread_case_out(org_id, canonical_tid, doc)


@router.patch("/threads/{thread_id}/assign", response_model=ThreadCaseOut)
def assign_thread(
    org_id: str,
    thread_id: str,
    payload: ThreadAssignRequest,
    current_user: dict = Depends(get_current_user),
) -> ThreadCaseOut:
    require_org_membership(org_id, str(current_user["_id"]))
    canonical_tid, _ = _resolve_canonical_thread(org_id, thread_id)
    tid = canonical_tid or thread_id
    now = datetime.now(timezone.utc)
    if payload.assigned_to is not None:
        mem = memberships_collection.find_one({"org_id": org_id, "user_id": payload.assigned_to})
        if not mem:
            raise HTTPException(status_code=400, detail="User is not a member of this organization")
    thread_cases_collection.update_one(
        {"org_id": org_id, "thread_id": tid},
        {"$set": {"assigned_to": payload.assigned_to, "updated_at": now}},
        upsert=True,
    )
    doc = thread_cases_collection.find_one({"org_id": org_id, "thread_id": tid}) or {}
    return _build_thread_case_out(org_id, tid, doc)


def _resolve_canonical_thread(org_id: str, thread_id: str) -> tuple[str, dict[str, Any]]:
    """Resolve the canonical thread_id and email filter for a thread.

    Returns (canonical_thread_id, email_filter).
    canonical_thread_id is the actual thread_id stored on email documents.
    email_filter is a Mongo query dict to match all emails in the thread.
    Returns ("", {}) if no emails found.
    """
    tk = thread_id.strip()
    or_clauses: list[dict[str, Any]] = [{"thread_id": tk}]
    if ObjectId.is_valid(tk):
        or_clauses.append({"_id": ObjectId(tk)})
    anchor = emails_collection.find_one({"org_id": org_id, "$or": or_clauses})
    if not anchor:
        return "", {}
    canonical = (anchor.get("thread_id") or "").strip()
    if canonical:
        return canonical, {"org_id": org_id, "thread_id": canonical}
    return str(anchor["_id"]), {"org_id": org_id, "_id": anchor["_id"]}


@router.patch("/threads/{thread_id}/category")
def update_thread_category(
    org_id: str,
    thread_id: str,
    payload: ThreadCategoryUpdateRequest,
    current_user: dict = Depends(get_current_user),
) -> dict[str, str]:
    require_org_membership(org_id, str(current_user["_id"]))
    cat_oid = parse_object_id(payload.category_id, "category_id")
    cat = categories_collection.find_one({"_id": cat_oid, "org_id": org_id})
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    canonical_tid, thread_filter = _resolve_canonical_thread(org_id, thread_id)
    if not thread_filter:
        raise HTTPException(status_code=404, detail="No emails found for this thread")
    now = datetime.now(timezone.utc)
    result = emails_collection.update_many(
        thread_filter,
        {"$set": {"category_id": payload.category_id, "category_updated_at": now}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="No emails found for this thread")
    return {"thread_id": thread_id, "category_id": payload.category_id, "updated": str(result.modified_count)}


def _category_filter_clause(
    org_id: str,
    category_id: str,
    membership: dict[str, Any],
    user_id: str,
) -> dict[str, Any]:
    """Mongo filter fragment for emails in this category (or uncategorised). Raises 403 if member has no access."""
    if membership["role"] == "member":
        access = member_category_access_collection.find_one(
            {"org_id": org_id, "user_id": user_id, "category_id": category_id}
        )
        if not access:
            raise HTTPException(status_code=403, detail="No access to this category")
    unc = _uncategorised_category_doc(org_id)
    if unc is not None and str(unc["_id"]) == category_id:
        unc_id_str = str(unc["_id"])
        return {
            "$or": [
                {"category_id": None},
                {"category_id": {"$exists": False}},
                {"category_id": unc_id_str},
            ]
        }
    return {"category_id": category_id}


def _mail_account_id_str(doc: dict[str, Any]) -> Optional[str]:
    raw = doc.get("mail_account_id")
    if raw is None:
        return None
    return str(raw)


def _mail_account_name_map(org_id: str, docs: list[dict[str, Any]]) -> dict[str, str]:
    id_strs: set[str] = set()
    for d in docs:
        s = _mail_account_id_str(d)
        if s:
            id_strs.add(s)
    if not id_strs:
        return {}
    oids = [ObjectId(s) for s in id_strs if ObjectId.is_valid(s)]
    if not oids:
        return {}
    out: dict[str, str] = {}
    for acc in mail_accounts_collection.find({"org_id": org_id, "_id": {"$in": oids}}):
        label = (acc.get("name") or "").strip()
        out[str(acc["_id"])] = label if label else str(acc["_id"])
    return out


def _thread_assignment_map(org_id: str, docs: list[dict[str, Any]]) -> dict[str, tuple[Optional[str], Optional[str]]]:
    tids: set[str] = set()
    for d in docs:
        tid = (d.get("thread_id") or "").strip()
        if tid:
            tids.add(tid)
    if not tids:
        return {}
    cases = thread_cases_collection.find({"org_id": org_id, "thread_id": {"$in": list(tids)}, "assigned_to": {"$ne": None}})
    user_ids: set[str] = set()
    tid_to_uid: dict[str, str] = {}
    for c in cases:
        uid = c.get("assigned_to")
        if uid:
            tid_to_uid[c["thread_id"]] = uid
            user_ids.add(uid)
    if not user_ids:
        return {}
    oids = [ObjectId(u) for u in user_ids if ObjectId.is_valid(u)]
    user_map: dict[str, str] = {}
    if oids:
        for u in users_collection.find({"_id": {"$in": oids}}):
            user_map[str(u["_id"])] = (u.get("full_name") or u.get("email") or "").strip() or str(u["_id"])
    result: dict[str, tuple[Optional[str], Optional[str]]] = {}
    for tid, uid in tid_to_uid.items():
        result[tid] = (uid, user_map.get(uid))
    return result


def _to_email_out(
    doc: dict[str, Any],
    *,
    account_names: dict[str, str],
    assignments: dict[str, tuple[Optional[str], Optional[str]]],
) -> EmailOut:
    raw_sev = doc.get("severity")
    severity = raw_sev if raw_sev in ("critical", "non_critical") else None
    mid = _mail_account_id_str(doc)
    mname = account_names.get(mid) if mid else None
    tid = (doc.get("thread_id") or "").strip()
    assigned_to, assigned_to_name = assignments.get(tid, (None, None))
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
        severity=severity,
        case_status=doc.get("case_status", "open"),
        created_at=doc["created_at"],
        mail_account_id=mid,
        mailbox=doc.get("mailbox"),
        mail_account_name=mname,
        assigned_to=assigned_to,
        assigned_to_name=assigned_to_name,
        is_outbound=bool(doc.get("is_outbound", False)),
        is_internal_note=bool(doc.get("is_internal_note", False)),
    )


def _emails_to_out(org_id: str, docs: list[dict[str, Any]]) -> list[EmailOut]:
    names = _mail_account_name_map(org_id, docs)
    assignments = _thread_assignment_map(org_id, docs)
    return [_to_email_out(d, account_names=names, assignments=assignments) for d in docs]


@router.get("/assigned-to-me", response_model=list[EmailOut])
def list_my_assigned_threads(
    org_id: str,
    current_user: dict = Depends(get_current_user),
) -> list[EmailOut]:
    """Return one representative email per thread assigned to the current user."""
    require_org_membership(org_id, str(current_user["_id"]))
    uid = str(current_user["_id"])
    cases = list(thread_cases_collection.find({"org_id": org_id, "assigned_to": uid}))
    if not cases:
        return []
    thread_ids = [c["thread_id"] for c in cases if c.get("thread_id")]
    if not thread_ids:
        return []
    docs = list(
        emails_collection.find({"org_id": org_id, "thread_id": {"$in": thread_ids}})
        .sort("created_at", 1)
    )
    seen: set[str] = set()
    first_per_thread: list[dict[str, Any]] = []
    for d in docs:
        tid = (d.get("thread_id") or "").strip()
        if tid not in seen:
            seen.add(tid)
            first_per_thread.append(d)
    return _emails_to_out(org_id, first_per_thread)


@router.get("", response_model=list[EmailOut])
def list_emails(
    org_id: str,
    category_id: Optional[str] = Query(default=None),
    thread_id: Optional[str] = Query(
        default=None,
        description="If set, return only emails in this thread (requires category_id). Oldest first.",
    ),
    current_user: dict = Depends(get_current_user),
) -> list[EmailOut]:
    membership = require_org_membership(org_id, str(current_user["_id"]))
    uid = str(current_user["_id"])

    if thread_id is not None:
        if not category_id:
            raise HTTPException(status_code=400, detail="category_id is required when thread_id is set")
        tk = thread_id.strip()
        if not tk:
            raise HTTPException(status_code=400, detail="thread_id is empty")

        cat_clause = _category_filter_clause(org_id, category_id, membership, uid)

        or_clauses: list[dict[str, Any]] = [{"thread_id": tk}]
        if ObjectId.is_valid(tk):
            or_clauses.append({"_id": ObjectId(tk)})

        anchor = emails_collection.find_one({"org_id": org_id, "$or": or_clauses})
        if not anchor:
            return []

        canonical = (anchor.get("thread_id") or "").strip()
        if canonical:
            thread_part: dict[str, Any] = {"thread_id": canonical}
        else:
            thread_part = {"_id": anchor["_id"]}

        query: dict[str, Any] = {"$and": [{"org_id": org_id, **thread_part}, cat_clause]}
        docs = list(emails_collection.find(query).sort("created_at", 1).limit(500))
        return _emails_to_out(org_id, docs)

    query = {"org_id": org_id}
    if category_id:
        query.update(_category_filter_clause(org_id, category_id, membership, uid))

    docs = list(emails_collection.find(query).sort("created_at", -1).limit(200))
    return _emails_to_out(org_id, docs)


@router.get("/uncategorized-count")
def get_uncategorized_count(
    org_id: str,
    current_user: dict = Depends(get_current_user),
) -> dict[str, int]:
    """Count open-case emails with no category, missing category, or system Uncategorised."""
    membership = require_org_membership(org_id, str(current_user["_id"]))
    unc = _uncategorised_category_doc(org_id)
    if not unc:
        return {"count": 0}
    unc_id_str = str(unc["_id"])
    if membership["role"] == "member":
        access = member_category_access_collection.find_one(
            {"org_id": org_id, "user_id": str(current_user["_id"]), "category_id": unc_id_str}
        )
        if not access:
            raise HTTPException(status_code=403, detail="No access to this category")
    q: dict[str, Any] = {
        "org_id": org_id,
        "case_status": "open",
        "$or": [
            {"category_id": None},
            {"category_id": {"$exists": False}},
            {"category_id": unc_id_str},
        ],
    }
    return {"count": emails_collection.count_documents(q)}


@router.patch("/{email_id}/severity", response_model=EmailOut)
def patch_email_severity(
    org_id: str,
    email_id: str,
    payload: EmailSeverityUpdateRequest,
    current_user: dict = Depends(get_current_user),
) -> EmailOut:
    """Set severity for the whole thread (same thread_id) when applicable."""
    require_org_membership(org_id, str(current_user["_id"]))
    oid = parse_object_id(email_id, "email_id")
    doc = emails_collection.find_one({"_id": oid, "org_id": org_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Email not found")
    sev = payload.severity
    tid = (doc.get("thread_id") or "").strip()
    update = {"$set": {"severity": sev}}
    if tid:
        emails_collection.update_many({"org_id": org_id, "thread_id": tid}, update)
    else:
        emails_collection.update_one({"_id": oid, "org_id": org_id}, update)
    updated = emails_collection.find_one({"_id": oid, "org_id": org_id})
    if updated is None:
        raise HTTPException(status_code=500, detail="Failed to fetch updated email")
    return _emails_to_out(org_id, [updated])[0]


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

    # Oldest first so the first message in a thread is categorized before replies (seen_thread_keys skips the rest).
    emails = list(emails_collection.find(query).sort("created_at", 1).limit(payload.limit))
    processed = 0
    categorized = 0
    uncategorised = 0
    skipped = 0
    seen_thread_keys: set[str] = set()

    model = os.environ.get("OPENAI_MODEL", "o4-mini")
    for e in emails:
        processed += 1
        if not payload.force and e.get("category_id") not in (None, unc_id) and e.get("category_id") is not None:
            skipped += 1
            continue

        thread_id = (e.get("thread_id") or "").strip()
        thread_key = thread_id or str(e["_id"])
        if thread_key in seen_thread_keys:
            skipped += 1
            continue
        seen_thread_keys.add(thread_key)
        now = datetime.now(timezone.utc)
        if is_reply_message(e):
            cid, sev = inherited_thread_categorization(
                emails_collection,
                org_id,
                thread_id,
                unc_id,
                exclude_email_id=e["_id"],
            )
        else:
            cid, sev = pick_category_and_severity(
                model=model,
                categories=categories,
                uncategorised_category_id=unc_id,
                email=e,
            )
        set_thread_categorization(
            emails_collection,
            org_id,
            thread_id,
            e["_id"],
            category_id=cid,
            severity=sev,
            now=now,
            model=model,
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


# ---------------------------------------------------------------------------
# Reply helpers
# ---------------------------------------------------------------------------

def _send_reply_smtp(account: dict[str, Any], msg: MIMEText) -> None:
    host = account["smtp_host"]
    port = account.get("smtp_port", 465)
    use_ssl = account.get("smtp_use_ssl", True)

    if use_ssl:
        server = smtplib.SMTP_SSL(host, port, timeout=15)
    else:
        server = smtplib.SMTP(host, port, timeout=15)
    try:
        server.ehlo()
        if not use_ssl:
            try:
                server.starttls()
                server.ehlo()
            except Exception:
                pass
        server.login(account["smtp_username"], account["smtp_password"])
        server.send_message(msg)
        server.quit()
    finally:
        try:
            server.close()
        except Exception:
            pass


def _append_to_sent_imap(account: dict[str, Any], message_bytes: bytes) -> None:
    host = account["imap_host"]
    port = account.get("imap_port", 993)
    use_ssl = account.get("use_ssl", True)

    if use_ssl:
        imap = imaplib.IMAP4_SSL(host, port, timeout=15)
    else:
        imap = imaplib.IMAP4(host, port, timeout=15)
    try:
        imap.login(account["imap_username"], account["imap_password"])
        sent_folder = "Sent"
        for candidate in ("Sent", "[Gmail]/Sent Mail", "INBOX.Sent", "Sent Items"):
            status, _ = imap.select(candidate, readonly=True)
            if status == "OK":
                sent_folder = candidate
                break
            imap.select("INBOX", readonly=True)
        imap.append(sent_folder, "\\Seen", None, message_bytes)
        imap.logout()
    finally:
        try:
            imap.shutdown()
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Reply endpoint
# ---------------------------------------------------------------------------

@router.post("/threads/{thread_id}/reply", response_model=EmailOut)
def reply_to_thread(
    org_id: str,
    thread_id: str,
    payload: ThreadReplyRequest,
    current_user: dict = Depends(get_current_user),
) -> EmailOut:
    require_org_membership(org_id, str(current_user["_id"]))

    canonical_tid, thread_filter = _resolve_canonical_thread(org_id, thread_id)
    if not thread_filter:
        raise HTTPException(status_code=404, detail="No emails found for this thread")

    thread_emails = list(
        emails_collection.find(thread_filter).sort("created_at", 1)
    )
    if not thread_emails:
        raise HTTPException(status_code=404, detail="No emails found for this thread")

    latest = thread_emails[-1]

    account_id = latest.get("mail_account_id")
    if account_id is None:
        for e in reversed(thread_emails):
            if e.get("mail_account_id"):
                account_id = e["mail_account_id"]
                break
    if account_id is None:
        raise HTTPException(status_code=400, detail="Cannot determine mail account for this thread")

    if isinstance(account_id, str) and ObjectId.is_valid(account_id):
        account_oid = ObjectId(account_id)
    else:
        account_oid = account_id
    account = mail_accounts_collection.find_one({"_id": account_oid, "org_id": org_id})
    if not account:
        raise HTTPException(status_code=404, detail="Mail account not found")

    now = datetime.now(timezone.utc)
    new_message_id = make_msgid(domain=account.get("smtp_host", "localhost"))

    reply_to_mid = (latest.get("message_id") or "").strip()
    existing_refs = latest.get("references") or []
    references = list(existing_refs)
    if reply_to_mid and reply_to_mid not in references:
        references.append(reply_to_mid)

    from_addr = account.get("smtp_username", "")
    display_name = (current_user.get("full_name") or "").strip()
    from_header = formataddr((display_name, from_addr)) if display_name else from_addr
    latest_inbound = next(
        (e for e in reversed(thread_emails) if not e.get("is_outbound") and not e.get("is_internal_note")),
        None,
    )
    to_addr = (latest_inbound.get("from") or "").strip() if latest_inbound else ""
    if not to_addr:
        to_addr = (latest.get("to") or latest.get("from") or "").strip()

    subject = (latest.get("subject") or "").strip()
    if subject and not subject.lower().startswith("re:"):
        subject = f"Re: {subject}"

    def _bracket(mid: str) -> str:
        mid = mid.strip()
        if mid and not mid.startswith("<"):
            return f"<{mid}>"
        return mid

    if not payload.internal_note:
        msg = MIMEText(payload.body, "plain", "utf-8")
        msg["From"] = from_header
        msg["To"] = to_addr
        msg["Subject"] = subject
        msg["Date"] = formatdate(localtime=True)
        msg["Message-ID"] = new_message_id
        if reply_to_mid:
            msg["In-Reply-To"] = _bracket(reply_to_mid)
        if references:
            msg["References"] = " ".join(_bracket(r) for r in references)

        _send_reply_smtp(account, msg)

        try:
            _append_to_sent_imap(account, msg.as_bytes())
        except Exception:
            pass

    doc = {
        "org_id": org_id,
        "dedupe_key": f"mid:{new_message_id}",
        "message_id": new_message_id,
        "thread_id": canonical_tid,
        "from": (display_name or from_addr) if payload.internal_note else from_header,
        "to": to_addr,
        "date": now.isoformat(),
        "subject": subject,
        "body": payload.body,
        "in_reply_to": [reply_to_mid] if reply_to_mid else [],
        "references": references,
        "case_status": latest.get("case_status", "open"),
        "category_id": latest.get("category_id"),
        "severity": latest.get("severity"),
        "mail_account_id": str(account["_id"]),
        "mailbox": "Sent",
        "is_outbound": True,
        "is_internal_note": payload.internal_note,
        "created_at": now,
    }
    emails_collection.insert_one(doc)

    return _emails_to_out(org_id, [doc])[0]

