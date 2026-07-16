from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.core.error_codes import ErrorCode
from app.core.exceptions import AppException, UnauthorizedException
from app.core.response import fail
from app.core.security import decode_access_token


@dataclass
class CurrentUser:
    code: str
    user_id: int


class JwtAuthMiddleware(BaseHTTPMiddleware):
    """JWT 鉴权中间件：白名单路径放行，其余按需校验 Bearer Token。"""

    def __init__(
        self,
        app,
        *,
        public_paths: set[str] | None = None,
        optional_paths: set[str] | None = None,
    ) -> None:
        super().__init__(app)
        self.public_paths = public_paths or set()
        self.optional_paths = optional_paths or set()

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path
        request.state.current_user = None

        if self._is_public(path, request.method):
            return await call_next(request)

        token = self._extract_token(request)
        try:
            if not token:
                if self._is_optional(path, request.method) or self._is_page_read_optional(
                    path, request.method
                ):
                    return await call_next(request)
                raise UnauthorizedException()

            payload = decode_access_token(token)
            user_code = payload.get("sub")
            user_id = payload.get("uid")

            if not user_code or user_id is None:
                raise AppException(
                    ErrorCode.TOKEN_INVALID,
                    "Token 载荷无效",
                    http_status=401,
                )

            request.state.current_user = CurrentUser(
                code=user_code,
                user_id=int(user_id),
            )
        except AppException as exc:
            if exc.http_status == 401 and self._is_page_read_optional(
                path, request.method
            ):
                return await call_next(request)
            return JSONResponse(
                status_code=exc.http_status,
                content=fail(exc.code, exc.message, exc.data),
            )

        return await call_next(request)

    def _extract_token(self, request: Request) -> str | None:
        auth = request.headers.get("Authorization")
        if auth:
            scheme, _, token = auth.partition(" ")
            if scheme.lower() == "bearer" and token:
                return token

        query_token = request.query_params.get("access_token")
        if query_token:
            return query_token

        return None

    def _normalize(self, path: str) -> str:
        return path.rstrip("/") or "/"

    def _is_public(self, path: str, method: str = "GET") -> bool:
        normalized = self._normalize(path)
        if normalized in self.public_paths:
            return True

        api_prefix = settings.app.api_prefix.rstrip("/")
        if (
            method == "GET"
            and normalized.startswith(f"{api_prefix}/public/")
        ):
            return True

        if (
            method == "GET"
            and normalized.startswith(f"{api_prefix}/invitations/inv_")
        ):
            return True

        return False

    def _is_optional(self, path: str, method: str = "GET") -> bool:
        normalized = self._normalize(path)
        return normalized in self.optional_paths

    def _is_page_read_optional(self, path: str, method: str = "GET") -> bool:
        if method != "GET":
            return False
        api_prefix = re.escape(settings.app.api_prefix.rstrip("/"))
        normalized = self._normalize(path)
        return re.match(rf"^{api_prefix}/pages/p_[A-Za-z0-9_-]+$", normalized) is not None
