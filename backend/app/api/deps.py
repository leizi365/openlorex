from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import UnauthorizedException
from app.middleware.jwt_auth import CurrentUser
from app.services.asset_service import AssetService
from app.services.auth_service import AuthService
from app.services.community_service import CommunityService, PagePermissionService
from app.services.page_service import PageService


def get_current_user(request: Request) -> CurrentUser:
    user = getattr(request.state, "current_user", None)
    if user is None:
        raise UnauthorizedException()
    return user


def get_optional_user(request: Request) -> CurrentUser | None:
    return getattr(request.state, "current_user", None)


def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    return AuthService(db)


def get_page_service(db: Session = Depends(get_db)) -> PageService:
    return PageService(db)


def get_asset_service(db: Session = Depends(get_db)) -> AssetService:
    return AssetService(db)


def get_community_service(db: Session = Depends(get_db)) -> CommunityService:
    return CommunityService(db)


def get_page_permission_service(db: Session = Depends(get_db)) -> PagePermissionService:
    return PagePermissionService(db)
