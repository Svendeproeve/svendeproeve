from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.auth import router as auth_router
from app.routes.filters import router as filters_router
from app.routes.inboxes import router as inboxes_router
from app.routes.mail_accounts import router as mail_accounts_router
from app.routes.organizations import router as organizations_router

app = FastAPI(title="Sortr Backend API", version="0.1.0")

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

print(f"[CORS] Configuring CORS with origins: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)
app.include_router(auth_router)
app.include_router(organizations_router)
app.include_router(mail_accounts_router)
app.include_router(inboxes_router)
app.include_router(filters_router)


@app.get("/health")
def health():
    return {"status": "ok"}
