from fastapi import APIRouter, Depends

from app.db import organizations_collection
from app.dependencies import require_superuser
from app.schemas import OrganizationOut

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/organizations", response_model=list[OrganizationOut])
def list_all_organizations(current_user: dict = Depends(require_superuser)):
    return [
        OrganizationOut(
            id=str(org["_id"]),
            name=org["name"],
            owner_user_id=org["owner_user_id"],
            created_at=org["created_at"],
        )
        for org in organizations_collection.find()
    ]
