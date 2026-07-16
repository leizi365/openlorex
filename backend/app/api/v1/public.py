from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse

from app.api.deps import get_asset_service, get_page_service
from app.core.response import success
from app.services.asset_service import AssetService
from app.services.page_service import PageService

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/pages/{code}")
def get_public_page(
    code: str,
    service: PageService = Depends(get_page_service),
):
    data = service.get_public_page(code)
    return success(data.model_dump())


@router.get("/pages/{code}/tree")
def get_public_page_tree(
    code: str,
    service: PageService = Depends(get_page_service),
):
    data = service.get_public_page_tree(code)
    return success([node.model_dump() for node in data])


@router.get("/assets/{code}/download")
def download_public_asset(
    code: str,
    service: AssetService = Depends(get_asset_service),
):
    asset, file_path = service.resolve_public_file_path(code)
    return FileResponse(
        path=file_path,
        media_type=asset.mime_type,
        filename=asset.name,
    )
