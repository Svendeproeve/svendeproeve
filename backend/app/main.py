from fastapi import FastAPI

from app.routes.auth import router as auth_router
from app.routes.filters import router as filters_router
from app.routes.inboxes import router as inboxes_router
from app.routes.organizations import router as organizations_router

app = FastAPI(title="Sortr Backend API", version="0.1.0")

app.include_router(auth_router)
app.include_router(organizations_router)
app.include_router(inboxes_router)
app.include_router(filters_router)


@app.get("/health")
def health():
    return {"status": "ok"}
