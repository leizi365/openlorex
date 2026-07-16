from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.error_codes import ErrorCode
from app.core.exceptions import AppException
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UpdateProfileRequest,
    UserResponse,
)


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def register(self, body: RegisterRequest) -> TokenResponse:
        exists = (
            self.db.query(User)
            .filter(User.email == body.email.lower(), User.deleted.is_(False))
            .first()
        )
        if exists:
            raise AppException(ErrorCode.EMAIL_ALREADY_EXISTS, "邮箱已被注册")

        user = User(
            code=User.generate_code(),
            email=body.email.lower(),
            name=body.name.strip(),
            password_hash=hash_password(body.password),
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return self._issue_token(user)

    def login(self, body: LoginRequest) -> TokenResponse:
        user = (
            self.db.query(User)
            .filter(User.email == body.email.lower(), User.deleted.is_(False))
            .first()
        )
        if not user or not verify_password(body.password, user.password_hash):
            raise AppException(ErrorCode.INVALID_CREDENTIALS, "邮箱或密码错误")

        return self._issue_token(user)

    def get_user(self, user_id: int) -> UserResponse:
        user = self._get_active_user(user_id)
        return self._to_user_response(user)

    def update_profile(
        self,
        user_id: int,
        body: UpdateProfileRequest,
    ) -> UserResponse:
        user = self._get_active_user(user_id)
        user.name = body.name.strip()
        self.db.commit()
        self.db.refresh(user)
        return self._to_user_response(user)

    def change_password(
        self,
        user_id: int,
        body: ChangePasswordRequest,
    ) -> None:
        user = self._get_active_user(user_id)
        if not verify_password(body.current_password, user.password_hash):
            raise AppException(ErrorCode.PASSWORD_INCORRECT, "当前密码不正确")

        user.password_hash = hash_password(body.new_password)
        self.db.commit()

    def _get_active_user(self, user_id: int) -> User:
        user = (
            self.db.query(User)
            .filter(User.id == user_id, User.deleted.is_(False))
            .first()
        )
        if not user:
            raise AppException(ErrorCode.NOT_FOUND, "用户不存在")
        return user

    def _issue_token(self, user: User) -> TokenResponse:
        token = create_access_token(user.code, extra={"uid": user.id})
        return TokenResponse(
            access_token=token,
            user=self._to_user_response(user),
        )

    @staticmethod
    def _to_user_response(user: User) -> UserResponse:
        return UserResponse(code=user.code, name=user.name, email=user.email)
