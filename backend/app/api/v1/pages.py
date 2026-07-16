from fastapi import APIRouter, Depends

from app.api.deps import get_current_user, get_optional_user, get_page_service
from app.core.response import success
from app.middleware.jwt_auth import CurrentUser
from app.schemas.page import PageCreateRequest, PageMoveRequest, PageUpdateRequest
from app.schemas.page_permission import PagePermissionUpsertRequest
from app.schemas.public_page import PagePublicSettingsUpdate
from app.services.page_service import PageService

router = APIRouter(prefix="/pages", tags=["pages"])


@router.get("/tree")
def list_page_tree(
    current_user: CurrentUser = Depends(get_current_user),
    service: PageService = Depends(get_page_service),
):
    data = service.list_tree(current_user.user_id)
    return success([item.model_dump() for item in data])


@router.get("/shared")
def list_shared_pages(
    current_user: CurrentUser = Depends(get_current_user),
    service: PageService = Depends(get_page_service),
):
    data = service.list_shared_pages(current_user.user_id)
    return success([item.model_dump() for item in data])


@router.get("")
def list_pages(
    current_user: CurrentUser = Depends(get_current_user),
    service: PageService = Depends(get_page_service),
):
    data = service.list_pages(current_user.user_id)
    return success([item.model_dump() for item in data])


@router.get("/{code}/permissions")
def list_page_permissions(
    code: str,
    current_user: CurrentUser = Depends(get_current_user),
    service: PageService = Depends(get_page_service),
):
    data = service.list_permissions(current_user.user_id, code)
    return success([item.model_dump() for item in data])


@router.put("/{code}/permissions")
def upsert_page_permission(
    code: str,
    body: PagePermissionUpsertRequest,
    current_user: CurrentUser = Depends(get_current_user),
    service: PageService = Depends(get_page_service),
):
    data = service.upsert_permission(
        current_user.user_id,
        code,
        grantee_type=body.grantee_type,
        grantee_code=body.grantee_code,
        permission=body.permission,
    )
    return success(data.model_dump())


@router.delete("/{code}/permissions/{grantee_type}/{grantee_code}")
def revoke_page_permission(
    code: str,
    grantee_type: str,
    grantee_code: str,
    current_user: CurrentUser = Depends(get_current_user),
    service: PageService = Depends(get_page_service),
):
    service.revoke_permission(
        current_user.user_id,
        code,
        grantee_type=grantee_type,
        grantee_code=grantee_code,
    )
    return success(message="授权已撤销")


@router.get("/{code}/public")
def get_page_public_settings(
    code: str,
    current_user: CurrentUser = Depends(get_current_user),
    service: PageService = Depends(get_page_service),
):
    data = service.get_public_settings(current_user.user_id, code)
    return success(data.model_dump())


@router.put("/{code}/public")
def update_page_public_settings(
    code: str,
    body: PagePublicSettingsUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    service: PageService = Depends(get_page_service),
):
    data = service.update_public_settings(
        current_user.user_id,
        code,
        is_public=body.is_public,
    )
    return success(data.model_dump())


@router.get("/{code}")
def get_page(
    code: str,
    current_user: CurrentUser | None = Depends(get_optional_user),
    service: PageService = Depends(get_page_service),
):
    user_id = current_user.user_id if current_user else None
    data = service.get_page_for_viewer(user_id, code)
    return success(data.model_dump())


@router.post("")
def create_page(
    body: PageCreateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    service: PageService = Depends(get_page_service),
):
    data = service.create_page(current_user.user_id, body)
    return success(data.model_dump())


@router.patch("/{code}")
def update_page(
    code: str,
    body: PageUpdateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    service: PageService = Depends(get_page_service),
):
    data = service.update_page(current_user.user_id, code, body)
    return success(data.model_dump())


@router.delete("/{code}")
def delete_page(
    code: str,
    current_user: CurrentUser = Depends(get_current_user),
    service: PageService = Depends(get_page_service),
):
    service.delete_page(current_user.user_id, code)
    return success(message="知识已删除")


@router.post("/{code}/move")
def move_page(
    code: str,
    body: PageMoveRequest,
    current_user: CurrentUser = Depends(get_current_user),
    service: PageService = Depends(get_page_service),
):
    data = service.move_page(current_user.user_id, code, body)
    return success(data.model_dump())
