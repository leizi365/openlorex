from __future__ import annotations

from enum import IntEnum

# 页面 ACL 授权级别（存库）
PERMISSION_VIEW = "view"
PERMISSION_EDIT = "edit"
PERMISSION_VALUES = {PERMISSION_VIEW, PERMISSION_EDIT}

# 社区成员角色
ROLE_OWNER = "owner"
ROLE_ADMIN = "admin"
ROLE_MEMBER = "member"
COMMUNITY_ROLES = {ROLE_OWNER, ROLE_ADMIN, ROLE_MEMBER}
COMMUNITY_ADMIN_ROLES = {ROLE_OWNER, ROLE_ADMIN}

# 邀请状态
INVITE_PENDING = "pending"
INVITE_ACCEPTED = "accepted"
INVITE_EXPIRED = "expired"
INVITE_REVOKED = "revoked"

# 加入申请状态
JOIN_PENDING = "pending"
JOIN_APPROVED = "approved"
JOIN_REJECTED = "rejected"

# grantee 类型
GRANTEE_USER = "user"
GRANTEE_COMMUNITY = "community"


class PermissionLevel(IntEnum):
    NONE = 0
    VIEW = 1
    EDIT = 2
    OWNER = 3


def permission_from_db(value: str) -> PermissionLevel:
    if value == PERMISSION_EDIT:
        return PermissionLevel.EDIT
    if value == PERMISSION_VIEW:
        return PermissionLevel.VIEW
    return PermissionLevel.NONE


def max_permission(*levels: PermissionLevel) -> PermissionLevel:
    return max(levels, default=PermissionLevel.NONE)
