"""Thread-level rules for categorization: only root messages use AI; replies inherit."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pymongo.collection import Collection


def is_reply_message(email: dict[str, Any]) -> bool:
    """True if this looks like a follow-up in a thread (not the initial message)."""
    irt = email.get("in_reply_to") or []
    refs = email.get("references") or []
    return bool(irt) or bool(refs)


def inherited_category_id(
    emails: Collection,
    org_id: str,
    thread_id: str,
    unc_id: str,
    *,
    exclude_email_id: Any,
) -> str:
    """
    Category from the earliest other message in the same thread that already has a category.
    Falls back to unc_id if none (e.g. first reply before root is categorized).
    """
    if not (thread_id or "").strip():
        return unc_id
    sibling = emails.find_one(
        {
            "org_id": org_id,
            "thread_id": thread_id,
            "_id": {"$ne": exclude_email_id},
            "category_id": {"$exists": True, "$ne": None},
        },
        sort=[("created_at", 1)],
    )
    if sibling and sibling.get("category_id") is not None:
        return str(sibling["category_id"])
    return unc_id


def set_thread_category(
    emails: Collection,
    org_id: str,
    thread_id: str,
    email_id: Any,
    category_id: str,
    now: datetime,
    model: str,
) -> None:
    """Assign category to the whole thread when thread_id is known, else only this document."""
    payload = {
        "$set": {
            "category_id": category_id,
            "categorized_at": now,
            "categorization_model": model,
        }
    }
    tid = (thread_id or "").strip()
    if tid:
        emails.update_many({"org_id": org_id, "thread_id": tid}, payload)
    else:
        emails.update_one({"_id": email_id}, payload)
