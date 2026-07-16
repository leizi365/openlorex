from pydantic import BaseModel, Field


class AssetResponse(BaseModel):
    code: str
    name: str
    mime_type: str
    size_bytes: int
    url: str
    page_code: str | None = None


class AssetUploadRequest(BaseModel):
    page_code: str | None = Field(default=None, max_length=32)
