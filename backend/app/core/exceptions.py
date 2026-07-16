from __future__ import annotations

from typing import Any

from app.core.error_codes import ErrorCode


class AppException(Exception):
    """业务异常，由全局异常处理器转换为统一响应。"""

    def __init__(
        self,
        code: int,
        message: str,
        *,
        data: Any = None,
        http_status: int = 200,
    ) -> None:
        self.code = code
        self.message = message
        self.data = data
        self.http_status = http_status
        super().__init__(message)


class UnauthorizedException(AppException):
    def __init__(self, message: str = "未登录或登录已过期") -> None:
        super().__init__(
            ErrorCode.UNAUTHORIZED,
            message,
            http_status=401,
        )


class ForbiddenException(AppException):
    def __init__(self, message: str = "无权限访问") -> None:
        super().__init__(
            ErrorCode.FORBIDDEN,
            message,
            http_status=403,
        )


class NotFoundException(AppException):
    def __init__(self, message: str = "资源不存在") -> None:
        super().__init__(
            ErrorCode.NOT_FOUND,
            message,
            http_status=404,
        )


class ValidationException(AppException):
    def __init__(self, message: str = "参数校验失败", data: Any = None) -> None:
        super().__init__(
            ErrorCode.VALIDATION_ERROR,
            message,
            data=data,
            http_status=422,
        )
