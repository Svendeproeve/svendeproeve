# Sortr Backend

Minimal FastAPI + MongoDB auth service with:

- `POST /auth/signup`
- `POST /auth/signin`
- `GET /auth/me`
- `GET /health`

Organization and collaboration endpoints:

- `POST /organizations` (create organization)
- `GET /organizations` (list organizations for signed-in user)
- `GET /organizations/{org_id}/members`
- `POST /organizations/{org_id}/members/invite` (invite existing user by email)

Inbox management:

- `POST /organizations/{org_id}/inboxes`
- `GET /organizations/{org_id}/inboxes`
- `PUT /organizations/{org_id}/inboxes/{inbox_id}`
- `DELETE /organizations/{org_id}/inboxes/{inbox_id}`
- `PUT /organizations/{org_id}/inboxes/members/{member_user_id}/access`
- `GET /organizations/{org_id}/inboxes/members/{member_user_id}/access`

Mail account (IMAP connection) management:

- `POST /organizations/{org_id}/mail-accounts`
- `GET /organizations/{org_id}/mail-accounts`
- `PUT /organizations/{org_id}/mail-accounts/{mail_account_id}`
- `DELETE /organizations/{org_id}/mail-accounts/{mail_account_id}`
- `POST /organizations/{org_id}/mail-accounts/test` (test IMAP login)
- `POST /organizations/{org_id}/mail-accounts/test-smtp` (test SMTP login)

Filter management:

- `POST /organizations/{org_id}/filters`
- `GET /organizations/{org_id}/filters`
- `PUT /organizations/{org_id}/filters/{filter_id}`
- `DELETE /organizations/{org_id}/filters/{filter_id}`

## Setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

Edit `.env` with your Mongo connection and JWT secret.

## Run

```powershell
uvicorn app.main:app --reload
```

API: `http://127.0.0.1:8000`
Docs: `http://127.0.0.1:8000/docs`

## Run with Docker (API + Mongo together)

```powershell
cd backend
copy .env.example .env
docker compose up --build
```

This starts:

- API on `http://127.0.0.1:8000`
- MongoDB on `mongodb://localhost:27017`

Useful commands:

```powershell
docker compose down
docker compose down -v
```

- `down`: stop containers
- `down -v`: stop and also remove Mongo volume data
