from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, Field


class AppConfig(BaseModel):
    name: str = "wiki-api"
    debug: bool = False
    api_prefix: str = "/api/v1"
    frontend_url: str = "http://localhost:5173"


class ServerConfig(BaseModel):
    host: str = "0.0.0.0"
    port: int = 8000


class DatabaseConfig(BaseModel):
    host: str = "127.0.0.1"
    port: int = 3306
    user: str = "wiki"
    password: str = "wiki"
    name: str = "wiki"
    pool_size: int = 10
    max_overflow: int = 20
    echo: bool = False

    @property
    def url(self) -> str:
        return (
            f"mysql+pymysql://{self.user}:{self.password}"
            f"@{self.host}:{self.port}/{self.name}?charset=utf8mb4"
        )


class JwtConfig(BaseModel):
    secret_key: str = "change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 120
    refresh_token_expire_days: int = 7


class UploadConfig(BaseModel):
    dir: str = "uploads"
    max_size_mb: int = 50
    max_image_size_mb: int = 5


class CorsConfig(BaseModel):
    origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])


class Settings(BaseModel):
    app: AppConfig = Field(default_factory=AppConfig)
    server: ServerConfig = Field(default_factory=ServerConfig)
    database: DatabaseConfig = Field(default_factory=DatabaseConfig)
    jwt: JwtConfig = Field(default_factory=JwtConfig)
    upload: UploadConfig = Field(default_factory=UploadConfig)
    cors: CorsConfig = Field(default_factory=CorsConfig)
    env: str = "dev"


def _deep_merge(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    merged = base.copy()
    for key, value in override.items():
        if (
            key in merged
            and isinstance(merged[key], dict)
            and isinstance(value, dict)
        ):
            merged[key] = _deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


def _load_yaml(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as file:
        return yaml.safe_load(file) or {}


def load_settings() -> Settings:
    config_dir = Path(__file__).resolve().parents[2] / "config"
    env = os.getenv("APP_ENV", "dev").strip().lower()

    data = _load_yaml(config_dir / "default.yaml")
    data = _deep_merge(data, _load_yaml(config_dir / f"{env}.yaml"))

    if secret := os.getenv("JWT_SECRET_KEY"):
        data.setdefault("jwt", {})["secret_key"] = secret

    if db_password := os.getenv("DB_PASSWORD"):
        data.setdefault("database", {})["password"] = db_password

    if db_host := os.getenv("DB_HOST"):
        data.setdefault("database", {})["host"] = db_host

    if db_port := os.getenv("DB_PORT"):
        data.setdefault("database", {})["port"] = int(db_port)

    if db_user := os.getenv("DB_USER"):
        data.setdefault("database", {})["user"] = db_user

    if db_name := os.getenv("DB_NAME"):
        data.setdefault("database", {})["name"] = db_name

    if server_host := os.getenv("SERVER_HOST"):
        data.setdefault("server", {})["host"] = server_host

    if server_port := os.getenv("SERVER_PORT"):
        data.setdefault("server", {})["port"] = int(server_port)

    if upload_max_image_size_mb := os.getenv("UPLOAD_MAX_IMAGE_SIZE_MB"):
        data.setdefault("upload", {})["max_image_size_mb"] = int(
            upload_max_image_size_mb
        )

    settings = Settings.model_validate({**data, "env": env})
    return settings


@lru_cache
def get_settings() -> Settings:
    return load_settings()


settings = get_settings()
