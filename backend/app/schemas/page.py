from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, model_validator

from app.schemas.access import PageAccessInfo


class PageCreateRequest(BaseModel):
    parent_code: str | None = None
    container_code: str | None = None
    title: str = Field(default="无标题", max_length=255)
    icon: str | None = Field(default=None, max_length=32)

    @model_validator(mode="after")
    def parent_and_container_exclusive(self):
        if self.parent_code and self.container_code:
            raise ValueError("parent_code 与 container_code 不能同时指定")
        return self


class PageUpdateRequest(BaseModel):
    version: int = Field(..., ge=1, description="客户端持有的版本号，用于乐观锁")
    title: str | None = Field(default=None, max_length=255)
    icon: str | None = Field(default=None, max_length=32)
    cover_color: str | None = Field(default=None, max_length=2048)
    content: list[Any] | dict[str, Any] | None = None


class PageMoveRequest(BaseModel):
    target_code: str
    position: str = Field(pattern="^(before|after|inside)$")


class PageSummary(BaseModel):
    code: str
    title: str
    icon: str | None = None
    cover_color: str | None = None
    parent_code: str | None = None
    container_code: str | None = None
    sort_order: int
    version: int
    is_public: bool = False
    created_at: str
    updated_at: str


class PageResponse(PageSummary):
    content: list[Any] | dict[str, Any] | None = None
    access: PageAccessInfo | None = None


class PageTreeNode(PageSummary):
    children: list[PageTreeNode] = Field(default_factory=list)
