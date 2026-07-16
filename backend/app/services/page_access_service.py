from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.error_codes import ErrorCode
from app.core.exceptions import AppException
from app.core.permissions import (
    GRANTEE_COMMUNITY,
    GRANTEE_USER,
    PERMISSION_EDIT,
    PERMISSION_VIEW,
    PermissionLevel,
    max_permission,
    permission_from_db,
)
from app.models.community import Community
from app.models.community_member import CommunityMember
from app.models.page import Page
from app.models.page_permission import PagePermission
from app.models.user import User
from app.schemas.access import PageAccessInfo, PageAccessVia
from app.schemas.page_permission import SharedPageSummary


@dataclass
class ResolvedAccess:
    level: PermissionLevel
    via: PageAccessVia | None = None


class PageAccessService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self._community_ids_cache: dict[int, list[int]] = {}

    def get_community_ids(self, user_id: int) -> list[int]:
        if user_id in self._community_ids_cache:
            return self._community_ids_cache[user_id]

        rows = (
            self.db.query(CommunityMember.community_id)
            .filter(
                CommunityMember.user_id == user_id,
                CommunityMember.deleted.is_(False),
            )
            .all()
        )
        ids = [row.community_id for row in rows]
        self._community_ids_cache[user_id] = ids
        return ids

    def get_page_by_code(self, code: str) -> Page | None:
        return (
            self.db.query(Page)
            .filter(Page.code == code, Page.deleted.is_(False))
            .first()
        )

    def require_page_access(
        self,
        user_id: int,
        page: Page,
        *,
        min_level: PermissionLevel,
    ) -> ResolvedAccess:
        resolved = self.resolve_access(user_id, page)
        if resolved.level < min_level:
            raise AppException(ErrorCode.PAGE_NOT_FOUND, "知识不存在")
        return resolved

    def resolve_access(self, user_id: int, page: Page) -> ResolvedAccess:
        if page.user_id == user_id:
            return ResolvedAccess(level=PermissionLevel.OWNER)

        if self.is_publicly_accessible(page):
            return ResolvedAccess(
                level=PermissionLevel.VIEW,
                via=PageAccessVia(type="public", code="", name="公开链接"),
            )

        best = ResolvedAccess(level=PermissionLevel.NONE)
        for ancestor in self._collect_access_chain_pages(page):
            direct = self._get_direct_permission(user_id, ancestor.id)
            community_access = self._get_best_community_permission(user_id, ancestor.id)
            for candidate in (direct, community_access):
                if candidate.level > best.level:
                    best = candidate
                elif (
                    candidate.level == best.level
                    and candidate.via is not None
                    and best.via is None
                ):
                    best = candidate

        if best.level == PermissionLevel.NONE:
            return ResolvedAccess(level=PermissionLevel.NONE)

        return best

    def build_access_info(self, user_id: int, page: Page) -> PageAccessInfo:
        resolved = self.resolve_access(user_id, page)
        owner = self._get_user(page.user_id)
        return PageAccessInfo(
            level=self._level_name(resolved.level),
            owner_code=owner.code,
            owner_name=owner.name,
            via=resolved.via,
        )

    def list_shared_pages(self, user_id: int) -> list[SharedPageSummary]:
        community_ids = self.get_community_ids(user_id)
        query = self.db.query(PagePermission, Page).join(
            Page,
            Page.id == PagePermission.page_id,
        ).filter(
            PagePermission.deleted.is_(False),
            Page.deleted.is_(False),
            Page.user_id != user_id,
        )

        filters = [PagePermission.grantee_type == GRANTEE_USER, PagePermission.grantee_id == user_id]
        if community_ids:
            filters.append(
                (PagePermission.grantee_type == GRANTEE_COMMUNITY)
                & (PagePermission.grantee_id.in_(community_ids))
            )

        from sqlalchemy import or_

        rows = query.filter(or_(*filters)).order_by(Page.updated_at.desc()).all()

        owner_ids = {page.user_id for _, page in rows}
        owners = {
            user.id: user
            for user in self.db.query(User)
            .filter(User.id.in_(owner_ids), User.deleted.is_(False))
            .all()
        } if owner_ids else {}

        community_id_set = {
            perm.grantee_id
            for perm, _ in rows
            if perm.grantee_type == GRANTEE_COMMUNITY
        }
        communities = {
            item.id: item
            for item in self.db.query(Community)
            .filter(Community.id.in_(community_id_set), Community.deleted.is_(False))
            .all()
        } if community_id_set else {}

        merged: dict[int, tuple[Page, PermissionLevel, PageAccessVia | None]] = {}
        for perm, page in rows:
            level = permission_from_db(perm.permission)
            via: PageAccessVia | None = None
            if perm.grantee_type == GRANTEE_USER:
                via = PageAccessVia(type="user", code="", name="直接共享")
            elif perm.grantee_type == GRANTEE_COMMUNITY:
                community = communities.get(perm.grantee_id)
                if community:
                    via = PageAccessVia(
                        type="community",
                        code=community.code,
                        name=community.name,
                    )

            existing = merged.get(page.id)
            if existing is None or level > existing[1]:
                merged[page.id] = (page, level, via)
            elif existing is not None and level == existing[1] and via and existing[2] is None:
                merged[page.id] = (page, level, via)

        merged = self.expand_permission_entries(merged)

        code_by_id = self._owned_relation_codes(
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
                    permission=self._level_name(level),
                    owner_code=owner.code,
                    owner_name=owner.name,
                    via=via,
                    depth=self._get_shared_depth(page),
                )
            )

        result.sort(key=lambda item: item.updated_at, reverse=True)
        return result

    def can_access_page_asset(self, user_id: int | None, page_id: int | None) -> bool:
        if page_id is None:
            return False
        page = (
            self.db.query(Page)
            .filter(Page.id == page_id, Page.deleted.is_(False))
            .first()
        )
        if not page:
            return False
        if self.is_publicly_accessible(page):
            return True
        if user_id is None:
            return False
        return self.resolve_access(user_id, page).level >= PermissionLevel.VIEW

    def is_publicly_accessible(self, page: Page) -> bool:
        """公开仅本页 + 目录 parent 祖先；不沿 container 穿透。"""
        if page.is_public:
            return True
        for ancestor in self._collect_parent_ancestor_pages(page):
            if ancestor.is_public:
                return True
        return False

    def _get_direct_permission(self, user_id: int, page_id: int) -> ResolvedAccess:
        perm = (
            self.db.query(PagePermission)
            .filter(
                PagePermission.page_id == page_id,
                PagePermission.grantee_type == GRANTEE_USER,
                PagePermission.grantee_id == user_id,
                PagePermission.deleted.is_(False),
            )
            .first()
        )
        if not perm:
            return ResolvedAccess(level=PermissionLevel.NONE)
        return ResolvedAccess(
            level=permission_from_db(perm.permission),
            via=PageAccessVia(type="user", code="", name="直接共享"),
        )

    def _get_best_community_permission(self, user_id: int, page_id: int) -> ResolvedAccess:
        community_ids = self.get_community_ids(user_id)
        if not community_ids:
            return ResolvedAccess(level=PermissionLevel.NONE)

        perms = (
            self.db.query(PagePermission)
            .filter(
                PagePermission.page_id == page_id,
                PagePermission.grantee_type == GRANTEE_COMMUNITY,
                PagePermission.grantee_id.in_(community_ids),
                PagePermission.deleted.is_(False),
            )
            .all()
        )
        if not perms:
            return ResolvedAccess(level=PermissionLevel.NONE)

        community_id_set = {perm.grantee_id for perm in perms}
        communities = {
            item.id: item
            for item in self.db.query(Community)
            .filter(Community.id.in_(community_id_set), Community.deleted.is_(False))
            .all()
        }

        best_level = PermissionLevel.NONE
        best_via: PageAccessVia | None = None
        for perm in perms:
            level = permission_from_db(perm.permission)
            community = communities.get(perm.grantee_id)
            via = (
                PageAccessVia(
                    type="community",
                    code=community.code,
                    name=community.name,
                )
                if community
                else None
            )
            if level > best_level:
                best_level = level
                best_via = via

        return ResolvedAccess(level=best_level, via=best_via)

    def expand_permission_entries(
        self,
        entries: dict[int, tuple[Page, PermissionLevel, PageAccessVia | None]],
    ) -> dict[int, tuple[Page, PermissionLevel, PageAccessVia | None]]:
        expanded = dict(entries)
        for page, level, via in entries.values():
            descendants = [
                *self._collect_parent_descendant_pages(page.id, page.user_id),
                *self._collect_container_descendant_pages(page.id, page.user_id),
            ]
            for descendant in descendants:
                existing = expanded.get(descendant.id)
                if existing is None or level > existing[1]:
                    expanded[descendant.id] = (descendant, level, via)
                elif (
                    existing is not None
                    and level == existing[1]
                    and via
                    and existing[2] is None
                ):
                    expanded[descendant.id] = (descendant, level, via)
        return expanded

    def _collect_access_chain_pages(self, page: Page) -> list[Page]:
        """鉴权链：本页 → container 向上 → 再沿 parent 向上。"""
        chain: list[Page] = []
        seen: set[int] = set()
        current: Page | None = page

        while current is not None:
            if current.id in seen:
                break
            seen.add(current.id)
            chain.append(current)
            if not current.container_page_id:
                break
            current = (
                self.db.query(Page)
                .filter(
                    Page.id == current.container_page_id,
                    Page.deleted.is_(False),
                )
                .first()
            )

        landing = chain[-1]
        current_id = landing.parent_id
        while current_id:
            if current_id in seen:
                break
            parent = (
                self.db.query(Page)
                .filter(
                    Page.id == current_id,
                    Page.deleted.is_(False),
                )
                .first()
            )
            if not parent:
                break
            seen.add(parent.id)
            chain.append(parent)
            current_id = parent.parent_id

        return chain

    def _collect_parent_ancestor_pages(self, page: Page) -> list[Page]:
        """不含自身的目录 parent 祖先。"""
        chain: list[Page] = []
        current = page
        while current.parent_id:
            parent = (
                self.db.query(Page)
                .filter(
                    Page.id == current.parent_id,
                    Page.deleted.is_(False),
                )
                .first()
            )
            if not parent:
                break
            chain.append(parent)
            current = parent
        return chain

    def _collect_parent_descendant_pages(self, page_id: int, owner_id: int) -> list[Page]:
        children = (
            self.db.query(Page)
            .filter(
                Page.user_id == owner_id,
                Page.parent_id == page_id,
                Page.container_page_id.is_(None),
                Page.deleted.is_(False),
            )
            .order_by(Page.sort_order.asc(), Page.created_at.asc())
            .all()
        )
        result: list[Page] = []
        for child in children:
            result.append(child)
            result.extend(self._collect_parent_descendant_pages(child.id, owner_id))
        return result

    def _collect_container_descendant_pages(
        self, page_id: int, owner_id: int
    ) -> list[Page]:
        children = (
            self.db.query(Page)
            .filter(
                Page.user_id == owner_id,
                Page.container_page_id == page_id,
                Page.deleted.is_(False),
            )
            .all()
        )
        result: list[Page] = []
        for child in children:
            result.append(child)
            result.extend(
                self._collect_container_descendant_pages(child.id, owner_id)
            )
        return result

    def _owned_relation_codes(self, pages: dict[int, Page]) -> dict[int, str]:
        related_ids = {
            *(page.parent_id for page in pages.values() if page.parent_id),
            *(
                page.container_page_id
                for page in pages.values()
                if page.container_page_id
            ),
        }
        if not related_ids:
            return {}
        rows = (
            self.db.query(Page.id, Page.code)
            .filter(Page.id.in_(related_ids), Page.deleted.is_(False))
            .all()
        )
        return {row.id: row.code for row in rows}

    def _get_shared_depth(self, page: Page) -> int:
        if page.container_page_id:
            return self._get_container_depth(page)
        return self._get_page_depth(page)

    def _get_container_depth(self, page: Page) -> int:
        if not page.container_page_id:
            return 0
        depth = 1
        current_id = page.container_page_id
        while current_id:
            row = (
                self.db.query(Page.container_page_id)
                .filter(Page.id == current_id, Page.deleted.is_(False))
                .first()
            )
            if not row:
                break
            if not row.container_page_id:
                break
            depth += 1
            current_id = row.container_page_id
        return depth

    def _get_page_depth(self, page: Page) -> int:
        depth = 1
        current_id = page.id
        owner_id = page.user_id
        while True:
            row = (
                self.db.query(Page.parent_id)
                .filter(
                    Page.id == current_id,
                    Page.user_id == owner_id,
                    Page.deleted.is_(False),
                )
                .first()
            )
            if not row or not row.parent_id:
                break
            depth += 1
            current_id = row.parent_id
        return depth

    def _get_user(self, user_id: int) -> User:
        user = (
            self.db.query(User)
            .filter(User.id == user_id, User.deleted.is_(False))
            .first()
        )
        if not user:
            raise AppException(ErrorCode.NOT_FOUND, "用户不存在")
        return user

    @staticmethod
    def _level_name(level: PermissionLevel) -> str:
        if level == PermissionLevel.OWNER:
            return "owner"
        if level == PermissionLevel.EDIT:
            return PERMISSION_EDIT
        if level == PermissionLevel.VIEW:
            return PERMISSION_VIEW
        return "none"

    @staticmethod
    def _format_dt(value: datetime) -> str:
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()
