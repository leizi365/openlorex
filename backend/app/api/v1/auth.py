from fastapi import APIRouter, Depends

from app.api.deps import get_auth_service, get_current_user
from app.core.response import success
from app.middleware.jwt_auth import CurrentUser
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    RegisterRequest,
    UpdateProfileRequest,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register")
def register(
    body: RegisterRequest,
    service: AuthService = Depends(get_auth_service),
):
    data = service.register(body)
    return success(data.model_dump())


@router.post("/login")
def login(
    body: LoginRequest,
    service: AuthService = Depends(get_auth_service),
):
    data = service.login(body)
    return success(data.model_dump())


@router.get("/me")
def me(
    current_user: CurrentUser = Depends(get_current_user),
    service: AuthService = Depends(get_auth_service),
):
    data = service.get_user(current_user.user_id)
    return success(data.model_dump())


@router.patch("/profile")
def update_profile(
    body: UpdateProfileRequest,
    current_user: CurrentUser = Depends(get_current_user),
    service: AuthService = Depends(get_auth_service),
):
    data = service.update_profile(current_user.user_id, body)
    return success(data.model_dump(), "昵称已更新")


@router.patch("/password")
def change_password(
    body: ChangePasswordRequest,
    current_user: CurrentUser = Depends(get_current_user),
    service: AuthService = Depends(get_auth_service),
):
    service.change_password(current_user.user_id, body)
    return success(message="密码已更新")
