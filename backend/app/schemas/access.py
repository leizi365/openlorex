from __future__ import annotations

from pydantic import BaseModel


class PageAccessVia(BaseModel):
    type: str
    code: str
    name: str


class PageAccessInfo(BaseModel):
    level: str
    owner_code: str
    owner_name: str
    via: PageAccessVia | None = None
