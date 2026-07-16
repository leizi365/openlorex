from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import FileResponse

from app.api.deps import get_asset_service, get_current_user
from app.core.response import success
from app.middleware.jwt_auth import CurrentUser
from app.services.asset_service import AssetService

router = APIRouter(prefix="/assets", tags=["assets"])


@router.post("/upload")
async def upload_asset(
    file: UploadFile = File(...),
    page_code: str | None = Form(default=None),
    current_user: CurrentUser = Depends(get_current_user),
    service: AssetService = Depends(get_asset_service),
):
    content = await file.read()
    data = service.upload(
        current_user.user_id,
        filename=file.filename or "file",
        content=content,
        content_type=file.content_type,
        page_code=page_code,
    )
    return success(data.model_dump())


@router.get("/{code}/download")
def download_asset(
    code: str,
    current_user: CurrentUser = Depends(get_current_user),
    service: AssetService = Depends(get_asset_service),
):
    asset, file_path = service.resolve_file_path(current_user.user_id, code)
    return FileResponse(
        path=file_path,
        media_type=asset.mime_type,
        filename=asset.name,
    )


@router.delete("/{code}")
def delete_asset(
    code: str,
    current_user: CurrentUser = Depends(get_current_user),
    service: AssetService = Depends(get_asset_service),
):
    service.delete_asset(current_user.user_id, code)
    return success(message="资源已删除")
