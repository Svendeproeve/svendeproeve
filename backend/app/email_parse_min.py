"""Minimal email extraction for polling/ingest."""
from __future__ import annotations

import re
from email import policy
from email.parser import BytesParser
from email.utils import parsedate_to_datetime
from typing import Any

_MSG_ID_RE = re.compile(r"<([^>]+)>")


def _decode_payload(part) -> str:
    raw = part.get_payload(decode=True)
    if raw is None:
        return ""
    charset = part.get_content_charset() or "utf-8"
    try:
        return raw.decode(charset, errors="replace")
    except LookupError:
        return raw.decode("utf-8", errors="replace")


def _get_body(msg) -> str:
    body = msg.get_body(preferencelist=("plain", "html"))
    if body is not None:
        return _decode_payload(body)
    for part in msg.walk():
        if part.get_content_maintype() == "text":
            return _decode_payload(part)
    return ""


def _header_str(value) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _date_str(msg) -> str:
    d = msg.get("date")
    if not d:
        return ""
    try:
        dt = parsedate_to_datetime(d)
        return dt.isoformat()
    except Exception:
        return _header_str(d)


def _message_id_list(header_value: str | None) -> list[str]:
    if not header_value:
        return []
    s = str(header_value).strip()
    ids = _MSG_ID_RE.findall(s)
    if ids:
        return ids
    parts = [p.strip().strip("<>").strip() for p in re.split(r"\s+", s) if p.strip()]
    return [p for p in parts if "@" in p]


def _single_message_id(header_value: str | None) -> str:
    ids = _message_id_list(header_value)
    if ids:
        return ids[0]
    if not header_value:
        return ""
    return str(header_value).strip().strip("<>").strip()


def extract_email(raw_bytes: bytes) -> dict[str, Any]:
    msg = BytesParser(policy=policy.default).parsebytes(raw_bytes)
    return {
        "from": _header_str(msg.get("from")),
        "to": _header_str(msg.get("to")),
        "date": _date_str(msg),
        "subject": _header_str(msg.get("subject")),
        "body": _get_body(msg),
        "message_id": _single_message_id(msg.get("message-id")),
        "in_reply_to": _message_id_list(msg.get("in-reply-to")),
        "references": _message_id_list(msg.get("references")),
    }

