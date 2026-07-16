from __future__ import annotations

from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """统一 API 响应：code=0 表示成功。"""

    code: int = 0
    message: str = "success"
    data: T | None = None


class PageResult(BaseModel, Generic[T]):
    items: list[T] = Field(default_factory=list)
    total: int = 0


def success(data: Any = None, message: str = "success") -> dict[str, Any]:
    return ApiResponse(code=0, message=message, data=data).model_dump()


def fail(code: int, message: str, data: Any = None) -> dict[str, Any]:
    return ApiResponse(code=code, message=message, data=data).model_dump()
