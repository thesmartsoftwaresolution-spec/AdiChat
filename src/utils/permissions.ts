import type { AppRole, ConversationMember, UserStatus } from '../types/database';

export function hasAdminAccess(roles: AppRole[]): boolean {
  return roles.includes('admin') || roles.includes('super_admin');
}

export function isSuperAdmin(roles: AppRole[]): boolean {
  return roles.includes('super_admin');
}

export function canAccountAccessProtectedApp(status: UserStatus | undefined): boolean {
  return status === 'active';
}

export function isConversationMember(
  members: ConversationMember[],
  conversationId: string,
  userId: string
): boolean {
  return members.some((m) => m.conversation_id === conversationId && m.user_id === userId);
}

export function isGroupAdmin(
  members: ConversationMember[],
  conversationId: string,
  userId: string
): boolean {
  return members.some(
    (m) =>
      m.conversation_id === conversationId &&
      m.user_id === userId &&
      m.member_role === 'admin'
  );
}

export function canRemoveGroupMember(
  members: ConversationMember[],
  conversationId: string,
  actorUserId: string,
  targetUserId: string,
  actorHasPlatformAdmin = false
): { allowed: boolean; reason?: string } {
  const groupMembers = members.filter((m) => m.conversation_id === conversationId);
  const target = groupMembers.find((m) => m.user_id === targetUserId);
  if (!target) {
    return { allowed: false, reason: 'Member does not belong to this group.' };
  }

  const isSelf = actorUserId === targetUserId;
  const actorIsAdmin = isGroupAdmin(members, conversationId, actorUserId) || actorHasPlatformAdmin;

  if (!isSelf && !actorIsAdmin) {
    return { allowed: false, reason: 'Only group admins can remove other members.' };
  }

  const adminCount = groupMembers.filter((m) => m.member_role === 'admin').length;
  if (
    !actorHasPlatformAdmin &&
    target.member_role === 'admin' &&
    adminCount <= 1 &&
    groupMembers.length > 1
  ) {
    return {
      allowed: false,
      reason: 'Promote another member to Group Admin before removing the last admin.',
    };
  }

  return { allowed: true };
}
