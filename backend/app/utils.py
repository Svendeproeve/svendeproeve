from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException, status


def parse_object_id(value: str, field_name: str = "id") -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {field_name}",
        )
    return ObjectId(value)


def to_str_id(document: dict) -> dict:
    out = dict(document)
    out["id"] = str(out.pop("_id"))
    return out


def ensure_timezone_aware(dt: datetime) -> datetime:
    """
    Ensure a datetime object is timezone-aware (UTC).
    MongoDB returns naive datetimes, this converts them to timezone-aware.
    """
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt
