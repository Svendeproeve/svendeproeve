from __future__ import annotations

import json
import os
from typing import Any

from openai import OpenAI


def _client() -> OpenAI | None:
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        return None
    return OpenAI(api_key=key)


def pick_category_id(
    *,
    model: str,
    categories: list[dict[str, Any]],
    uncategorised_category_id: str,
    email: dict[str, Any],
) -> str:
    """
    Returns a category_id. If the model can't decide, returns uncategorised_category_id.

    Expects categories list items like:
      { "id": "...", "name": "...", "description": "...", "is_system": bool }
    """
    client = _client()
    if client is None:
        return uncategorised_category_id

    cat_lines = []
    for c in categories:
        cat_lines.append(
            f"- id={c['id']} name={c.get('name','')} description={c.get('description','') or ''}"
        )
    categories_text = "\n".join(cat_lines)

    prompt = {
        "categories": categories,
        "email": {
            "from": email.get("from", ""),
            "to": email.get("to", ""),
            "subject": email.get("subject", ""),
            "date": email.get("date", ""),
            "body": (email.get("body", "") or "")[:8000],
        },
        "uncategorised_category_id": uncategorised_category_id,
    }

    instructions = (
        "You are categorizing emails into exactly one category.\n"
        "Pick the single best category_id from the list.\n"
        "If none match, use uncategorised_category_id.\n"
        "Return STRICT JSON: {\"category_id\":\"...\"} with a category_id from the list or the uncategorised_category_id.\n"
        "Do not include any other keys."
    )

    # Use Responses API. We ask for JSON only and then parse.
    resp = client.responses.create(
        model=model,
        instructions=instructions,
        input=(
            "Available categories:\n"
            f"{categories_text}\n\n"
            "Email:\n"
            f"{json.dumps(prompt['email'], ensure_ascii=False)}\n\n"
            f"uncategorised_category_id: {uncategorised_category_id}\n"
        ),
    )

    text = (resp.output_text or "").strip()
    try:
        data = json.loads(text)
        cid = str(data.get("category_id", "")).strip()
        if not cid:
            return uncategorised_category_id
        # Validate against allowed ids
        allowed = {c["id"] for c in categories} | {uncategorised_category_id}
        return cid if cid in allowed else uncategorised_category_id
    except Exception:
        return uncategorised_category_id

