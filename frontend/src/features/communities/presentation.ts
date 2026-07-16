/** Saturated avatar tints — more visible than page cover pastels. */
const COMMUNITY_AVATAR_COLORS = [
  '#FFD4A8',
  '#FFE08A',
  '#B8E986',
  '#9AD4F5',
  '#C4B5FD',
  '#F9A8D4',
  '#FCA5A5',
  '#7DD3FC',
  '#6EE7B7',
  '#FDBA74',
  '#D8B4FE',
  '#FDA4AF',
];

export function getCommunityColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COMMUNITY_AVATAR_COLORS[Math.abs(hash) % COMMUNITY_AVATAR_COLORS.length];
}

export function getCommunityInitial(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return '?';
  }
  return trimmed.slice(0, 1).toUpperCase();
}

const ROLE_LABELS: Record<string, string> = {
  owner: '创建者',
  admin: '管理员',
  member: '成员',
};

export function formatCommunityRole(role: string) {
  return ROLE_LABELS[role] ?? role;
}

export function formatCommunityVisibility(isPublic: boolean) {
  return isPublic ? '开放' : '私密';
}
