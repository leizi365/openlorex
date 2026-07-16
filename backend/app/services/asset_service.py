from __future__ import annotations

import mimetypes
import uuid
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.error_codes import ErrorCode
from app.core.exceptions import AppException
from app.core.permissions import PermissionLevel
from app.models.asset import Asset
from app.models.page import Page
from app.schemas.asset import AssetResponse
from app.services.page_access_service import PageAccessService


class AssetService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.access = PageAccessService(db)
        self.upload_dir = Path(settings.upload.dir)
        self.max_size_bytes = settings.upload.max_size_mb * 1024 * 1024
        self.max_image_size_bytes = settings.upload.max_image_size_mb * 1024 * 1024
        self.api_prefix = settings.app.api_prefix.rstrip("/")

    def upload(
        self,
        user_id: int,
        *,
        filename: str,
        content: bytes,
        content_type: str | None,
        page_code: str | None = None,
    ) -> AssetResponse:
        if not filename:
            raise AppException(ErrorCode.BAD_REQUEST, "文件名不能为空")

        mime_type = content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"
        is_image = mime_type.startswith("image/")
        max_bytes = self.max_image_size_bytes if is_image else self.max_size_bytes
        max_mb = (
            settings.upload.max_image_size_mb
            if is_image
            else settings.upload.max_size_mb
        )

        if len(content) > max_bytes:
            raise AppException(
                ErrorCode.ASSET_TOO_LARGE,
                f"文件过大（最大 {max_mb}MB）",
            )

        page_id: int | None = None
        if page_code:
            page = self.access.get_page_by_code(page_code)
            if not page:
                raise AppException(ErrorCode.PAGE_NOT_FOUND, "知识不存在")
            self.access.require_page_access(user_id, page, min_level=PermissionLevel.EDIT)
            page_id = page.id

        asset = Asset(
            code=Asset.generate_code(),
            user_id=user_id,
            page_id=page_id,
            name=filename,
            mime_type=mime_type,
            size_bytes=len(content),
            storage_key="",
        )
        self.db.add(asset)
        self.db.flush()

        storage_key = self._save_file(user_id, asset.code, filename, content)
        asset.storage_key = storage_key
        self.db.commit()
        self.db.refresh(asset)

        return self._to_response(asset, page_code)

    def get_asset(self, user_id: int, code: str) -> Asset:
        asset = self._get_asset_by_code(code)
        self._require_asset_access(user_id, asset)
        file_path = self._resolve_path(asset.storage_key)
        if not file_path.exists():
            raise AppException(ErrorCode.ASSET_NOT_FOUND, "文件不存在")
        return asset

    def resolve_file_path(self, user_id: int, code: str) -> tuple[Asset, Path]:
        asset = self.get_asset(user_id, code)
        return asset, self._resolve_path(asset.storage_key)

    def resolve_public_file_path(self, code: str) -> tuple[Asset, Path]:
        asset = self._get_asset_by_code(code)
        if asset.page_id is None:
            raise AppException(ErrorCode.ASSET_NOT_FOUND, "资源不存在")

        page = (
            self.db.query(Page)
            .filter(Page.id == asset.page_id, Page.deleted.is_(False))
            .first()
        )
        if not page or not self.access.is_publicly_accessible(page):
            raise AppException(ErrorCode.ASSET_NOT_FOUND, "资源不存在")

        file_path = self._resolve_path(asset.storage_key)
        if not file_path.exists():
            raise AppException(ErrorCode.ASSET_NOT_FOUND, "文件不存在")
        return asset, file_path

    def delete_asset(self, user_id: int, code: str) -> None:
        asset = self._get_asset_by_code(code)
        self._require_asset_access(user_id, asset, min_level=PermissionLevel.EDIT)
        asset.deleted = True
        self.db.commit()

    def _require_asset_access(
        self,
        user_id: int,
        asset: Asset,
        *,
        min_level: PermissionLevel = PermissionLevel.VIEW,
    ) -> None:
        if asset.user_id == user_id:
            return

        if asset.page_id is None:
            raise AppException(ErrorCode.ASSET_NOT_FOUND, "资源不存在")

        page = (
            self.db.query(Page)
            .filter(Page.id == asset.page_id, Page.deleted.is_(False))
            .first()
        )
        if not page:
            raise AppException(ErrorCode.ASSET_NOT_FOUND, "资源不存在")

        self.access.require_page_access(user_id, page, min_level=min_level)

    def _get_asset_by_code(self, code: str) -> Asset:
        asset = (
            self.db.query(Asset)
            .filter(Asset.code == code, Asset.deleted.is_(False))
            .first()
        )
        if not asset:
            raise AppException(ErrorCode.ASSET_NOT_FOUND, "资源不存在")
        return asset

    def _save_file(
        self,
        user_id: int,
        asset_code: str,
        filename: str,
        content: bytes,
    ) -> str:
        suffix = Path(filename).suffix
        relative_key = f"{user_id}/{asset_code}/{uuid.uuid4().hex}{suffix}"
        file_path = self.upload_dir / relative_key
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_bytes(content)
        return relative_key

    def _resolve_path(self, storage_key: str) -> Path:
        return self.upload_dir / storage_key

    def _to_response(self, asset: Asset, page_code: str | None = None) -> AssetResponse:
        if page_code is None and asset.page_id:
            page = (
                self.db.query(Page.code)
                .filter(Page.id == asset.page_id, Page.deleted.is_(False))
                .first()
            )
            page_code = page.code if page else None

        return AssetResponse(
            code=asset.code,
            name=asset.name,
            mime_type=asset.mime_type,
            size_bytes=asset.size_bytes,
            url=f"{self.api_prefix}/assets/{asset.code}/download",
            page_code=page_code,
        )
