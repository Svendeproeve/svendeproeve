from __future__ import annotations

import hashlib
import os
import socket
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from typing import Any

import imaplib
from pymongo import MongoClient, UpdateOne
from pymongo.collection import Collection
from pymongo.errors import BulkWriteError

from app.email_parse_min import extract_email


def _dedupe_key(email: dict[str, Any]) -> str:
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
    return "sha256:" + hashlib.sha256(basis).hexdigest()


def _thread_id(email: dict[str, Any]) -> str:
    refs = email.get("references") or []
    if refs:
        return refs[0]
    irt = email.get("in_reply_to") or []
    if irt:
        return irt[0]
    return (email.get("message_id") or "").strip()


def _imap_connect(account: dict[str, Any]) -> imaplib.IMAP4:
    host = account["imap_host"]
    port = int(account.get("imap_port", 993))
    use_ssl = bool(account.get("use_ssl", True))
    timeout = int(account.get("imap_timeout_seconds", 15))
    socket.setdefaulttimeout(timeout)
    if use_ssl:
        return imaplib.IMAP4_SSL(host, port, timeout=timeout)
    return imaplib.IMAP4(host, port, timeout=timeout)


def _reopen_thread(
    *,
    thread_cases: Collection,
    emails: Collection,
    org_id: str,
    thread_id: str,
    now: datetime,
) -> None:
    if not thread_id:
        return
    thread_cases.update_one(
        {"org_id": org_id, "thread_id": thread_id},
        {"$set": {"status": "open", "updated_at": now}, "$unset": {"closed_at": ""}},
        upsert=True,
    )
    emails.update_many(
        {"org_id": org_id, "thread_id": thread_id},
        {"$set": {"case_status": "open", "case_updated_at": now}, "$unset": {"case_closed_at": ""}},
    )


def upsert_emails(
    *,
    emails: Collection,
    thread_cases: Collection,
    org_id: str,
    mail_account_id: str,
    mailbox: str,
    extracted_batch: list[dict[str, Any]],
) -> tuple[int, int]:
    now = datetime.now(timezone.utc)
    ops: list[UpdateOne] = []
    thread_ids_for_op: list[str] = []
    for e in extracted_batch:
        key = _dedupe_key(e)
        tid = _thread_id(e)
        thread_ids_for_op.append(tid)
        ops.append(
            UpdateOne(
                {"org_id": org_id, "dedupe_key": key},
                {
                    "$setOnInsert": {
                        "org_id": org_id,
                        "dedupe_key": key,
                        "thread_id": tid,
                        "mail_account_id": mail_account_id,
                        "mailbox": mailbox,
                        "message_id": (e.get("message_id") or "").strip(),
                        "from": (e.get("from") or "").strip(),
                        "to": (e.get("to") or "").strip(),
                        "date": (e.get("date") or "").strip(),
                        "subject": (e.get("subject") or "").strip(),
                        "body": e.get("body") or "",
                        "in_reply_to": e.get("in_reply_to") or [],
                        "references": e.get("references") or [],
                        "case_status": "open",
                        "case_updated_at": now,
                        "created_at": now,
                    }
                },
                upsert=True,
            )
        )

    inserted_thread_ids: set[str] = set()
    try:
        result = emails.bulk_write(ops, ordered=False)
        inserted = int(getattr(result, "upserted_count", 0) or 0)
        upserted_ids = getattr(result, "upserted_ids", {}) or {}
        for op_index in upserted_ids.keys():
            try:
                tid = thread_ids_for_op[int(op_index)]
                if tid:
                    inserted_thread_ids.add(tid)
            except Exception:
                continue
    except BulkWriteError as exc:
        details = exc.details or {}
        inserted = int(details.get("nUpserted", 0) or 0)

    skipped = max(0, len(ops) - inserted)

    # New inserts should reopen cases.
    for tid in inserted_thread_ids:
        _reopen_thread(thread_cases=thread_cases, emails=emails, org_id=org_id, thread_id=tid, now=now)

    return inserted, skipped


