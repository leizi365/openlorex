from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.error_codes import ErrorCode
from app.core.exceptions import AppException
from app.core.permissions import (
    COMMUNITY_ADMIN_ROLES,
    GRANTEE_COMMUNITY,
    GRANTEE_USER,
    INVITE_ACCEPTED,
    INVITE_EXPIRED,
    INVITE_PENDING,
    INVITE_REVOKED,
    PermissionLevel,
    permission_from_db,
    ROLE_ADMIN,
    ROLE_MEMBER,
    ROLE_OWNER,
)
from app.models.community import Community
from app.models.community_invitation import CommunityInvitation
from app.models.community_member import CommunityMember
from app.models.page import Page
from app.models.page_permission import PagePermission
from app.models.user import User
from app.schemas.community import (
    CommunityDetail,
    CommunityMemberSummary,
    CommunitySummary,
    InvitationResponse,
)
from app.schemas.page_permission import PageAccessVia, PagePermissionGrantee, SharedPageSummary
from app.services.page_access_service import PageAccessService


INVITE_TTL_DAYS = 7


class CommunityService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.access = PageAccessService(db)

    def create_community(self, user_id: int, *, name: str, description: str | None) -> CommunitySummary:
        community = Community(
            code=Community.generate_code(),
            name=name.strip(),
            description=description.strip() if description else None,
            owner_id=user_id,
        )
        self.db.add(community)
        self.db.flush()

        member = CommunityMember(
            community_id=community.id,
            user_id=user_id,
            role=ROLE_OWNER,
        )
        self.db.add(member)
        self.db.commit()
        self.db.refresh(community)

        owner = self._get_user(user_id)
        return self._to_summary(community, owner, ROLE_OWNER, member_count=1)

    def list_communities(self, user_id: int) -> list[CommunitySummary]:
        rows = (
            self.db.query(Community, CommunityMember.role)
            .join(
                CommunityMember,
                CommunityMember.community_id == Community.id,
            )
            .filter(
                CommunityMember.user_id == user_id,
                CommunityMember.deleted.is_(False),
                Community.deleted.is_(False),
            )
            .order_by(Community.updated_at.desc())
            .all()
        )

        result: list[CommunitySummary] = []
        for community, role in rows:
            owner = self._get_user(community.owner_id)
            member_count = self._count_members(community.id)
            result.append(self._to_summary(community, owner, role, member_count))
        return result

    def get_community(self, user_id: int, code: str) -> CommunityDetail:
        community = self._get_active_community(code)
        membership = self._get_membership(community.id, user_id)
        if not membership:
            raise AppException(ErrorCode.NOT_COMMUNITY_MEMBER, "不是社区成员")

        owner = self._get_user(community.owner_id)
        members = self._list_members(community.id)
        summary = self._to_summary(
            community,
            owner,
            membership.role,
            len(members),
        )
        return CommunityDetail(**summary.model_dump(), members=members)

    def update_community(
        self,
        user_id: int,
        code: str,
        *,
        name: str | None,
        description: str | None,
    ) -> CommunitySummary:
        community = self._get_active_community(code)
        self._require_admin(community.id, user_id)

        if name is not None:
            community.name = name.strip()
        if description is not None:
            community.description = description.strip() or None

        self.db.commit()
        self.db.refresh(community)

        membership = self._get_membership(community.id, user_id)
        owner = self._get_user(community.owner_id)
        return self._to_summary(
            community,
            owner,
            membership.role if membership else ROLE_MEMBER,
            self._count_members(community.id),
        )

    def delete_community(self, user_id: int, code: str) -> None:
        community = self._get_active_community(code)
        if community.owner_id != user_id:
            raise AppException(ErrorCode.COMMUNITY_FORBIDDEN, "只有创建者可以解散社区")

        community.deleted = True
        (
            self.db.query(CommunityMember)
            .filter(CommunityMember.community_id == community.id)
            .update({CommunityMember.deleted: True}, synchronize_session=False)
        )
        self.db.commit()

    def remove_member(self, user_id: int, community_code: str, member_code: str) -> None:
        community = self._get_active_community(community_code)
        self._require_admin(community.id, user_id)

        target = self._get_user_by_code(member_code)
        membership = self._get_membership(community.id, target.id)
        if not membership:
            raise AppException(ErrorCode.MEMBER_NOT_FOUND, "成员不存在")
        if membership.role == ROLE_OWNER:
            raise AppException(ErrorCode.COMMUNITY_FORBIDDEN, "不能移除社区创建者")

        membership.deleted = True
        self.db.commit()
        self.access._community_ids_cache.pop(target.id, None)

    def update_member_role(
        self,
        user_id: int,
        community_code: str,
        member_code: str,
        role: str,
    ) -> None:
        community = self._get_active_community(community_code)
        if community.owner_id != user_id:
            raise AppException(ErrorCode.COMMUNITY_FORBIDDEN, "只有创建者可以调整角色")

        target = self._get_user_by_code(member_code)
        membership = self._get_membership(community.id, target.id)
        if not membership:
            raise AppException(ErrorCode.MEMBER_NOT_FOUND, "成员不存在")
        if membership.role == ROLE_OWNER:
            raise AppException(ErrorCode.COMMUNITY_FORBIDDEN, "不能修改创建者角色")

        membership.role = role
        self.db.commit()

    def create_invitation(
        self,
        user_id: int,
        community_code: str,
        *,
        email: str,
    ) -> InvitationResponse:
        community = self._get_active_community(community_code)
        self._require_admin(community.id, user_id)

        normalized_email = email.strip().lower()
        existing_user = (
            self.db.query(User)
            .filter(User.email == normalized_email, User.deleted.is_(False))
            .first()
        )
        if not existing_user:
            raise AppException(ErrorCode.NOT_FOUND, "该邮箱尚未注册")

        membership = self._get_membership(community.id, existing_user.id)
        if membership:
            raise AppException(ErrorCode.CONFLICT, "该用户已是社区成员")

        pending = (
            self.db.query(CommunityInvitation)
            .filter(
                CommunityInvitation.community_id == community.id,
                CommunityInvitation.invitee_email == normalized_email,
                CommunityInvitation.status == INVITE_PENDING,
                CommunityInvitation.deleted.is_(False),
            )
            .first()
        )
        if pending:
            raise AppException(ErrorCode.CONFLICT, "该邮箱已有待处理的邀请")

        token = secrets.token_urlsafe(32)
        invitation = CommunityInvitation(
            code=CommunityInvitation.generate_code(),
            community_id=community.id,
            inviter_id=user_id,
            invitee_email=normalized_email,
            status=INVITE_PENDING,
            token_hash=self._hash_token(token),
            expires_at=datetime.now(timezone.utc) + timedelta(days=INVITE_TTL_DAYS),
        )
        self.db.add(invitation)
        self.db.commit()
        self.db.refresh(invitation)

        return InvitationResponse(
            code=invitation.code,
            invitee_email=invitation.invitee_email,
            status=invitation.status,
            expires_at=self._format_dt(invitation.expires_at),
            invite_link=self._build_invite_link(invitation.code, token),
        )

    def list_invitations(self, user_id: int, community_code: str) -> list[InvitationResponse]:
        community = self._get_active_community(community_code)
        self._require_admin(community.id, user_id)

        rows = (
            self.db.query(CommunityInvitation)
            .filter(
                CommunityInvitation.community_id == community.id,
                CommunityInvitation.deleted.is_(False),
                CommunityInvitation.status == INVITE_PENDING,
            )
            .order_by(CommunityInvitation.created_at.desc())
            .all()
        )
        return [
            InvitationResponse(
                code=row.code,
                invitee_email=row.invitee_email,
                status=row.status,
                expires_at=self._format_dt(row.expires_at),
                invite_link="",
            )
            for row in rows
        ]

    def revoke_invitation(self, user_id: int, community_code: str, invite_code: str) -> None:
        community = self._get_active_community(community_code)
        self._require_admin(community.id, user_id)

        invitation = self._get_invitation(invite_code, community.id)
        invitation.status = INVITE_REVOKED
        self.db.commit()

    def list_my_pending_invitations(self, user_id: int) -> list[InvitationResponse]:
        user = self._get_user(user_id)
        rows = (
            self.db.query(CommunityInvitation, Community, User)
            .join(Community, Community.id == CommunityInvitation.community_id)
            .join(User, User.id == CommunityInvitation.inviter_id)
            .filter(
                CommunityInvitation.invitee_email == user.email.lower(),
                CommunityInvitation.status == INVITE_PENDING,
                CommunityInvitation.deleted.is_(False),
                Community.deleted.is_(False),
            )
            .order_by(CommunityInvitation.created_at.desc())
            .all()
        )

        now = datetime.now(timezone.utc)
        result: list[InvitationResponse] = []
        for invitation, community, inviter in rows:
            expires_at = invitation.expires_at.replace(tzinfo=timezone.utc)
            if expires_at < now:
                invitation.status = INVITE_EXPIRED
                continue

            result.append(
                InvitationResponse(
                    code=invitation.code,
                    invitee_email=invitation.invitee_email,
                    status=invitation.status,
                    expires_at=self._format_dt(invitation.expires_at),
                    invite_link="",
                    community_code=community.code,
                    community_name=community.name,
                    inviter_name=inviter.name,
                )
            )

        if result:
            self.db.commit()
        return result

    def get_invitation_preview(self, invite_code: str, token: str) -> InvitationResponse:
        invitation = self._get_pending_invitation(invite_code)
        if invitation.token_hash != self._hash_token(token):
            raise AppException(ErrorCode.INVITE_INVALID, "邀请无效")

        community = self._get_active_community_by_id(invitation.community_id)
        inviter = self._get_user(invitation.inviter_id)
        return InvitationResponse(
            code=invitation.code,
            invitee_email=invitation.invitee_email,
            status=invitation.status,
            expires_at=self._format_dt(invitation.expires_at),
            invite_link="",
            community_code=community.code,
            community_name=community.name,
            inviter_name=inviter.name,
        )

    def accept_invitation(
        self,
        user_id: int,
        *,
        invite_code: str,
        token: str | None = None,
    ) -> CommunitySummary:
        invitation = self._get_pending_invitation(invite_code)

        user = self._get_user(user_id)
        if user.email.lower() != invitation.invitee_email.lower():
            raise AppException(ErrorCode.INVITE_INVALID, "邀请邮箱与当前账户不匹配")

        if token is not None and invitation.token_hash != self._hash_token(token):
            raise AppException(ErrorCode.INVITE_INVALID, "邀请无效")

        community = self._get_active_community_by_id(invitation.community_id)
        membership = self._get_membership(community.id, user_id)
        if not membership:
            self.db.add(
                CommunityMember(
                    community_id=community.id,
                    user_id=user_id,
                    role=ROLE_MEMBER,
                )
            )

        invitation.status = INVITE_ACCEPTED
        invitation.accepted_at = datetime.now(timezone.utc)
        self.db.commit()
        self.access._community_ids_cache.pop(user_id, None)

        owner = self._get_user(community.owner_id)
        return self._to_summary(
            community,
            owner,
            ROLE_MEMBER,
            self._count_members(community.id),
        )

    def list_community_shared_pages(
        self,
        user_id: int,
        community_code: str,
    ) -> list[SharedPageSummary]:
        community = self._get_active_community(community_code)
        if not self._get_membership(community.id, user_id):
            raise AppException(ErrorCode.NOT_COMMUNITY_MEMBER, "不是社区成员")

        rows = (
            self.db.query(PagePermission, Page)
            .join(Page, Page.id == PagePermission.page_id)
            .filter(
                PagePermission.grantee_type == GRANTEE_COMMUNITY,
                PagePermission.grantee_id == community.id,
                PagePermission.deleted.is_(False),
                Page.deleted.is_(False),
            )
            .order_by(Page.updated_at.desc())
            .all()
        )

        merged: dict[int, tuple[Page, PermissionLevel, PageAccessVia | None]] = {}
        community_via = PageAccessVia(
            type="community",
            code=community.code,
            name=community.name,
        )
        for perm, page in rows:
            level = permission_from_db(perm.permission)
            existing = merged.get(page.id)
            if existing is None or level > existing[1]:
                merged[page.id] = (page, level, community_via)

        merged = self.access.expand_permission_entries(merged)

        owner_ids = {page.user_id for page, _, _ in merged.values()}
        owners = {
            user.id: user
            for user in self.db.query(User)
            .filter(User.id.in_(owner_ids), User.deleted.is_(False))
            .all()
        } if owner_ids else {}

        code_by_id = self.access._owned_relation_codes(
            {page.id: page for page, _, _ in merged.values()}
        )

        result: list[SharedPageSummary] = []
        for page, level, via in merged.values():
            owner = owners.get(page.user_id)
            if not owner:
                continue
            result.append(
                SharedPageSummary(
                    code=page.code,
                    title=page.title,
                    icon=page.icon,
                    cover_color=page.cover_color,
                    parent_code=code_by_id.get(page.parent_id) if page.parent_id else None,
                    container_code=(
                        code_by_id.get(page.container_page_id)
                        if page.container_page_id
                        else None
                    ),
                    sort_order=page.sort_order,
                    version=page.version,
                    is_public=page.is_public,
                    created_at=self._format_dt(page.created_at),
                    updated_at=self._format_dt(page.updated_at),
                    permission=self.access._level_name(level),
                    owner_code=owner.code,
                    owner_name=owner.name,
                    via=via,
                    depth=self.access._get_shared_depth(page),
                )
            )
        result.sort(key=lambda item: item.updated_at, reverse=True)
        return result

    def _list_members(self, community_id: int) -> list[CommunityMemberSummary]:
        rows = (
            self.db.query(CommunityMember, User)
            .join(User, User.id == CommunityMember.user_id)
            .filter(
                CommunityMember.community_id == community_id,
                CommunityMember.deleted.is_(False),
                User.deleted.is_(False),
            )
            .order_by(CommunityMember.joined_at.asc())
            .all()
        )
        return [
            CommunityMemberSummary(
                user_code=user.code,
                name=user.name,
                email=user.email,
                role=member.role,
                joined_at=self._format_dt(member.joined_at),
            )
            for member, user in rows
        ]

    def _count_members(self, community_id: int) -> int:
        return (
            self.db.query(CommunityMember)
            .filter(
                CommunityMember.community_id == community_id,
                CommunityMember.deleted.is_(False),
            )
            .count()
        )

    def _require_admin(self, community_id: int, user_id: int) -> CommunityMember:
        membership = self._get_membership(community_id, user_id)
        if not membership or membership.role not in COMMUNITY_ADMIN_ROLES:
            raise AppException(ErrorCode.COMMUNITY_FORBIDDEN, "无社区管理权限")
        return membership

    def _get_membership(self, community_id: int, user_id: int) -> CommunityMember | None:
        return (
            self.db.query(CommunityMember)
            .filter(
                CommunityMember.community_id == community_id,
                CommunityMember.user_id == user_id,
                CommunityMember.deleted.is_(False),
            )
            .first()
        )

    def is_member(self, community_id: int, user_id: int) -> bool:
        return self._get_membership(community_id, user_id) is not None

    def _get_active_community(self, code: str) -> Community:
        community = (
            self.db.query(Community)
            .filter(Community.code == code, Community.deleted.is_(False))
            .first()
        )
        if not community:
            raise AppException(ErrorCode.COMMUNITY_NOT_FOUND, "社区不存在")
        return community

    def _get_active_community_by_id(self, community_id: int) -> Community:
        community = (
            self.db.query(Community)
            .filter(Community.id == community_id, Community.deleted.is_(False))
            .first()
        )
        if not community:
            raise AppException(ErrorCode.COMMUNITY_NOT_FOUND, "社区不存在")
        return community

    def _get_pending_invitation(self, invite_code: str) -> CommunityInvitation:
        invitation = (
            self.db.query(CommunityInvitation)
            .filter(
                CommunityInvitation.code == invite_code,
                CommunityInvitation.deleted.is_(False),
            )
            .first()
        )
        if not invitation or invitation.status != INVITE_PENDING:
            raise AppException(ErrorCode.INVITE_INVALID, "邀请无效")

        if invitation.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
            invitation.status = INVITE_EXPIRED
            self.db.commit()
            raise AppException(ErrorCode.INVITE_EXPIRED, "邀请已过期")

        return invitation

    def _get_invitation(self, invite_code: str, community_id: int) -> CommunityInvitation:
        invitation = (
            self.db.query(CommunityInvitation)
            .filter(
                CommunityInvitation.code == invite_code,
                CommunityInvitation.community_id == community_id,
                CommunityInvitation.deleted.is_(False),
            )
            .first()
        )
        if not invitation:
            raise AppException(ErrorCode.INVITE_INVALID, "邀请不存在")
        return invitation

    def _get_user(self, user_id: int) -> User:
        user = (
            self.db.query(User)
            .filter(User.id == user_id, User.deleted.is_(False))
            .first()
        )
        if not user:
            raise AppException(ErrorCode.NOT_FOUND, "用户不存在")
        return user

    def _get_user_by_code(self, code: str) -> User:
        user = (
            self.db.query(User)
            .filter(User.code == code, User.deleted.is_(False))
            .first()
        )
        if not user:
            raise AppException(ErrorCode.NOT_FOUND, "用户不存在")
        return user

    def _to_summary(
        self,
        community: Community,
        owner: User,
        my_role: str,
        member_count: int,
    ) -> CommunitySummary:
        return CommunitySummary(
            code=community.code,
            name=community.name,
            description=community.description,
            owner_code=owner.code,
            owner_name=owner.name,
            member_count=member_count,
            my_role=my_role,
            created_at=self._format_dt(community.created_at),
        )

    @staticmethod
    def _hash_token(token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()

    def _build_invite_link(self, invite_code: str, token: str) -> str:
        base = settings.app.frontend_url.rstrip("/")
        return f"{base}/invite/{invite_code}?token={token}"

    @staticmethod
    def _format_dt(value: datetime) -> str:
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()


class PagePermissionService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.access = PageAccessService(db)
        self.communities = CommunityService(db)

    def list_permissions(self, user_id: int, page_code: str) -> list[PagePermissionGrantee]:
        page = self.access.get_page_by_code(page_code)
        if not page:
            raise AppException(ErrorCode.PAGE_NOT_FOUND, "知识不存在")
        self.access.require_page_access(user_id, page, min_level=PermissionLevel.OWNER)

        rows = (
            self.db.query(PagePermission)
            .filter(
                PagePermission.page_id == page.id,
                PagePermission.deleted.is_(False),
            )
            .order_by(PagePermission.created_at.asc())
            .all()
        )

        result: list[PagePermissionGrantee] = []
        for row in rows:
            result.append(
                PagePermissionGrantee(
                    grantee_type=row.grantee_type,
                    grantee_code=self._grantee_code(row),
                    grantee_name=self._grantee_name(row),
                    permission=row.permission,
                )
            )
        return result

    def upsert_permission(
        self,
        user_id: int,
        page_code: str,
        *,
        grantee_type: str,
        grantee_code: str,
        permission: str,
    ) -> PagePermissionGrantee:
        page = self.access.get_page_by_code(page_code)
        if not page:
            raise AppException(ErrorCode.PAGE_NOT_FOUND, "知识不存在")
        self.access.require_page_access(user_id, page, min_level=PermissionLevel.OWNER)

        grantee_id, grantee_name = self._resolve_grantee(
            user_id,
            grantee_type,
            grantee_code,
        )

        existing = (
            self.db.query(PagePermission)
            .filter(
                PagePermission.page_id == page.id,
                PagePermission.grantee_type == grantee_type,
                PagePermission.grantee_id == grantee_id,
            )
            .first()
        )
        if existing:
            existing.permission = permission
            existing.granted_by = user_id
            existing.deleted = False
        else:
            existing = PagePermission(
                page_id=page.id,
                grantee_type=grantee_type,
                grantee_id=grantee_id,
                permission=permission,
                granted_by=user_id,
            )
            self.db.add(existing)

        self.db.commit()
        resolved_code = (
            self._grantee_code_for_id(grantee_type, grantee_id)
            if grantee_type in (GRANTEE_USER, GRANTEE_COMMUNITY)
            else grantee_code
        )
        return PagePermissionGrantee(
            grantee_type=grantee_type,
            grantee_code=resolved_code,
            grantee_name=grantee_name,
            permission=permission,
        )

    def revoke_permission(
        self,
        user_id: int,
        page_code: str,
        *,
        grantee_type: str,
        grantee_code: str,
    ) -> None:
        page = self.access.get_page_by_code(page_code)
        if not page:
            raise AppException(ErrorCode.PAGE_NOT_FOUND, "知识不存在")
        self.access.require_page_access(user_id, page, min_level=PermissionLevel.OWNER)

        grantee_id, _ = self._resolve_grantee(user_id, grantee_type, grantee_code, require_membership=False)

        (
            self.db.query(PagePermission)
            .filter(
                PagePermission.page_id == page.id,
                PagePermission.grantee_type == grantee_type,
                PagePermission.grantee_id == grantee_id,
                PagePermission.deleted.is_(False),
            )
            .update({PagePermission.deleted: True}, synchronize_session=False)
        )
        self.db.commit()

    def _resolve_grantee(
        self,
        user_id: int,
        grantee_type: str,
        grantee_code: str,
        *,
        require_membership: bool = True,
    ) -> tuple[int, str]:
        if grantee_type == GRANTEE_USER:
            identifier = grantee_code.strip()
            if "@" in identifier:
                user = self._get_user_by_email(identifier)
            else:
                user = self._get_user_by_code(identifier)
            if user.id == user_id:
                raise AppException(ErrorCode.BAD_REQUEST, "不能给自己授权")
            return user.id, user.name

        if grantee_type == GRANTEE_COMMUNITY:
            community = (
                self.db.query(Community)
                .filter(Community.code == grantee_code, Community.deleted.is_(False))
                .first()
            )
            if not community:
                raise AppException(ErrorCode.COMMUNITY_NOT_FOUND, "社区不存在")
            if require_membership and not self.communities.is_member(community.id, user_id):
                raise AppException(ErrorCode.NOT_COMMUNITY_MEMBER, "你不是该社区成员")
            return community.id, community.name

        raise AppException(ErrorCode.BAD_REQUEST, "无效的授权对象类型")

    def _grantee_code(self, row: PagePermission) -> str:
        if row.grantee_type == GRANTEE_USER:
            user = self._get_user_by_id(row.grantee_id)
            return user.code
        community = self._get_community_by_id(row.grantee_id)
        return community.code

    def _grantee_name(self, row: PagePermission) -> str:
        if row.grantee_type == GRANTEE_USER:
            return self._get_user_by_id(row.grantee_id).name
        return self._get_community_by_id(row.grantee_id).name

    def _get_user_by_code(self, code: str) -> User:
        user = (
            self.db.query(User)
            .filter(User.code == code, User.deleted.is_(False))
            .first()
        )
        if not user:
            raise AppException(ErrorCode.NOT_FOUND, "用户不存在")
        return user

    def _get_user_by_email(self, email: str) -> User:
        normalized_email = email.strip().lower()
        user = (
            self.db.query(User)
            .filter(User.email == normalized_email, User.deleted.is_(False))
            .first()
        )
        if not user:
            raise AppException(ErrorCode.NOT_FOUND, "该邮箱尚未注册")
        return user

    def _grantee_code_for_id(self, grantee_type: str, grantee_id: int) -> str:
        if grantee_type == GRANTEE_USER:
            return self._get_user_by_id(grantee_id).code
        return self._get_community_by_id(grantee_id).code

    def _get_user_by_id(self, user_id: int) -> User:
        user = (
            self.db.query(User)
            .filter(User.id == user_id, User.deleted.is_(False))
            .first()
        )
        if not user:
            raise AppException(ErrorCode.NOT_FOUND, "用户不存在")
        return user

    def _get_community_by_id(self, community_id: int) -> Community:
        community = (
            self.db.query(Community)
            .filter(Community.id == community_id, Community.deleted.is_(False))
            .first()
        )
        if not community:
            raise AppException(ErrorCode.COMMUNITY_NOT_FOUND, "社区不存在")
        return community
