from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class PagePublicSettings(BaseModel):
    is_public: bool
    inherited_public: bool = False


class PagePublicSettingsUpdate(BaseModel):
    is_public: bool


class PublicPageResponse(BaseModel):
    code: str
    title: str
    icon: str | None = None
    cover_color: str | None = None
    content: list[Any] | dict[str, Any] | None = None
    owner_name: str | None = None
    updated_at: str | None = None
