from __future__ import annotations

from pydantic import BaseModel, Field

from app.schemas.access import PageAccessInfo, PageAccessVia
from app.schemas.page import PageSummary


class PagePermissionGrantee(BaseModel):
    grantee_type: str
    grantee_code: str
    grantee_name: str
    permission: str


class PagePermissionUpsertRequest(BaseModel):
    grantee_type: str = Field(pattern="^(user|community)$")
    grantee_code: str
    permission: str = Field(pattern="^(view|edit)$")


class SharedPageSummary(PageSummary):
    permission: str
    owner_code: str
    owner_name: str
    via: PageAccessVia | None = None
    depth: int = 1
