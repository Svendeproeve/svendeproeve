from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
import imaplib
import smtplib

from app.db import mail_accounts_collection
from app.dependencies import get_current_user, require_org_admin, require_org_membership
from app.schemas import (
    MailAccountCreateRequest,
    MailAccountOut,
    MailAccountTestRequest,
    MailAccountSmtpTestRequest,
    MailAccountUpdateRequest,
)
from app.utils import parse_object_id

router = APIRouter(prefix="/organizations/{org_id}/mail-accounts", tags=["mail-accounts"])


def _to_out(doc: dict) -> MailAccountOut:
    return MailAccountOut(
        id=str(doc["_id"]),
        org_id=doc["org_id"],
        name=doc["name"],
        imap_host=doc["imap_host"],
        imap_port=doc["imap_port"],
        imap_username=doc["imap_username"],
        use_ssl=doc["use_ssl"],
        smtp_host=doc.get("smtp_host", ""),
        smtp_port=doc.get("smtp_port", 465),
        smtp_username=doc.get("smtp_username", ""),
        smtp_use_ssl=doc.get("smtp_use_ssl", True),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


@router.post("/test", response_model=dict)
def test_mail_account(
    org_id: str,
    payload: MailAccountTestRequest,
    current_user: dict = Depends(get_current_user),
):
    # Anyone in org can test; creation is still admin-only.
    require_org_membership(org_id, str(current_user["_id"]))
    try:
        if payload.use_ssl:
            imap = imaplib.IMAP4_SSL(payload.imap_host, payload.imap_port, timeout=10)
        else:
            imap = imaplib.IMAP4(payload.imap_host, payload.imap_port, timeout=10)
        try:
            imap.login(payload.imap_username, payload.imap_password)
            # Selecting INBOX is a quick permission check; some servers may not allow it but login succeeded
            try:
                imap.select("INBOX", readonly=True)
            except Exception:
                pass
            imap.logout()
        finally:
            try:
                imap.shutdown()
            except Exception:
                pass
        return {"ok": True}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


@router.post("/test-smtp", response_model=dict)
def test_smtp(
    org_id: str,
    payload: MailAccountSmtpTestRequest,
    current_user: dict = Depends(get_current_user),
):
    require_org_membership(org_id, str(current_user["_id"]))
    try:
        if payload.smtp_use_ssl:
            server = smtplib.SMTP_SSL(payload.smtp_host, payload.smtp_port, timeout=10)
        else:
            server = smtplib.SMTP(payload.smtp_host, payload.smtp_port, timeout=10)
        try:
            server.ehlo()
            if not payload.smtp_use_ssl:
                # Try STARTTLS when not using implicit SSL (best-effort)
                try:
                    server.starttls()
                    server.ehlo()
                except Exception:
                    pass
            server.login(payload.smtp_username, payload.smtp_password)
            server.noop()
            server.quit()
        finally:
            try:
                server.close()
            except Exception:
                pass
        return {"ok": True}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


@router.post("", response_model=MailAccountOut, status_code=status.HTTP_201_CREATED)
def create_mail_account(
    org_id: str,
    payload: MailAccountCreateRequest,
    current_user: dict = Depends(get_current_user),
):
    require_org_admin(org_id, str(current_user["_id"]))
    now = datetime.now(timezone.utc)
    doc = {
        "org_id": org_id,
        "name": payload.name.strip(),
        "imap_host": payload.imap_host.strip(),
        "imap_port": payload.imap_port,
        "imap_username": payload.imap_username.strip(),
        "imap_password": payload.imap_password,
        "use_ssl": payload.use_ssl,
        "smtp_host": payload.smtp_host.strip(),
        "smtp_port": payload.smtp_port,
        "smtp_username": payload.smtp_username.strip(),
        "smtp_password": payload.smtp_password,
        "smtp_use_ssl": payload.smtp_use_ssl,
        "created_at": now,
        "updated_at": now,
    }
    result = mail_accounts_collection.insert_one(doc)
    created = mail_accounts_collection.find_one({"_id": result.inserted_id})
    return _to_out(created)


@router.get("", response_model=list[MailAccountOut])
def list_mail_accounts(org_id: str, current_user: dict = Depends(get_current_user)):
    require_org_membership(org_id, str(current_user["_id"]))
    docs = list(mail_accounts_collection.find({"org_id": org_id}))
    return [_to_out(d) for d in docs]


@router.put("/{mail_account_id}", response_model=MailAccountOut)
def update_mail_account(
    org_id: str,
    mail_account_id: str,
    payload: MailAccountUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    require_org_admin(org_id, str(current_user["_id"]))
    oid = parse_object_id(mail_account_id, "mail_account_id")
    existing = mail_accounts_collection.find_one({"_id": oid, "org_id": org_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Mail account not found")

    update = payload.model_dump(exclude_unset=True)
    if update:
        if "smtp_host" in update and update["smtp_host"] is not None:
            update["smtp_host"] = update["smtp_host"].strip()
        if "smtp_username" in update and update["smtp_username"] is not None:
            update["smtp_username"] = update["smtp_username"].strip()
        update["updated_at"] = datetime.now(timezone.utc)
        mail_accounts_collection.update_one({"_id": oid}, {"$set": update})
    updated = mail_accounts_collection.find_one({"_id": oid})
    return _to_out(updated)


@router.delete("/{mail_account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_mail_account(
    org_id: str, mail_account_id: str, current_user: dict = Depends(get_current_user)
):
    require_org_admin(org_id, str(current_user["_id"]))
    oid = parse_object_id(mail_account_id, "mail_account_id")
    result = mail_accounts_collection.delete_one({"_id": oid, "org_id": org_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Mail account not found")
    return None

