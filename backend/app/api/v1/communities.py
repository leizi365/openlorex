from fastapi import APIRouter, Depends

from app.api.deps import get_community_service, get_current_user
from app.core.response import success
from app.middleware.jwt_auth import CurrentUser
from app.schemas.community import (
    CommunityCreateRequest,
    CommunityUpdateRequest,
    InviteCreateRequest,
    JoinApplicationCreateRequest,
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
        is_public=body.is_public,
    )
    return success(data.model_dump())


@router.get("")
def list_communities(
    current_user: CurrentUser = Depends(get_current_user),
    service: CommunityService = Depends(get_community_service),
):
    data = service.list_communities(current_user.user_id)
    return success([item.model_dump() for item in data])


@router.get("/public")
def list_public_communities(
    current_user: CurrentUser = Depends(get_current_user),
    service: CommunityService = Depends(get_community_service),
):
    data = service.list_public_communities(current_user.user_id)
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
        is_public=body.is_public,
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
    if not data.my_role:
        return success([])
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


@router.post("/{code}/applications")
def apply_to_join(
    code: str,
    body: JoinApplicationCreateRequest | None = None,
    current_user: CurrentUser = Depends(get_current_user),
    service: CommunityService = Depends(get_community_service),
):
    payload = body or JoinApplicationCreateRequest()
    data = service.apply_to_join(
        current_user.user_id,
        code,
        message=payload.message,
    )
    return success(data.model_dump())


@router.get("/{code}/applications")
def list_join_applications(
    code: str,
    current_user: CurrentUser = Depends(get_current_user),
    service: CommunityService = Depends(get_community_service),
):
    data = service.list_join_applications(current_user.user_id, code)
    return success([item.model_dump() for item in data])


@router.post("/{code}/applications/{application_code}/approve")
def approve_join_application(
    code: str,
    application_code: str,
    current_user: CurrentUser = Depends(get_current_user),
    service: CommunityService = Depends(get_community_service),
):
    data = service.approve_join_application(
        current_user.user_id,
        code,
        application_code,
    )
    return success(data.model_dump(), message="已同意加入申请")


@router.post("/{code}/applications/{application_code}/reject")
def reject_join_application(
    code: str,
    application_code: str,
    current_user: CurrentUser = Depends(get_current_user),
    service: CommunityService = Depends(get_community_service),
):
    data = service.reject_join_application(
        current_user.user_id,
        code,
        application_code,
    )
    return success(data.model_dump(), message="已拒绝加入申请")


@router.get("/{code}/shared-pages")
def list_community_shared_pages(
    code: str,
    current_user: CurrentUser = Depends(get_current_user),
    service: CommunityService = Depends(get_community_service),
):
    data = service.list_community_shared_pages(current_user.user_id, code)
    return success([item.model_dump() for item in data])
