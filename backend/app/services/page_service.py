from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.core.error_codes import ErrorCode
from app.core.exceptions import AppException
from app.models.page import Page
from app.models.user import User
from app.schemas.access import PageAccessInfo, PageAccessVia
from app.schemas.page import (
    PageCreateRequest,
    PageMoveRequest,
    PageResponse,
    PageSummary,
    PageTreeNode,
    PageUpdateRequest,
)
from app.schemas.public_page import PagePublicSettings, PublicPageResponse

MAX_PAGE_DEPTH = 3
MAX_CONTAINER_DEPTH = 32


from app.core.permissions import PermissionLevel
from app.models.asset import Asset
from app.services.community_service import PagePermissionService
from app.services.page_access_service import PageAccessService


class PageService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.access = PageAccessService(db)
        self.permissions = PagePermissionService(db)

    def list_tree(self, user_id: int) -> list[PageTreeNode]:
        pages = self._list_user_pages(user_id)
        code_by_id = {page.id: page.code for page in pages}
        return self._build_tree(pages, code_by_id, parent_id=None)

    def list_pages(self, user_id: int) -> list[PageSummary]:
        pages = self._list_user_pages(user_id)
        code_by_id = {page.id: page.code for page in pages}
        return [self._to_summary(page, code_by_id) for page in pages]

    def list_shared_pages(self, user_id: int):
        return self.access.list_shared_pages(user_id)

    def list_permissions(self, user_id: int, page_code: str):
        return self.permissions.list_permissions(user_id, page_code)

    def upsert_permission(
        self,
        user_id: int,
        page_code: str,
        *,
        grantee_type: str,
        grantee_code: str,
        permission: str,
    ):
        return self.permissions.upsert_permission(
            user_id,
            page_code,
            grantee_type=grantee_type,
            grantee_code=grantee_code,
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
        self.permissions.revoke_permission(
            user_id,
            page_code,
            grantee_type=grantee_type,
            grantee_code=grantee_code,
        )

    def get_page(self, user_id: int, code: str) -> PageResponse:
        return self._build_page_response(user_id, code)

    def get_page_for_viewer(
        self,
        user_id: int | None,
        code: str,
    ) -> PageResponse:
        return self._build_page_response(user_id, code)

    def _build_page_response(
        self,
        user_id: int | None,
        code: str,
    ) -> PageResponse:
        page = self.access.get_page_by_code(code)
        if not page:
            raise AppException(ErrorCode.PAGE_NOT_FOUND, "知识不存在")

        if user_id is None:
            if not self.access.is_publicly_accessible(page):
                raise AppException(ErrorCode.PAGE_NOT_FOUND, "知识不存在")
        else:
            self.access.require_page_access(
                user_id,
                page,
                min_level=PermissionLevel.VIEW,
            )

        if user_id is not None and page.user_id == user_id:
            code_by_id = self._code_map_for_user(user_id)
        else:
            code_by_id = self._relation_code_map_for_page(page)

        response = self._to_response(page, code_by_id)
        if user_id is None:
            owner = (
                self.db.query(User)
                .filter(User.id == page.user_id, User.deleted.is_(False))
                .first()
            )
            response.access = PageAccessInfo(
                level="view",
                owner_code=owner.code if owner else "",
                owner_name=owner.name if owner else "",
                via=PageAccessVia(type="public", code="", name="公开链接"),
            )
        else:
            response.access = self.access.build_access_info(user_id, page)
        return response

    def get_public_page(self, code: str) -> PublicPageResponse:
        page = self.access.get_page_by_code(code)
        # 本页公开，或目录父级公开时子页可经 /public 访问
        if not page or not self.access.is_publicly_accessible(page):
            raise AppException(ErrorCode.PAGE_NOT_FOUND, "知识不存在")

        owner = (
            self.db.query(User)
            .filter(User.id == page.user_id, User.deleted.is_(False))
            .first()
        )
        return PublicPageResponse(
            code=page.code,
            title=page.title,
            icon=page.icon,
            cover_color=page.cover_color,
            content=page.content,
            owner_name=owner.name if owner else None,
            updated_at=self._format_dt(page.updated_at) if page.updated_at else None,
        )

    def get_public_page_tree(self, code: str) -> list[PageTreeNode]:
        """公开页侧栏目录：以最近公开根为根，含其目录子树（不含内页）。"""
        page = self.access.get_page_by_code(code)
        if not page or not self.access.is_publicly_accessible(page):
            raise AppException(ErrorCode.PAGE_NOT_FOUND, "知识不存在")

        root = self._find_public_directory_root(page)
        pages: list[Page] = [root]
        if root.container_page_id is None:
            pages.extend(
                self.access._collect_parent_descendant_pages(root.id, root.user_id)
            )

        pages.sort(key=lambda item: (item.sort_order, item.id))
        code_by_id = {item.id: item.code for item in pages}
        return [
            PageTreeNode(
                **self._to_summary(root, code_by_id).model_dump(),
                children=self._build_tree(pages, code_by_id, parent_id=root.id),
            )
        ]

    def _find_public_directory_root(self, page: Page) -> Page:
        """向上找到最高层公开目录祖先；若无则为本页。"""
        root = page
        for ancestor in self.access._collect_parent_ancestor_pages(page):
            if ancestor.is_public:
                root = ancestor
        return root

    def get_public_settings(self, user_id: int, code: str) -> PagePublicSettings:
        page = self._get_user_page_by_code(user_id, code)
        inherited = (not page.is_public) and self.access.is_publicly_accessible(
            page
        )
        return PagePublicSettings(
            is_public=page.is_public,
            inherited_public=inherited,
        )

    def update_public_settings(
        self,
        user_id: int,
        code: str,
        *,
        is_public: bool,
    ) -> PagePublicSettings:
        page = self._get_user_page_by_code(user_id, code)
        page.is_public = is_public
        self.db.commit()
        self.db.refresh(page)
        return PagePublicSettings(
            is_public=page.is_public,
            inherited_public=(not page.is_public)
            and self.access.is_publicly_accessible(page),
        )

    def create_page(self, user_id: int, body: PageCreateRequest) -> PageResponse:
        parent_id: int | None = None
        container_id: int | None = None
        owner_id = user_id

        if body.parent_code and body.container_code:
            raise AppException(
                ErrorCode.PAGE_CONTAINER_INVALID,
                "parent_code 与 container_code 不能同时指定",
            )

        if body.parent_code:
            parent = self.access.get_page_by_code(body.parent_code)
            if not parent:
                raise AppException(ErrorCode.PAGE_NOT_FOUND, "知识不存在")
            if parent.container_page_id is not None:
                raise AppException(
                    ErrorCode.PAGE_CONTAINER_INVALID,
                    "内页不能作为目录父知识，请使用 container_code",
                )

            if parent.user_id == user_id:
                if self._get_depth(parent.id, user_id) >= MAX_PAGE_DEPTH:
                    raise AppException(ErrorCode.PAGE_DEPTH_EXCEEDED, "知识层级超出限制")
            else:
                self.access.require_page_access(
                    user_id,
                    parent,
                    min_level=PermissionLevel.EDIT,
                )
                if self._get_depth(parent.id, parent.user_id) >= MAX_PAGE_DEPTH:
                    raise AppException(ErrorCode.PAGE_DEPTH_EXCEEDED, "知识层级超出限制")
                owner_id = parent.user_id

            parent_id = parent.id

        if body.container_code:
            container = self.access.get_page_by_code(body.container_code)
            if not container:
                raise AppException(ErrorCode.PAGE_NOT_FOUND, "知识不存在")

            if container.user_id == user_id:
                new_level = self._get_container_nesting_level(container) + 1
                if new_level > MAX_CONTAINER_DEPTH:
                    raise AppException(
                        ErrorCode.PAGE_DEPTH_EXCEEDED,
                        "内页嵌套层级超出限制",
                    )
            else:
                self.access.require_page_access(
                    user_id,
                    container,
                    min_level=PermissionLevel.EDIT,
                )
                new_level = self._get_container_nesting_level(container) + 1
                if new_level > MAX_CONTAINER_DEPTH:
                    raise AppException(
                        ErrorCode.PAGE_DEPTH_EXCEEDED,
                        "内页嵌套层级超出限制",
                    )
                owner_id = container.user_id

            container_id = container.id

        if container_id is not None:
            sort_order = self._next_container_sort_order(owner_id, container_id)
        else:
            sort_order = self._next_sort_order(owner_id, parent_id)

        page = Page(
            code=Page.generate_code(),
            user_id=owner_id,
            parent_id=parent_id,
            container_page_id=container_id,
            title=body.title.strip() or "无标题",
            icon=body.icon,
            content=[],
            sort_order=sort_order,
        )
        self.db.add(page)
        self.db.commit()
        self.db.refresh(page)

        if page.user_id == user_id:
            code_by_id = self._code_map_for_user(user_id)
        else:
            code_by_id = self._relation_code_map_for_page(page)

        response = self._to_response(page, code_by_id)
        response.access = self.access.build_access_info(user_id, page)
        return response

    def update_page(
        self,
        user_id: int,
        code: str,
        body: PageUpdateRequest,
    ) -> PageResponse:
        page = self.access.get_page_by_code(code)
        if not page:
            raise AppException(ErrorCode.PAGE_NOT_FOUND, "知识不存在")

        self.access.require_page_access(user_id, page, min_level=PermissionLevel.EDIT)

        if body.version != page.version:
            raise AppException(
                ErrorCode.PAGE_VERSION_CONFLICT,
                "知识已被其他客户端修改，请刷新后重试",
            )

        changed = False
        updates = body.model_dump(exclude_unset=True)

        if "title" in updates and updates["title"] is not None:
            next_title = str(updates["title"]).strip() or "无标题"
            if page.title != next_title:
                page.title = next_title
                changed = True
        if "icon" in updates and page.icon != updates["icon"]:
            page.icon = updates["icon"]
            changed = True
        if "cover_color" in updates and page.cover_color != updates["cover_color"]:
            page.cover_color = updates["cover_color"] or None
            changed = True
        if "content" in updates and updates["content"] is not None:
            if page.content != updates["content"]:
                page.content = updates["content"]
                changed = True

        if changed:
            page.version += 1

        self.db.commit()
        self.db.refresh(page)

        if page.user_id == user_id:
            code_by_id = self._code_map_for_user(user_id)
        else:
            code_by_id = {}

        response = self._to_response(page, code_by_id)
        response.access = self.access.build_access_info(user_id, page)
        return response

    def delete_page(self, user_id: int, code: str) -> None:
        page = self._get_user_page_by_code(user_id, code)
        ids_to_delete = self._collect_delete_closure_ids(page.id, user_id)

        (
            self.db.query(Page)
            .filter(Page.id.in_(ids_to_delete), Page.user_id == user_id)
            .update({Page.deleted: True}, synchronize_session=False)
        )
        (
            self.db.query(Asset)
            .filter(Asset.page_id.in_(ids_to_delete), Asset.deleted.is_(False))
            .update({Asset.deleted: True}, synchronize_session=False)
        )
        self.db.commit()

    def move_page(
        self,
        user_id: int,
        code: str,
        body: PageMoveRequest,
    ) -> PageResponse:
        page = self._get_user_page_by_code(user_id, code)
        target = self._get_user_page_by_code(user_id, body.target_code)

        if page.container_page_id is not None:
            raise AppException(ErrorCode.PAGE_MOVE_INVALID, "内页不能移动到目录树")
        if target.container_page_id is not None:
            raise AppException(ErrorCode.PAGE_MOVE_INVALID, "不能移动到内页")

        if page.id == target.id:
            raise AppException(ErrorCode.PAGE_MOVE_INVALID, "不能移动到自身")

        if body.position == "inside":
            new_parent_id = target.id
            if self._is_descendant(page.id, target.id, user_id):
                raise AppException(ErrorCode.PAGE_MOVE_INVALID, "不能移动到子知识内")
            target_index = self._count_children(target.id, user_id)
        else:
            new_parent_id = target.parent_id
            siblings_with_target = self._get_siblings(user_id, new_parent_id)
            target_index = next(
                (index for index, item in enumerate(siblings_with_target) if item.id == target.id),
                -1,
            )
            if target_index < 0:
                raise AppException(ErrorCode.PAGE_MOVE_INVALID, "目标位置无效")
            if body.position == "after":
                target_index += 1

        new_parent_depth = (
            0 if new_parent_id is None else self._get_depth(new_parent_id, user_id)
        )
        page_depth = self._get_depth(page.id, user_id)
        subtree_height = self._get_max_subtree_depth(page.id, user_id) - page_depth
        if new_parent_depth + 1 + subtree_height > MAX_PAGE_DEPTH:
            raise AppException(ErrorCode.PAGE_DEPTH_EXCEEDED, "知识层级超出限制")

        old_parent_id = page.parent_id
        old_siblings = self._get_siblings(user_id, old_parent_id, exclude_id=page.id)
        for index, sibling in enumerate(old_siblings):
            sibling.sort_order = index

        new_siblings = self._get_siblings(user_id, new_parent_id, exclude_id=page.id)
        target_index = min(max(0, target_index), len(new_siblings))
        new_siblings.insert(target_index, page)
        for index, sibling in enumerate(new_siblings):
            sibling.sort_order = index

        page.parent_id = new_parent_id
        self.db.commit()
        self.db.refresh(page)

        code_by_id = self._code_map_for_user(user_id)
        return self._to_response(page, code_by_id)

    def _list_user_pages(self, user_id: int) -> list[Page]:
        """目录树用页面：排除内页。"""
        return (
            self.db.query(Page)
            .filter(
                Page.user_id == user_id,
                Page.deleted.is_(False),
                Page.container_page_id.is_(None),
            )
            .order_by(Page.sort_order.asc(), Page.created_at.asc())
            .all()
        )

    def _get_user_page_by_code(self, user_id: int, code: str) -> Page:
        page = (
            self.db.query(Page)
            .filter(
                Page.user_id == user_id,
                Page.code == code,
                Page.deleted.is_(False),
            )
            .first()
        )
        if not page:
            raise AppException(ErrorCode.PAGE_NOT_FOUND, "知识不存在")
        return page

    def _code_map_for_user(self, user_id: int) -> dict[int, str]:
        rows = (
            self.db.query(Page.id, Page.code)
            .filter(Page.user_id == user_id, Page.deleted.is_(False))
            .all()
        )
        return {row.id: row.code for row in rows}

    def _relation_code_map_for_page(self, page: Page) -> dict[int, str]:
        ids = {
            *( [page.parent_id] if page.parent_id else []),
            *( [page.container_page_id] if page.container_page_id else []),
        }
        if not ids:
            return {}
        rows = (
            self.db.query(Page.id, Page.code)
            .filter(Page.id.in_(ids), Page.deleted.is_(False))
            .all()
        )
        return {row.id: row.code for row in rows}

    def _get_siblings(
        self,
        user_id: int,
        parent_id: int | None,
        *,
        exclude_id: int | None = None,
    ) -> list[Page]:
        query = self.db.query(Page).filter(
            Page.user_id == user_id,
            Page.deleted.is_(False),
            Page.container_page_id.is_(None),
        )
        if parent_id is None:
            query = query.filter(Page.parent_id.is_(None))
        else:
            query = query.filter(Page.parent_id == parent_id)

        if exclude_id is not None:
            query = query.filter(Page.id != exclude_id)

        return query.order_by(Page.sort_order.asc(), Page.created_at.asc()).all()

    def _next_sort_order(self, user_id: int, parent_id: int | None) -> int:
        return self._count_children(parent_id, user_id) if parent_id else self._count_roots(user_id)

    def _next_container_sort_order(self, user_id: int, container_id: int) -> int:
        return (
            self.db.query(Page)
            .filter(
                Page.user_id == user_id,
                Page.container_page_id == container_id,
                Page.deleted.is_(False),
            )
            .count()
        )

    def _count_roots(self, user_id: int) -> int:
        return (
            self.db.query(Page)
            .filter(
                Page.user_id == user_id,
                Page.parent_id.is_(None),
                Page.container_page_id.is_(None),
                Page.deleted.is_(False),
            )
            .count()
        )

    def _count_children(self, parent_id: int, user_id: int) -> int:
        return (
            self.db.query(Page)
            .filter(
                Page.user_id == user_id,
                Page.parent_id == parent_id,
                Page.container_page_id.is_(None),
                Page.deleted.is_(False),
            )
            .count()
        )

    def _collect_delete_closure_ids(self, page_id: int, user_id: int) -> list[int]:
        """目录 parent 子孙 ∪ 每页的 container 子孙（含自身）。"""
        result: list[int] = []
        seen: set[int] = set()

        def add_with_containers(pid: int) -> None:
            if pid in seen:
                return
            seen.add(pid)
            result.append(pid)
            for cid in self._collect_container_child_ids(pid, user_id):
                add_with_containers(cid)

        add_with_containers(page_id)
        for tree_id in self._collect_parent_descendant_ids(page_id, user_id):
            add_with_containers(tree_id)
        return result

    def _collect_parent_descendant_ids(self, page_id: int, user_id: int) -> list[int]:
        children = (
            self.db.query(Page.id)
            .filter(
                Page.user_id == user_id,
                Page.parent_id == page_id,
                Page.container_page_id.is_(None),
                Page.deleted.is_(False),
            )
            .all()
        )
        result: list[int] = []
        for (child_id,) in children:
            result.append(child_id)
            result.extend(self._collect_parent_descendant_ids(child_id, user_id))
        return result

    def _collect_container_child_ids(self, page_id: int, user_id: int) -> list[int]:
        children = (
            self.db.query(Page.id)
            .filter(
                Page.user_id == user_id,
                Page.container_page_id == page_id,
                Page.deleted.is_(False),
            )
            .all()
        )
        result: list[int] = []
        for (child_id,) in children:
            result.append(child_id)
            result.extend(self._collect_container_child_ids(child_id, user_id))
        return result

    def _get_container_nesting_level(self, page: Page) -> int:
        """内页嵌套层数；目录页为 0。"""
        if not page.container_page_id:
            return 0
        depth = 1
        current_id = page.container_page_id
        while current_id:
            row = (
                self.db.query(Page.container_page_id)
                .filter(
                    Page.id == current_id,
                    Page.deleted.is_(False),
                )
                .first()
            )
            if not row:
                break
            if not row.container_page_id:
                break
            depth += 1
            if depth >= MAX_CONTAINER_DEPTH:
                break
            current_id = row.container_page_id
        return depth

    def _get_depth(self, page_id: int, user_id: int) -> int:
        depth = 1
        current_id = page_id
        while True:
            row = (
                self.db.query(Page.parent_id)
                .filter(
                    Page.id == current_id,
                    Page.user_id == user_id,
                    Page.deleted.is_(False),
                )
                .first()
            )
            if not row or not row.parent_id:
                break
            depth += 1
            current_id = row.parent_id
        return depth

    def _get_max_subtree_depth(self, page_id: int, user_id: int) -> int:
        max_depth = self._get_depth(page_id, user_id)
        children = (
            self.db.query(Page.id)
            .filter(
                Page.user_id == user_id,
                Page.parent_id == page_id,
                Page.container_page_id.is_(None),
                Page.deleted.is_(False),
            )
            .all()
        )
        for (child_id,) in children:
            max_depth = max(max_depth, self._get_max_subtree_depth(child_id, user_id))
        return max_depth

    def _is_descendant(self, ancestor_id: int, page_id: int, user_id: int) -> bool:
        current_id = page_id
        while current_id:
            row = (
                self.db.query(Page)
                .filter(
                    Page.id == current_id,
                    Page.user_id == user_id,
                    Page.deleted.is_(False),
                )
                .first()
            )
            if not row or not row.parent_id:
                break
            if row.parent_id == ancestor_id:
                return True
            current_id = row.parent_id
        return False

    def _build_tree(
        self,
        pages: list[Page],
        code_by_id: dict[int, str],
        *,
        parent_id: int | None,
    ) -> list[PageTreeNode]:
        children = [page for page in pages if page.parent_id == parent_id]
        return [
            PageTreeNode(
                **self._to_summary(page, code_by_id).model_dump(),
                children=self._build_tree(pages, code_by_id, parent_id=page.id),
            )
            for page in children
        ]

    def _to_summary(self, page: Page, code_by_id: dict[int, str]) -> PageSummary:
        return PageSummary(
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
        )

    def _to_response(self, page: Page, code_by_id: dict[int, str]) -> PageResponse:
        return PageResponse(
            **self._to_summary(page, code_by_id).model_dump(),
            content=page.content,
        )

    @staticmethod
    def _format_dt(value: datetime) -> str:
        return value.isoformat()
