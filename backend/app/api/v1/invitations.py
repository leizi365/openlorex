from fastapi import APIRouter, Depends, Query

from app.api.deps import get_community_service, get_current_user
from app.core.response import success
from app.middleware.jwt_auth import CurrentUser
from app.schemas.community import AcceptInvitationRequest
from app.services.community_service import CommunityService

router = APIRouter(prefix="/invitations", tags=["invitations"])


@router.get("/mine")
def list_my_invitations(
    current_user: CurrentUser = Depends(get_current_user),
    service: CommunityService = Depends(get_community_service),
):
    data = service.list_my_pending_invitations(current_user.user_id)
    return success([item.model_dump() for item in data])


@router.get("/{invite_code}")
def preview_invitation(
    invite_code: str,
    token: str = Query(..., min_length=8),
    service: CommunityService = Depends(get_community_service),
):
    data = service.get_invitation_preview(invite_code, token)
    return success(data.model_dump())


@router.post("/accept")
def accept_invitation(
    body: AcceptInvitationRequest,
    current_user: CurrentUser = Depends(get_current_user),
    service: CommunityService = Depends(get_community_service),
):
    data = service.accept_invitation(
        current_user.user_id,
        invite_code=body.invite_code,
        token=body.token,
    )
    return success(data.model_dump(), "已成功加入社区")
