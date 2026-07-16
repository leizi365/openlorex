from fastapi import APIRouter, Depends

from app.api.deps import get_community_service, get_current_user
from app.core.response import success
from app.middleware.jwt_auth import CurrentUser
from app.schemas.community import (
    CommunityCreateRequest,
    CommunityUpdateRequest,
    InviteCreateRequest,
    UpdateMemberRoleRequest,
)
from app.services.community_service import CommunityService

router = APIRouter(prefix="/communities", tags=["communities"])


@router.post("")
def create_community(
    body: CommunityCreateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    service: CommunityService = Depends(get_community_service),
):
    data = service.create_community(
        current_user.user_id,
        name=body.name,
        description=body.description,
    )
    return success(data.model_dump())


@router.get("")
def list_communities(
    current_user: CurrentUser = Depends(get_current_user),
    service: CommunityService = Depends(get_community_service),
):
    data = service.list_communities(current_user.user_id)
    return success([item.model_dump() for item in data])


@router.get("/{code}")
def get_community(
    code: str,
    current_user: CurrentUser = Depends(get_current_user),
    service: CommunityService = Depends(get_community_service),
):
    data = service.get_community(current_user.user_id, code)
    return success(data.model_dump())


@router.patch("/{code}")
def update_community(
    code: str,
    body: CommunityUpdateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    service: CommunityService = Depends(get_community_service),
):
    data = service.update_community(
        current_user.user_id,
        code,
        name=body.name,
        description=body.description,
    )
    return success(data.model_dump())


@router.delete("/{code}")
def delete_community(
    code: str,
    current_user: CurrentUser = Depends(get_current_user),
    service: CommunityService = Depends(get_community_service),
):
    service.delete_community(current_user.user_id, code)
    return success(message="社区已解散")


@router.get("/{code}/members")
def list_members(
    code: str,
    current_user: CurrentUser = Depends(get_current_user),
    service: CommunityService = Depends(get_community_service),
):
    data = service.get_community(current_user.user_id, code)
    return success([item.model_dump() for item in data.members])


@router.delete("/{code}/members/{user_code}")
def remove_member(
    code: str,
    user_code: str,
    current_user: CurrentUser = Depends(get_current_user),
    service: CommunityService = Depends(get_community_service),
):
    service.remove_member(current_user.user_id, code, user_code)
    return success(message="成员已移除")


@router.patch("/{code}/members/{user_code}")
def update_member_role(
    code: str,
    user_code: str,
    body: UpdateMemberRoleRequest,
    current_user: CurrentUser = Depends(get_current_user),
    service: CommunityService = Depends(get_community_service),
):
    service.update_member_role(current_user.user_id, code, user_code, body.role)
    return success(message="成员角色已更新")


@router.post("/{code}/invitations")
def create_invitation(
    code: str,
    body: InviteCreateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    service: CommunityService = Depends(get_community_service),
):
    data = service.create_invitation(
        current_user.user_id,
        code,
        email=body.email,
    )
    return success(data.model_dump())


@router.get("/{code}/invitations")
def list_invitations(
    code: str,
    current_user: CurrentUser = Depends(get_current_user),
    service: CommunityService = Depends(get_community_service),
):
    data = service.list_invitations(current_user.user_id, code)
    return success([item.model_dump() for item in data])


@router.delete("/{code}/invitations/{invite_code}")
def revoke_invitation(
    code: str,
    invite_code: str,
    current_user: CurrentUser = Depends(get_current_user),
    service: CommunityService = Depends(get_community_service),
):
    service.revoke_invitation(current_user.user_id, code, invite_code)
    return success(message="邀请已撤销")


@router.get("/{code}/shared-pages")
def list_community_shared_pages(
    code: str,
    current_user: CurrentUser = Depends(get_current_user),
    service: CommunityService = Depends(get_community_service),
):
    data = service.list_community_shared_pages(current_user.user_id, code)
    return success([item.model_dump() for item in data])
