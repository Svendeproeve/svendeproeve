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