def poll_mail_account_once(
    *,
    db,
    account: dict[str, Any],
    mailbox: str,
    only_unseen: bool,
    limit: int,
    mark_seen: bool,
) -> dict[str, Any]:
    org_id = account["org_id"]
    mail_account_id = str(account["_id"])

    emails: Collection = db["emails"]
    thread_cases: Collection = db["thread_cases"]

    imap = _imap_connect(account)
    try:
        imap.login(account["imap_username"], account["imap_password"])
        imap.select(mailbox)

        criteria = "(UNSEEN)" if only_unseen else "ALL"
        typ, data = imap.search(None, criteria)
        if typ != "OK":
            return {"ok": False, "org_id": org_id, "mail_account_id": mail_account_id, "error": f"search {typ} {data}"}

        ids = (data[0] or b"").split()
        if not ids:
            return {"ok": True, "org_id": org_id, "mail_account_id": mail_account_id, "mode": "unseen" if only_unseen else "all", "fetched": 0, "inserted": 0, "skipped": 0}

        ids = ids[-limit:]
        batch: list[dict[str, Any]] = []
        for msg_id in ids:
            typ, msg_data = imap.fetch(msg_id, "(RFC822)")
            if typ != "OK":
                continue
            raw_bytes = msg_data[0][1]
            batch.append(extract_email(raw_bytes))

        inserted, skipped = (0, 0)
        if batch:
            inserted, skipped = upsert_emails(
                emails=emails,
                thread_cases=thread_cases,
                org_id=org_id,
                mail_account_id=mail_account_id,
                mailbox=mailbox,
                extracted_batch=batch,
            )

        if mark_seen and ids:
            for msg_id in ids:
                try:
                    imap.store(msg_id, "+FLAGS", "\\Seen")
                except Exception:
                    pass

        return {
            "ok": True,
            "org_id": org_id,
            "mail_account_id": mail_account_id,
            "mode": "unseen" if only_unseen else "all",
            "fetched": len(batch),
            "inserted": inserted,
            "skipped": skipped,
        }
    except Exception as exc:
        return {"ok": False, "org_id": org_id, "mail_account_id": mail_account_id, "error": str(exc)}
    finally:
        try:
            imap.logout()
        except Exception:
            pass
        try:
            imap.shutdown()
        except Exception:
            pass


def run() -> int:
    mongodb_uri = os.environ["MONGODB_URI"]
    mongodb_db = os.environ.get("MONGODB_DB", "sortr")
    poll_interval = int(os.environ.get("IMAP_POLL_INTERVAL_SECONDS", "15"))
    mailbox = os.environ.get("IMAP_MAILBOX", "INBOX")
    limit = int(os.environ.get("IMAP_LIMIT", "50"))
    only_unseen = os.environ.get("IMAP_ONLY_UNSEEN", "1") == "1"
    mark_seen = os.environ.get("IMAP_MARK_SEEN", "1") == "1"
    max_workers = int(os.environ.get("IMAP_MAX_WORKERS", "8"))

    client = MongoClient(mongodb_uri)
    db = client[mongodb_db]

    mail_accounts: Collection = db["mail_accounts"]
    # Ensure required indexes exist.
    db["emails"].create_index([("org_id", 1), ("dedupe_key", 1)], unique=True)
    db["emails"].create_index([("org_id", 1), ("thread_id", 1)])
    db["thread_cases"].create_index([("org_id", 1), ("thread_id", 1)], unique=True)

    while True:
        started_at = time.time()
        accounts = list(
            mail_accounts.find(
                {"imap_host": {"$exists": True, "$ne": ""}, "imap_username": {"$exists": True, "$ne": ""}},
                {
                    "imap_password": 1,
                    "imap_host": 1,
                    "imap_port": 1,
                    "imap_username": 1,
                    "use_ssl": 1,
                    "org_id": 1,
                    "backfill_done_at": 1,
                },
            )
        )

        if not accounts:
            print("poller: no mail accounts found in MongoDB (mail_accounts)", flush=True)
        else:
            print(
                f"poller: cycle accounts={len(accounts)} interval={poll_interval}s mailbox={mailbox} only_unseen={int(only_unseen)} limit={limit}",
                flush=True,
            )
            workers = min(max_workers, len(accounts))
            with ThreadPoolExecutor(max_workers=workers) as ex:
                futs = []
                for a in accounts:
                    do_backfill = not isinstance(a.get("backfill_done_at"), datetime)
                    futs.append(
                        ex.submit(
                            poll_mail_account_once,
                            db=db,
                            account=a,
                            mailbox=mailbox,
                            only_unseen=(False if do_backfill else only_unseen),
                            limit=limit,
                            mark_seen=(False if do_backfill else mark_seen),
                        )
                    )
                for fut in as_completed(futs):
                    r = fut.result()
                    if r.get("ok"):
                        print(
                            f"poller: org={r['org_id']} mail_account={r['mail_account_id']} mode={r.get('mode')} "
                            f"fetched={r.get('fetched', 0)} inserted={r.get('inserted', 0)} skipped={r.get('skipped', 0)}",
                            flush=True,
                        )
                        if r.get("mode") == "all":
                            try:
                                from bson import ObjectId

                                mail_accounts.update_one(
                                    {"_id": ObjectId(r["mail_account_id"])},
                                    {"$set": {"backfill_done_at": datetime.now(timezone.utc)}},
                                )
                            except Exception:
                                pass
                    else:
                        print(
                            f"poller: org={r.get('org_id')} mail_account={r.get('mail_account_id')} error={r.get('error')}",
                            flush=True,
                        )

        elapsed = time.time() - started_at
        time.sleep(max(1, poll_interval - int(elapsed)))


if __name__ == "__main__":
    raise SystemExit(run())

