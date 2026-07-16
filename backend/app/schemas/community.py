from __future__ import annotations

from pydantic import BaseModel, Field


class CommunityCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=2000)
    is_public: bool = False


class CommunityUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=2000)
    is_public: bool | None = None


class CommunityMemberSummary(BaseModel):
    user_code: str
    name: str
    email: str
    role: str
    joined_at: str


class CommunitySummary(BaseModel):
    code: str
    name: str
    description: str | None = None
    is_public: bool = False
    owner_code: str
    owner_name: str
    member_count: int
    my_role: str | None = None
    my_application_status: str | None = None
    created_at: str


class CommunityDetail(CommunitySummary):
    members: list[CommunityMemberSummary] = Field(default_factory=list)


class InviteCreateRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)


class InvitationResponse(BaseModel):
    code: str
    invitee_email: str
    status: str
    expires_at: str
    invite_link: str
    community_code: str = ""
    community_name: str = ""
    inviter_name: str = ""


class AcceptInvitationRequest(BaseModel):
    invite_code: str
    token: str | None = Field(default=None, min_length=8)


class UpdateMemberRoleRequest(BaseModel):
    role: str = Field(pattern="^(admin|member)$")


class JoinApplicationCreateRequest(BaseModel):
    message: str | None = Field(default=None, max_length=500)


class JoinApplicationResponse(BaseModel):
    code: str
    status: str
    message: str | None = None
    applicant_code: str
    applicant_name: str
    applicant_email: str
    community_code: str = ""
    community_name: str = ""
    created_at: str
    reviewed_at: str | None = None
