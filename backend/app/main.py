from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.response import success
from app.middleware.exception_handler import (
    app_exception_handler,
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.middleware.jwt_auth import JwtAuthMiddleware

API_PREFIX = settings.app.api_prefix.rstrip("/")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app.name,
        debug=settings.app.debug,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors.origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    public_paths = {
        "/",
        "/health",
        f"{API_PREFIX}/auth/register",
        f"{API_PREFIX}/auth/login",
    }
    optional_paths = {
        f"{API_PREFIX}/auth/me",
    }

    app.add_middleware(
        JwtAuthMiddleware,
        public_paths=public_paths,
        optional_paths=optional_paths,
    )

    app.add_exception_handler(Exception, unhandled_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)

    from app.core.exceptions import AppException

    app.add_exception_handler(AppException, app_exception_handler)

    @app.get("/health")
    def health():
        return success({"status": "ok", "env": settings.env})

    app.include_router(api_router, prefix=API_PREFIX)
    return app


app = create_app()


def run_server() -> None:
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.server.host,
        port=settings.server.port,
        reload=settings.app.debug,
    )


if __name__ == "__main__":
    run_server()
