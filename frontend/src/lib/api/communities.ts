import type { SharedPageDto } from './pages';
import { apiRequest } from './client';

export type CommunitySummaryDto = {
  code: string;
  name: string;
  description: string | null;
  is_public: boolean;
  owner_code: string;
  owner_name: string;
  member_count: number;
  my_role: string | null;
  my_application_status: string | null;
  created_at: string;
};

export type CommunityMemberDto = {
  user_code: string;
  name: string;
  email: string;
  role: string;
  joined_at: string;
};

export type CommunityDetailDto = CommunitySummaryDto & {
  members: CommunityMemberDto[];
};

export type InvitationDto = {
  code: string;
  invitee_email: string;
  status: string;
  expires_at: string;
  invite_link: string;
  community_code?: string;
  community_name?: string;
  inviter_name?: string;
};

export type JoinApplicationDto = {
  code: string;
  status: string;
  message: string | null;
  applicant_code: string;
  applicant_name: string;
  applicant_email: string;
  community_code?: string;
  community_name?: string;
  created_at: string;
  reviewed_at: string | null;
};

export async function fetchCommunities(options?: { signal?: AbortSignal }) {
  return apiRequest<CommunitySummaryDto[]>('/communities', options);
}

export async function fetchPublicCommunities(options?: { signal?: AbortSignal }) {
  return apiRequest<CommunitySummaryDto[]>('/communities/public', options);
}

export async function fetchCommunity(code: string) {
  return apiRequest<CommunityDetailDto>(`/communities/${code}`);
}

export async function fetchCommunityMembers(code: string) {
  return apiRequest<CommunityMemberDto[]>(`/communities/${code}/members`);
}

export async function createCommunity(input: {
  name: string;
  description?: string | null;
  is_public?: boolean;
}) {
  return apiRequest<CommunitySummaryDto>('/communities', {
    method: 'POST',
    body: input,
  });
}

export async function updateCommunity(
  code: string,
  input: {
    name?: string;
    description?: string | null;
    is_public?: boolean;
  }
) {
  return apiRequest<CommunitySummaryDto>(`/communities/${code}`, {
    method: 'PATCH',
    body: input,
  });
}

export async function deleteCommunity(code: string) {
  await apiRequest<null>(`/communities/${code}`, { method: 'DELETE' });
}

export async function removeMember(communityCode: string, userCode: string) {
  await apiRequest<null>(`/communities/${communityCode}/members/${userCode}`, {
    method: 'DELETE',
  });
}

export async function updateMemberRole(
  communityCode: string,
  userCode: string,
  role: 'admin' | 'member'
) {
  await apiRequest<null>(`/communities/${communityCode}/members/${userCode}`, {
    method: 'PATCH',
    body: { role },
  });
}

export async function createInvitation(communityCode: string, email: string) {
  return apiRequest<InvitationDto>(`/communities/${communityCode}/invitations`, {
    method: 'POST',
    body: { email },
  });
}

export async function fetchInvitations(communityCode: string) {
  return apiRequest<InvitationDto[]>(`/communities/${communityCode}/invitations`);
}

export async function revokeInvitation(communityCode: string, inviteCode: string) {
  await apiRequest<null>(`/communities/${communityCode}/invitations/${inviteCode}`, {
    method: 'DELETE',
  });
}

export async function applyToJoinCommunity(
  communityCode: string,
  message?: string | null
) {
  return apiRequest<JoinApplicationDto>(`/communities/${communityCode}/applications`, {
    method: 'POST',
    body: { message: message ?? null },
  });
}

export async function fetchJoinApplications(communityCode: string) {
  return apiRequest<JoinApplicationDto[]>(`/communities/${communityCode}/applications`);
}

export async function approveJoinApplication(
  communityCode: string,
  applicationCode: string
) {
  return apiRequest<JoinApplicationDto>(
    `/communities/${communityCode}/applications/${applicationCode}/approve`,
    { method: 'POST' }
  );
}

export async function rejectJoinApplication(
  communityCode: string,
  applicationCode: string
) {
  return apiRequest<JoinApplicationDto>(
    `/communities/${communityCode}/applications/${applicationCode}/reject`,
    { method: 'POST' }
  );
}

export async function fetchMyInvitations() {
  return apiRequest<InvitationDto[]>('/invitations/mine');
}

export async function fetchInvitationPreview(inviteCode: string, token: string) {
  return apiRequest<InvitationDto>(
    `/invitations/${inviteCode}?token=${encodeURIComponent(token)}`,
    { auth: false }
  );
}

export async function acceptInvitation(inviteCode: string, token?: string) {
  return apiRequest<CommunitySummaryDto>('/invitations/accept', {
    method: 'POST',
    body: { invite_code: inviteCode, token: token ?? null },
  });
}

export async function fetchCommunitySharedPages(communityCode: string) {
  return apiRequest<SharedPageDto[]>(`/communities/${communityCode}/shared-pages`);
}
