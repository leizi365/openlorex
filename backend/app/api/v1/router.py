from fastapi import APIRouter

from app.api.v1 import assets, auth, communities, invitations, pages, public

api_router = APIRouter()
api_router.include_router(public.router)
api_router.include_router(auth.router)
api_router.include_router(pages.router)
api_router.include_router(assets.router)
api_router.include_router(communities.router)
api_router.include_router(invitations.router)
