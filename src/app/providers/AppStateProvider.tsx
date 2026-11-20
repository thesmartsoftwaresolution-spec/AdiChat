import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { SEED_DATA, type AdiChatStoreState } from '../../data/seed';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabase/client';
import { requestAssistantReply } from '../../services/ai.service';
import type {
  AIAssistant,
  Announcement,
  AppRole,
  AssistantResponseMode,
  AssistantUsage,
  Attachment,
  AuditLog,
  Conversation,
  DeveloperProfile,
  GroupAssistant,
  GroupMetadata,
  Message,
  MessageType,
  ModerationReport,
  Profile,
  ReportStatus,
  ReportTargetType,
  UserSettings,
  UserStatus,
} from '../../types/database';
import { buildDirectPairKey, resolveTriggeredGroupAssistants, shouldRecommendThinkingMode } from '../../utils/chatLogic';
import { canRemoveGroupMember, hasAdminAccess, isGroupAdmin, isSuperAdmin } from '../../utils/permissions';

const STORAGE_KEY = 'adichat_workspace_state_v1';
const IS_DEMO_MODE = import.meta.env.DEV;

function createEmptyProductionState(): AdiChatStoreState {
  return {
    ...SEED_DATA,
    profiles: [],
    userRoles: [],
    userSettings: {},
    conversations: [],
    conversationMembers: [],
    groups: [],
    messages: [],
    attachments: [],
    assistants: [],
    groupAssistants: [],
    assistantUsage: [],
    reports: [],
    developerProfile: {
      id: 1,
      name: '',
      subtitle: '',
      bio: null,
      why_built: null,
      photo_path: null,
      email_url: null,
      whatsapp_url: null,
      github_url: null,
      linkedin_url: null,
      is_visible: false,
      updated_by: null,
      updated_at: new Date(0).toISOString(),
    },
    appSettings: [],
    announcements: [],
    auditLogs: [],
    userBlocks: [],
    currentUserId: null,
  };
}

function loadInitialState(): AdiChatStoreState {
  if (!IS_DEMO_MODE || typeof window === 'undefined') return createEmptyProductionState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AdiChatStoreState;
      if (parsed && Array.isArray(parsed.profiles) && Array.isArray(parsed.conversations)) {
        return {
          ...SEED_DATA,
          ...parsed,
          assistantUsage: Array.isArray(parsed.assistantUsage)
            ? parsed.assistantUsage
            : SEED_DATA.assistantUsage,
        };
      }
    }
  } catch {
    // Ignore storage read errors
  }
  return SEED_DATA;
}

export interface ToastItem {
  id: string;
  message: string;
  tone?: 'info' | 'success' | 'error';
}

interface AppStateContextValue {
  state: AdiChatStoreState;
  currentUser: Profile | null;
  currentUserRoles: AppRole[];
  isAdmin: boolean;
  isSuperAdminUser: boolean;
  isSupabaseConnected: boolean;
  toasts: ToastItem[];
  pushToast: (message: string, tone?: ToastItem['tone']) => void;
  dismissToast: (id: string) => void;
  // Auth
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (fullName: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  quickSignInDemo: (userId?: string) => void;
  logout: () => void;
  // Profile & Settings
  updateMyProfile: (updates: Partial<Pick<Profile, 'full_name' | 'about' | 'title' | 'theme_preference' | 'avatar_path'>>) => void;
  updateMySettings: (updates: Partial<UserSettings>) => void;
  // Direct & Group Messaging
  getOrCreateDirectConversation: (otherUserId: string) => Conversation | null;
  markConversationRead: (conversationId: string) => void;
  sendMessage: (
    conversationId: string,
    body: string,
    options?: {
      type?: MessageType;
      attachment?: Omit<Attachment, 'id' | 'message_id' | 'created_at'>;
      durationMs?: number;
    }
  ) => Promise<{ ok: boolean; error?: string }>;
  toggleReaction: (messageId: string, emoji: string) => void;
  createGroup: (input: {
    name: string;
    description: string;
    memberIds: string[];
    assistantIds: string[];
    onlyAdminsSend?: boolean;
    allowAiAutoRespond?: boolean;
  }) => Conversation | null;
  updateGroupMeta: (
    groupId: string,
    updates: Partial<Pick<GroupMetadata, 'name' | 'description' | 'only_admins_send' | 'allow_ai_auto_respond'>>
  ) => { ok: boolean; error?: string };
  addGroupMembers: (groupId: string, memberIds: string[]) => { ok: boolean; error?: string };
  removeGroupMember: (groupId: string, targetUserId: string) => { ok: boolean; error?: string };
  toggleGroupMute: (conversationId: string) => void;
  toggleBlockUser: (targetUserId: string) => void;
  isUserBlocked: (targetUserId: string) => boolean;
  submitReport: (input: {
    targetType: ReportTargetType;
    targetUserId?: string | null;
    targetMessageId?: string | null;
    targetGroupConversationId?: string | null;
    reason: string;
    details?: string;
  }) => { ok: boolean; error?: string };
  // AI Assistants
  createAssistant: (input: {
    name: string;
    description: string;
    personality: string;
    instructions: string;
    tone: string;
    language: string;
    starter_prompts: string[];
    thinking_enabled_default?: boolean;
  }) => Promise<AIAssistant | null>;
  updateAssistant: (assistantId: string, updates: Partial<AIAssistant>) => void;
  deleteAssistant: (assistantId: string) => void;
  openAssistantConversation: (assistantId: string) => Conversation | null;
  sendAiMessage: (
    assistantId: string,
    prompt: string,
    thinkingMode: boolean
  ) => Promise<{ ok: boolean; error?: string; model?: string; latencyMs?: number }>;
  syncGroupAssistants: (
    groupId: string,
    selections: Array<{ assistantId: string; responseMode: AssistantResponseMode; enabled: boolean }>
  ) => void;
  // Admin Operations
  adminUpdateUserStatus: (userId: string, status: UserStatus, reason?: string) => void;
  adminBulkUpdateUserStatus: (userIds: string[], status: UserStatus, reason?: string) => void;
  adminDeleteUser: (userId: string) => { ok: boolean; error?: string };
  adminSetUserRole: (userId: string, role: AppRole) => { ok: boolean; error?: string };
  adminDeleteGroup: (groupId: string) => void;
  adminToggleAssistant: (assistantId: string, isEnabled: boolean) => void;
  adminDeleteAssistant: (assistantId: string) => void;
  adminResolveReport: (
    reportId: string,
    status: ReportStatus,
    note: string,
    action?: 'none' | 'warn' | 'suspend' | 'ban' | 'delete_message'
  ) => void;
  adminUpdateDeveloperProfile: (updates: Partial<DeveloperProfile>) => void;
  adminUpdateAppSetting: (key: string, value: unknown) => void;
  adminPublishAnnouncement: (input: { title: string; body: string; show_as_banner: boolean }) => void;
  resetDemoWorkspace: () => void;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AdiChatStoreState>(loadInitialState);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    if (!IS_DEMO_MODE) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore storage access errors
      }
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
  }, [state]);

  // Demo-only shortcut: never create a production session from a query parameter.
  useEffect(() => {
    if (!IS_DEMO_MODE || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1' && !state.currentUserId) {
      setState((prev) => ({ ...prev, currentUserId: 'u-adeel' }));
    }
  }, [state.currentUserId]);

  // Restore and synchronize the real Supabase identity; local seed identities are dev-only.
  useEffect(() => {
    const sb = getSupabaseClient();
    if (!sb) return;
    let active = true;

    const hydrateIdentity = async (user: { id: string; email?: string | null } | null) => {
      if (!user) {
        if (active) {
          setState((prev) => ({
            ...prev,
            currentUserId: null,
            profiles: [],
            userRoles: [],
            assistants: [],
            conversations: [],
            conversationMembers: [],
            messages: [],
            assistantUsage: [],
          }));
        }
        return;
      }

      const [profileResult, rolesResult, assistantsResult, conversationsResult] = await Promise.all([
        sb.from('profiles')
          .select('id,full_name,avatar_path,about,title,status,last_seen_at,is_online,theme_preference,created_at,updated_at')
          .eq('id', user.id)
          .maybeSingle(),
        sb.from('user_roles').select('role').eq('user_id', user.id),
        sb.from('ai_assistants').select('*').order('created_at', { ascending: false }),
        sb.from('conversations').select('*').eq('type', 'assistant').order('updated_at', { ascending: false }),
      ]);

      if (!active) return;
      if (profileResult.error || !profileResult.data || rolesResult.error) {
        setState((prev) => ({ ...prev, currentUserId: null }));
        return;
      }

      const assistantConversationRows = conversationsResult.data || [];
      const assistantConversationIds = assistantConversationRows.map((row) => row.id);
      const assistantMessagesResult = assistantConversationIds.length
        ? await sb.from('messages').select('*')
            .in('conversation_id', assistantConversationIds)
            .order('created_at', { ascending: true })
            .limit(500)
        : { data: [], error: null };

      if (!active) return;
      const profile = { ...profileResult.data, email: user.email ?? null } as Profile;
      const roles = (rolesResult.data || []).map((row) => row.role as AppRole);
      setState((prev) => ({
        ...prev,
        currentUserId: user.id,
        profiles: [profile, ...prev.profiles.filter((item) => item.id !== user.id)],
        userRoles: [
          ...prev.userRoles.filter((item) => item.user_id !== user.id),
          ...roles.map((role, index) => ({
            id: `auth-role-${user.id}-${index}`,
            user_id: user.id,
            role,
            granted_by: null,
            created_at: profile.created_at,
          })),
        ],
        assistants: assistantsResult.error ? prev.assistants : (assistantsResult.data || []) as AIAssistant[],
        conversations: conversationsResult.error
          ? prev.conversations
          : [
              ...assistantConversationRows as Conversation[],
              ...prev.conversations.filter((item) => item.type !== 'assistant'),
            ],
        messages: assistantMessagesResult.error
          ? prev.messages
          : [
              ...prev.messages.filter((item) => !assistantConversationIds.includes(item.conversation_id)),
              ...(assistantMessagesResult.data || []) as Message[],
            ],
      }));
    };

    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      void Promise.resolve().then(() => hydrateIdentity(session?.user ?? null));
    });
    void sb.auth.getSession().then(({ data }) => hydrateIdentity(data.session?.user ?? null));

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (message: string, tone: ToastItem['tone'] = 'info') => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, message, tone }]);
      setTimeout(() => dismissToast(id), 3600);
    },
    [dismissToast]
  );

  const currentUser = useMemo(
    () => state.profiles.find((p) => p.id === state.currentUserId) || null,
    [state.profiles, state.currentUserId]
  );

  const currentUserRoles = useMemo<AppRole[]>(() => {
    if (!currentUser) return [];
    const roles = state.userRoles
      .filter((r) => r.user_id === currentUser.id)
      .map((r) => r.role);
    return roles.length > 0 ? roles : ['user'];
  }, [state.userRoles, currentUser]);

  const isAdmin = useMemo(() => hasAdminAccess(currentUserRoles), [currentUserRoles]);
  const isSuperAdminUser = useMemo(() => isSuperAdmin(currentUserRoles), [currentUserRoles]);

  const appendAuditLog = useCallback(
    (
      prev: AdiChatStoreState,
      action: string,
      targetType: string,
      targetId: string,
      details: Record<string, unknown>
    ): AuditLog[] => {
      const entry: AuditLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        actor_user_id: prev.currentUserId,
        action,
        target_type: targetType,
        target_id: targetId,
        details,
        request_id: `req_${Date.now().toString(36)}`,
        ip_hash: 'sha256:local-session',
        created_at: new Date().toISOString(),
      };
      return [entry, ...prev.auditLogs];
    },
    []
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail || !password) {
        return { ok: false, error: 'Please enter both email and password.' };
      }

      const sb = getSupabaseClient();
      if (sb) {
        const { data, error } = await sb.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (error || !data.user) {
          return { ok: false, error: 'Invalid login credentials.' };
        }

        const [profileResult, rolesResult] = await Promise.all([
          sb.from('profiles')
            .select('id,full_name,avatar_path,about,title,status,last_seen_at,is_online,theme_preference,created_at,updated_at')
            .eq('id', data.user.id)
            .maybeSingle(),
          sb.from('user_roles').select('role').eq('user_id', data.user.id),
        ]);

        if (profileResult.error || !profileResult.data || rolesResult.error) {
          await sb.auth.signOut();
          return { ok: false, error: 'Your AdiChat profile is not ready. Please contact support.' };
        }

        const profile = { ...profileResult.data, email: data.user.email ?? null } as Profile;
        if (profile.status !== 'active') {
          await sb.auth.signOut();
          return { ok: false, error: `Your account is currently ${profile.status}.` };
        }

        const roles = (rolesResult.data || []).map((row) => row.role as AppRole);
        setState((prev) => ({
          ...prev,
          currentUserId: data.user!.id,
          profiles: [profile, ...prev.profiles.filter((item) => item.id !== profile.id)],
          userRoles: [
            ...prev.userRoles.filter((item) => item.user_id !== profile.id),
            ...roles.map((role, index) => ({
              id: `auth-role-${profile.id}-${index}`,
              user_id: profile.id,
              role,
              granted_by: null,
              created_at: profile.created_at,
            })),
          ],
        }));
        return { ok: true };
      }

      if (!IS_DEMO_MODE) {
        return { ok: false, error: 'Authentication service is not configured yet.' };
      }

      const profile = state.profiles.find((p) => p.email?.toLowerCase() === normalizedEmail);
      if (!profile || password.length < 6) {
        return { ok: false, error: 'Invalid email or password. Please verify your credentials.' };
      }
      if (profile.status !== 'active') {
        return {
          ok: false,
          error: `Account access restricted (${profile.status}). Please contact an administrator.`,
        };
      }
      setState((prev) => ({ ...prev, currentUserId: profile.id }));
      return { ok: true };
    },
    [state.profiles]
  );

  const signUp = useCallback(
    async (fullName: string, email: string, password: string) => {
      const normalizedEmail = email.trim().toLowerCase();
      const sb = getSupabaseClient();
      if (sb) {
        const { error } = await sb.auth.signUp({
          email: normalizedEmail,
          password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (error) return { ok: false, error: error.message };
        return { ok: true };
      }

      if (!IS_DEMO_MODE) {
        return { ok: false, error: 'Registration service is not configured yet.' };
      }

      const existing = state.profiles.find((p) => p.email?.toLowerCase() === normalizedEmail);
      if (existing) {
        return { ok: false, error: 'An account with this email already exists. Try logging in.' };
      }

      const newId = `u-${Date.now().toString(36)}`;
      const timestamp = new Date().toISOString();
      const newProfile: Profile = {
        id: newId,
        full_name: fullName.trim(),
        email: normalizedEmail,
        avatar_path: null,
        about: 'New to AdiChat!',
        title: 'Member',
        status: 'active',
        last_seen_at: timestamp,
        is_online: true,
        theme_preference: 'light',
        created_at: timestamp,
        updated_at: timestamp,
      };

      setState((prev) => ({
        ...prev,
        currentUserId: newId,
        profiles: [newProfile, ...prev.profiles],
        userRoles: [
          ...prev.userRoles,
          { id: `role_${newId}`, user_id: newId, role: 'user', granted_by: null, created_at: timestamp },
        ],
        userSettings: {
          ...prev.userSettings,
          [newId]: {
            user_id: newId,
            show_last_seen: true,
            show_online_status: true,
            read_receipts_enabled: true,
            notify_messages: true,
            notify_groups: true,
            notify_ai_replies: true,
            disappearing_timer: 'off',
            auto_download_media: 'wifi',
            created_at: timestamp,
            updated_at: timestamp,
          },
        },
      }));
      return { ok: true };
    },
    [state.profiles]
  );

  const quickSignInDemo = useCallback((userId = 'u-adeel') => {
    if (!IS_DEMO_MODE) return;
    setState((prev) => ({ ...prev, currentUserId: userId }));
  }, []);

  const logout = useCallback(() => {
    const sb = getSupabaseClient();
    if (sb) void sb.auth.signOut();
    if (!IS_DEMO_MODE) {
      setState((prev) => ({
        ...prev,
        currentUserId: null,
        profiles: [],
        userRoles: [],
        assistants: [],
        conversations: [],
        conversationMembers: [],
        messages: [],
        assistantUsage: [],
      }));
    } else {
      setState((prev) => ({ ...prev, currentUserId: null }));
    }
  }, []);

  const updateMyProfile = useCallback(
    (updates: Partial<Pick<Profile, 'full_name' | 'about' | 'title' | 'theme_preference' | 'avatar_path'>>) => {
      if (!state.currentUserId) return;
      const nowIso = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        profiles: prev.profiles.map((p) =>
          p.id === prev.currentUserId ? { ...p, ...updates, updated_at: nowIso } : p
        ),
      }));
      pushToast('Profile saved', 'success');
    },
    [state.currentUserId, pushToast]
  );

  const updateMySettings = useCallback(
    (updates: Partial<UserSettings>) => {
      if (!state.currentUserId) return;
      const nowIso = new Date().toISOString();
      setState((prev) => {
        const uid = prev.currentUserId!;
        const current = prev.userSettings[uid] || {
          user_id: uid,
          show_last_seen: true,
          show_online_status: true,
          read_receipts_enabled: true,
          notify_messages: true,
          notify_groups: true,
          notify_ai_replies: true,
          disappearing_timer: 'off',
          auto_download_media: 'wifi',
          created_at: nowIso,
          updated_at: nowIso,
        };
        return {
          ...prev,
          userSettings: {
            ...prev.userSettings,
            [uid]: { ...current, ...updates, updated_at: nowIso },
          },
        };
      });
    },
    [state.currentUserId]
  );

  const getOrCreateDirectConversation = useCallback(
    (otherUserId: string): Conversation | null => {
      if (!state.currentUserId || state.currentUserId === otherUserId) return null;
      const pairKey = buildDirectPairKey(state.currentUserId, otherUserId);
      const existing = state.conversations.find((c) => c.direct_pair_key === pairKey);
      if (existing) return existing;

      const other = state.profiles.find((p) => p.id === otherUserId);
      const nowIso = new Date().toISOString();
      const newConv: Conversation = {
        id: `conv-${Date.now().toString(36)}`,
        type: 'direct',
        title: other?.full_name || 'Direct Chat',
        created_by: state.currentUserId,
        direct_pair_key: pairKey,
        last_message_id: null,
        last_message_at: nowIso,
        created_at: nowIso,
        updated_at: nowIso,
      };
      setState((prev) => ({
        ...prev,
        conversations: [newConv, ...prev.conversations],
        conversationMembers: [
          ...prev.conversationMembers,
          {
            id: `cm_${Date.now()}_a`,
            conversation_id: newConv.id,
            user_id: state.currentUserId!,
            member_role: 'member',
            joined_at: nowIso,
            last_read_at: nowIso,
            muted_until: null,
            is_blocked: false,
            created_at: nowIso,
          },
          {
            id: `cm_${Date.now()}_b`,
            conversation_id: newConv.id,
            user_id: otherUserId,
            member_role: 'member',
            joined_at: nowIso,
            last_read_at: null,
            muted_until: null,
            is_blocked: false,
            created_at: nowIso,
          },
        ],
      }));
      return newConv;
    },
    [state.currentUserId, state.conversations, state.profiles]
  );

  const markConversationRead = useCallback(
    (conversationId: string) => {
      if (!state.currentUserId) return;
      const nowIso = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        conversationMembers: prev.conversationMembers.map((m) =>
          m.conversation_id === conversationId && m.user_id === prev.currentUserId
            ? { ...m, last_read_at: nowIso }
            : m
        ),
      }));
    },
    [state.currentUserId]
  );

  const sendMessage = useCallback(
    async (
      conversationId: string,
      body: string,
      options?: {
        type?: MessageType;
        attachment?: Omit<Attachment, 'id' | 'message_id' | 'created_at'>;
        durationMs?: number;
      }
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!state.currentUserId) return { ok: false, error: 'You must be signed in.' };
      const trimmed = body.trim();
      if (!trimmed && !options?.attachment && !options?.durationMs) {
        return { ok: false, error: 'Message cannot be empty.' };
      }

      const convCheck = state.conversations.find((c) => c.id === conversationId);
      if (convCheck?.type === 'group') {
        const grp = state.groups.find((g) => g.conversation_id === conversationId);
        if (grp?.only_admins_send && !isGroupAdmin(state.conversationMembers, conversationId, state.currentUserId)) {
          return { ok: false, error: 'Only Group Admins can post in this group.' };
        }
      }

      const nowIso = new Date().toISOString();
      const msgId = `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
      const msgType: MessageType = options?.type || 'text';

      const newMsg: Message = {
        id: msgId,
        conversation_id: conversationId,
        sender_user_id: state.currentUserId,
        sender_assistant_id: null,
        message_type: msgType,
        body: trimmed || options?.attachment?.file_name || 'Voice note',
        reply_to_message_id: null,
        delivery_status: 'delivered',
        metadata: {
          ...(options?.attachment
            ? {
                file_name: options.attachment.file_name,
                file_size_bytes: options.attachment.file_size_bytes,
                mime_type: options.attachment.mime_type,
                media_url: options.attachment.preview_url,
              }
            : {}),
          ...(options?.durationMs ? { duration_ms: options.durationMs } : {}),
        },
        created_at: nowIso,
        edited_at: null,
        deleted_at: null,
      };

      const newAttachment: Attachment | null = options?.attachment
        ? {
            ...options.attachment,
            id: `att_${Date.now().toString(36)}`,
            message_id: msgId,
            created_at: nowIso,
          }
        : null;

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, newMsg],
        attachments: newAttachment ? [newAttachment, ...prev.attachments] : prev.attachments,
        conversations: prev.conversations.map((c) =>
          c.id === conversationId ? { ...c, last_message_id: msgId, last_message_at: nowIso, updated_at: nowIso } : c
        ),
      }));

      // If group conversation, evaluate @mentions or every_message assistants
      const conv = state.conversations.find((c) => c.id === conversationId);
      if (conv?.type === 'group' && trimmed) {
        const groupMeta = state.groups.find((g) => g.conversation_id === conversationId);
        const grpAssistants = state.groupAssistants.filter(
          (ga) => ga.group_conversation_id === conversationId
        );
        const triggered = resolveTriggeredGroupAssistants(
          trimmed,
          grpAssistants,
          state.assistants,
          groupMeta?.allow_ai_auto_respond ?? true
        );

        for (const assistant of triggered) {
          try {
            const recentMsgs = state.messages
              .filter((m) => m.conversation_id === conversationId && !m.deleted_at)
              .slice(-6)
              .map((m) => ({
                role: (m.sender_assistant_id ? 'model' : 'user') as 'user' | 'model',
                text: m.body || '',
              }));

            const aiRes = await requestAssistantReply({
              prompt: trimmed,
              assistant,
              thinkingMode: shouldRecommendThinkingMode(trimmed),
              history: recentMsgs,
            });

            const aiMsgId = `msg_ai_${Date.now().toString(36)}`;
            const aiIso = new Date().toISOString();
            const aiMsg: Message = {
              id: aiMsgId,
              conversation_id: conversationId,
              sender_user_id: null,
              sender_assistant_id: assistant.id,
              message_type: 'text',
              body: aiRes.text,
              reply_to_message_id: msgId,
              delivery_status: 'read',
              metadata: {
                thinking_mode: aiRes.thinkingMode,
                model_id: aiRes.model,
                latency_ms: aiRes.latencyMs,
              },
              created_at: aiIso,
              edited_at: null,
              deleted_at: null,
            };
            const usageEntry: AssistantUsage = {
              id: `usage_${Date.now().toString(36)}`,
              assistant_id: assistant.id,
              user_id: state.currentUserId,
              conversation_id: conversationId,
              model_id: aiRes.model,
              input_units: trimmed.length,
              output_units: aiRes.text.length,
              request_status: 'success',
              latency_ms: aiRes.latencyMs,
              request_id: aiRes.requestId,
              created_at: aiIso,
            };
            setState((prev) => ({
              ...prev,
              messages: [...prev.messages, aiMsg],
              assistantUsage: [usageEntry, ...prev.assistantUsage],
              conversations: prev.conversations.map((c) =>
                c.id === conversationId
                  ? { ...c, last_message_id: aiMsgId, last_message_at: aiIso, updated_at: aiIso }
                  : c
              ),
            }));
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Group AI assistant unavailable';
            pushToast(`${assistant.name}: ${message}`, 'error');
          }
        }
      }

      return { ok: true };
    },
    [
      state.currentUserId,
      state.conversations,
      state.conversationMembers,
      state.groups,
      state.groupAssistants,
      state.assistants,
      state.messages,
      pushToast,
    ]
  );

  const toggleReaction = useCallback((messageId: string, emoji: string) => {
    setState((prev) => ({
      ...prev,
      messages: prev.messages.map((m) => {
        if (m.id !== messageId) return m;
        const currentReactions = { ...(m.metadata.reactions || {}) };
        currentReactions[emoji] = (currentReactions[emoji] || 0) + 1;
        return { ...m, metadata: { ...m.metadata, reactions: currentReactions } };
      }),
    }));
  }, []);

  const createGroup = useCallback(
    (input: {
      name: string;
      description: string;
      memberIds: string[];
      assistantIds: string[];
      onlyAdminsSend?: boolean;
      allowAiAutoRespond?: boolean;
    }): Conversation | null => {
      if (!state.currentUserId) return null;
      const nowIso = new Date().toISOString();
      const convId = `conv-grp-${Date.now().toString(36)}`;
      const uniqueMembers = Array.from(new Set([state.currentUserId, ...input.memberIds]));

      const conv: Conversation = {
        id: convId,
        type: 'group',
        title: input.name.trim(),
        created_by: state.currentUserId,
        direct_pair_key: null,
        last_message_id: null,
        last_message_at: nowIso,
        created_at: nowIso,
        updated_at: nowIso,
      };

      const groupMeta: GroupMetadata = {
        conversation_id: convId,
        name: input.name.trim(),
        description: input.description.trim() || null,
        avatar_path: null,
        created_by: state.currentUserId,
        only_admins_send: Boolean(input.onlyAdminsSend),
        allow_ai_auto_respond: input.allowAiAutoRespond ?? true,
        created_at: nowIso,
        updated_at: nowIso,
      };

      const members = uniqueMembers.map((uid, idx) => ({
        id: `cm_${Date.now()}_${idx}`,
        conversation_id: convId,
        user_id: uid,
        member_role: (uid === state.currentUserId ? 'admin' : 'member') as 'admin' | 'member',
        joined_at: nowIso,
        last_read_at: uid === state.currentUserId ? nowIso : null,
        muted_until: null,
        is_blocked: false,
        created_at: nowIso,
      }));

      const groupAssistants: GroupAssistant[] = input.assistantIds.map((aid, idx) => ({
        id: `ga_${Date.now()}_${idx}`,
        group_conversation_id: convId,
        assistant_id: aid,
        response_mode: 'mentioned_only',
        added_by: state.currentUserId!,
        is_enabled: true,
        created_at: nowIso,
        updated_at: nowIso,
      }));

      const sysMsg: Message = {
        id: `msg_sys_${Date.now().toString(36)}`,
        conversation_id: convId,
        sender_user_id: null,
        sender_assistant_id: null,
        message_type: 'system',
        body: `Group "${input.name.trim()}" created with ${uniqueMembers.length} participants`,
        reply_to_message_id: null,
        delivery_status: 'read',
        metadata: {},
        created_at: nowIso,
        edited_at: null,
        deleted_at: null,
      };

      setState((prev) => ({
        ...prev,
        conversations: [{ ...conv, last_message_id: sysMsg.id }, ...prev.conversations],
        groups: [groupMeta, ...prev.groups],
        conversationMembers: [...prev.conversationMembers, ...members],
        groupAssistants: [...prev.groupAssistants, ...groupAssistants],
        messages: [...prev.messages, sysMsg],
      }));
      pushToast(`Group "${input.name.trim()}" created`, 'success');
      return conv;
    },
    [state.currentUserId, pushToast]
  );

  const updateGroupMeta = useCallback(
    (
      groupId: string,
      updates: Partial<Pick<GroupMetadata, 'name' | 'description' | 'only_admins_send' | 'allow_ai_auto_respond'>>
    ) => {
      if (!state.currentUserId) return { ok: false, error: 'Unauthorized' };
      const allowed = isAdmin || isGroupAdmin(state.conversationMembers, groupId, state.currentUserId);
      if (!allowed) {
        return { ok: false, error: 'Only Group Admins or platform admins can edit group details.' };
      }
      const nowIso = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        groups: prev.groups.map((g) =>
          g.conversation_id === groupId ? { ...g, ...updates, updated_at: nowIso } : g
        ),
        conversations: prev.conversations.map((c) =>
          c.id === groupId && updates.name ? { ...c, title: updates.name.trim(), updated_at: nowIso } : c
        ),
        auditLogs: isAdmin
          ? appendAuditLog(prev, 'admin_update_group', 'group', groupId, {
              fields: Object.keys(updates),
            })
          : prev.auditLogs,
      }));
      pushToast('Group updated', 'success');
      return { ok: true };
    },
    [state.currentUserId, state.conversationMembers, isAdmin, appendAuditLog, pushToast]
  );

  const addGroupMembers = useCallback(
    (groupId: string, memberIds: string[]) => {
      if (!state.currentUserId) return { ok: false, error: 'Unauthorized' };
      const nowIso = new Date().toISOString();
      const existingIds = new Set(
        state.conversationMembers.filter((m) => m.conversation_id === groupId).map((m) => m.user_id)
      );
      const toAdd = memberIds.filter((id) => !existingIds.has(id));
      if (toAdd.length === 0) {
        return { ok: false, error: 'Selected users are already in this group.' };
      }

      const newRows = toAdd.map((uid, idx) => ({
        id: `cm_${Date.now()}_${idx}`,
        conversation_id: groupId,
        user_id: uid,
        member_role: 'member' as const,
        joined_at: nowIso,
        last_read_at: null,
        muted_until: null,
        is_blocked: false,
        created_at: nowIso,
      }));

      setState((prev) => ({
        ...prev,
        conversationMembers: [...prev.conversationMembers, ...newRows],
      }));
      pushToast(`Added ${toAdd.length} member(s) to group`, 'success');
      return { ok: true };
    },
    [state.currentUserId, state.conversationMembers, pushToast]
  );

  const removeGroupMember = useCallback(
    (groupId: string, targetUserId: string) => {
      if (!state.currentUserId) return { ok: false, error: 'Unauthorized' };
      const check = canRemoveGroupMember(
        state.conversationMembers,
        groupId,
        state.currentUserId,
        targetUserId,
        isAdmin
      );
      if (!check.allowed) {
        return { ok: false, error: check.reason };
      }
      const actedAsPlatformAdmin =
        isAdmin && !isGroupAdmin(state.conversationMembers, groupId, state.currentUserId);
      setState((prev) => ({
        ...prev,
        conversationMembers: prev.conversationMembers.filter(
          (m) => !(m.conversation_id === groupId && m.user_id === targetUserId)
        ),
        auditLogs: actedAsPlatformAdmin
          ? appendAuditLog(prev, 'admin_remove_group_member', 'group', groupId, {
              target_user_id: targetUserId,
            })
          : prev.auditLogs,
      }));
      pushToast('Member removed from group', 'info');
      return { ok: true };
    },
    [state.currentUserId, state.conversationMembers, isAdmin, appendAuditLog, pushToast]
  );

  const toggleGroupMute = useCallback(
    (conversationId: string) => {
      if (!state.currentUserId) return;
      setState((prev) => ({
        ...prev,
        conversationMembers: prev.conversationMembers.map((m) =>
          m.conversation_id === conversationId && m.user_id === prev.currentUserId
            ? { ...m, muted_until: m.muted_until ? null : '2099-01-01T00:00:00.000Z' }
            : m
        ),
      }));
    },
    [state.currentUserId]
  );

  const toggleBlockUser = useCallback(
    (targetUserId: string) => {
      if (!state.currentUserId || state.currentUserId === targetUserId) return;
      setState((prev) => {
        const exists = prev.userBlocks.some(
          (b) => b.blocker_user_id === prev.currentUserId && b.blocked_user_id === targetUserId
        );
        return {
          ...prev,
          userBlocks: exists
            ? prev.userBlocks.filter(
                (b) => !(b.blocker_user_id === prev.currentUserId && b.blocked_user_id === targetUserId)
              )
            : [
                ...prev.userBlocks,
                {
                  id: `blk_${Date.now()}`,
                  blocker_user_id: prev.currentUserId!,
                  blocked_user_id: targetUserId,
                  created_at: new Date().toISOString(),
                },
              ],
        };
      });
    },
    [state.currentUserId]
  );

  const isUserBlocked = useCallback(
    (targetUserId: string) => {
      if (!state.currentUserId) return false;
      return state.userBlocks.some(
        (b) => b.blocker_user_id === state.currentUserId && b.blocked_user_id === targetUserId
      );
    },
    [state.currentUserId, state.userBlocks]
  );

  const submitReport = useCallback(
    (input: {
      targetType: ReportTargetType;
      targetUserId?: string | null;
      targetMessageId?: string | null;
      targetGroupConversationId?: string | null;
      reason: string;
      details?: string;
    }) => {
      if (!state.currentUserId) return { ok: false, error: 'Sign in required' };
      const reasonClean = input.reason.trim();
      if (!reasonClean) return { ok: false, error: 'Please provide a reason.' };
      const nowIso = new Date().toISOString();
      const report: ModerationReport = {
        id: `rep_${Date.now().toString(36)}`,
        reporter_user_id: state.currentUserId,
        target_type: input.targetType,
        target_user_id: input.targetType === 'user' ? input.targetUserId || null : null,
        target_message_id: input.targetType === 'message' ? input.targetMessageId || null : null,
        target_group_conversation_id:
          input.targetType === 'group' ? input.targetGroupConversationId || null : null,
        reason: reasonClean,
        details: input.details?.trim() || null,
        status: 'open',
        assigned_to: 'u-adeel',
        resolution_note: null,
        resolved_at: null,
        created_at: nowIso,
        updated_at: nowIso,
      };
      setState((prev) => ({ ...prev, reports: [report, ...prev.reports] }));
      pushToast('Report submitted to moderation queue', 'success');
      return { ok: true };
    },
    [state.currentUserId, pushToast]
  );

  const createAssistant = useCallback(
    async (input: {
      name: string;
      description: string;
      personality: string;
      instructions: string;
      tone: string;
      language: string;
      starter_prompts: string[];
      thinking_enabled_default?: boolean;
    }): Promise<AIAssistant | null> => {
      if (!state.currentUserId) return null;
      const nowIso = new Date().toISOString();
      const handle = input.name.replace(/[^a-zA-Z0-9]/g, '') || 'CustomAI';

      if (!IS_DEMO_MODE) {
        const sb = getSupabaseClient();
        if (!sb) return null;
        const { data, error } = await sb.from('ai_assistants').insert({
          owner_user_id: state.currentUserId,
          name: input.name.trim(),
          handle,
          description: input.description.trim() || null,
          personality: input.personality.trim() || null,
          instructions: input.instructions.trim(),
          tone: input.tone.trim() || 'Helpful',
          language: input.language.trim() || 'English',
          starter_prompts: input.starter_prompts.filter(Boolean),
          is_enabled: true,
          thinking_enabled_default: input.thinking_enabled_default ?? true,
        }).select('*').single();
        if (error || !data) {
          pushToast(error?.message || 'Unable to save assistant.', 'error');
          return null;
        }
        const savedAssistant = data as AIAssistant;
        setState((prev) => ({ ...prev, assistants: [savedAssistant, ...prev.assistants] }));
        pushToast(`${savedAssistant.name} created`, 'success');
        return savedAssistant;
      }

      const id = `ai-${Date.now().toString(36)}`;
      const newAssistant: AIAssistant = {
        id,
        owner_user_id: state.currentUserId,
        name: input.name.trim(),
        handle,
        avatar_path: null,
        icon_name: 'auto_awesome',
        description: input.description.trim() || null,
        personality: input.personality.trim() || null,
        instructions: input.instructions.trim(),
        tone: input.tone.trim() || 'Helpful',
        language: input.language.trim() || 'English',
        starter_prompts: input.starter_prompts.filter(Boolean),
        is_enabled: true,
        thinking_enabled_default: input.thinking_enabled_default ?? true,
        created_at: nowIso,
        updated_at: nowIso,
      };
      setState((prev) => ({ ...prev, assistants: [newAssistant, ...prev.assistants] }));
      pushToast(`${newAssistant.name} created`, 'success');
      return newAssistant;
    },
    [state.currentUserId, pushToast]
  );

  const updateAssistant = useCallback(
    (assistantId: string, updates: Partial<AIAssistant>) => {
      const nowIso = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        assistants: prev.assistants.map((a) =>
          a.id === assistantId ? { ...a, ...updates, updated_at: nowIso } : a
        ),
      }));
      pushToast('Assistant settings updated', 'success');
    },
    [pushToast]
  );

  const deleteAssistant = useCallback(
    (assistantId: string) => {
      setState((prev) => ({
        ...prev,
        assistants: prev.assistants.filter((a) => a.id !== assistantId),
        groupAssistants: prev.groupAssistants.filter((ga) => ga.assistant_id !== assistantId),
      }));
      pushToast('AI assistant deleted', 'info');
    },
    [pushToast]
  );

  const openAssistantConversation = useCallback(
    (assistantId: string): Conversation | null => {
      const assistant = state.assistants.find((a) => a.id === assistantId);
      if (!assistant) return null;

      // Match known seed mapping or existing conversation by title/type
      const existing = state.conversations.find(
        (c) =>
          c.type === 'assistant' &&
          (c.title === assistant.name || c.id === `conv-ai-${assistantId}`)
      );
      if (existing) return existing;

      const nowIso = new Date().toISOString();
      const conv: Conversation = {
        id: `conv-ai-${assistantId}`,
        type: 'assistant',
        title: assistant.name,
        created_by: state.currentUserId || 'u-adeel',
        direct_pair_key: null,
        last_message_id: null,
        last_message_at: nowIso,
        created_at: nowIso,
        updated_at: nowIso,
      };

      setState((prev) => ({
        ...prev,
        conversations: prev.conversations.some((c) => c.id === conv.id)
          ? prev.conversations
          : [conv, ...prev.conversations],
      }));
      return conv;
    },
    [state.assistants, state.conversations, state.currentUserId]
  );

  const sendAiMessage = useCallback(
    async (assistantId: string, prompt: string, thinkingMode: boolean) => {
      const assistant = state.assistants.find((a) => a.id === assistantId);
      if (!assistant) return { ok: false, error: 'AI Assistant not found.' };
      if (!assistant.is_enabled) return { ok: false, error: 'This AI Assistant is disabled.' };

      if (!IS_DEMO_MODE) {
        const supabase = getSupabaseClient();
        if (!supabase) return { ok: false, error: 'Supabase is not configured.' };

        const { data: conversationId, error: conversationError } = await supabase.rpc(
          'get_or_create_assistant_conversation',
          { p_assistant_id: assistantId }
        );
        if (conversationError || typeof conversationId !== 'string') {
          return { ok: false, error: conversationError?.message || 'Unable to open assistant conversation.' };
        }

        try {
          const response = await requestAssistantReply({
            prompt,
            assistant,
            conversationId,
            thinkingMode,
          });
          const [conversationResult, messagesResult] = await Promise.all([
            supabase.from('conversations').select('*').eq('id', conversationId).single(),
            supabase.from('messages').select('*')
              .eq('conversation_id', conversationId)
              .order('created_at', { ascending: true })
              .limit(100),
          ]);

          if (conversationResult.error || !conversationResult.data || messagesResult.error) {
            return { ok: false, error: 'AI response was saved, but the conversation could not be refreshed. Reopen the chat to reload it.' };
          }

          const savedConversation = conversationResult.data as Conversation;
          const savedMessages = (messagesResult.data || []) as Message[];
          setState((prev) => ({
            ...prev,
            conversations: [
              savedConversation,
              ...prev.conversations.filter((item) => item.id !== conversationId),
            ],
            messages: [
              ...prev.messages.filter((item) => item.conversation_id !== conversationId),
              ...savedMessages,
            ],
          }));

          return { ok: true, model: response.model, latencyMs: response.latencyMs };
        } catch (error) {
          return {
            ok: false,
            error: error instanceof Error ? error.message : 'Cloudflare Workers AI request failed.',
          };
        }
      }

      const conv = openAssistantConversation(assistantId);
      if (!conv) return { ok: false, error: 'Unable to resolve assistant thread.' };

      const nowIso = new Date().toISOString();
      const userMsgId = `msg_u_${Date.now().toString(36)}`;
      const userMsg: Message = {
        id: userMsgId,
        conversation_id: conv.id,
        sender_user_id: state.currentUserId || 'u-adeel',
        sender_assistant_id: null,
        message_type: 'text',
        body: prompt,
        reply_to_message_id: null,
        delivery_status: 'read',
        metadata: {},
        created_at: nowIso,
        edited_at: null,
        deleted_at: null,
      };

      const history = state.messages
        .filter((m) => m.conversation_id === conv.id && !m.deleted_at)
        .slice(-8)
        .map((m) => ({
          role: (m.sender_assistant_id ? 'model' : 'user') as 'user' | 'model',
          text: m.body || '',
        }));

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMsg],
        conversations: prev.conversations.map((c) =>
          c.id === conv.id ? { ...c, last_message_id: userMsgId, last_message_at: nowIso } : c
        ),
      }));

      try {
        const res = await requestAssistantReply({
          prompt,
          assistant,
          thinkingMode,
          history,
        });

        const aiMsgId = `msg_ai_${Date.now().toString(36)}`;
        const aiIso = new Date().toISOString();
        const aiMsg: Message = {
          id: aiMsgId,
          conversation_id: conv.id,
          sender_user_id: null,
          sender_assistant_id: assistant.id,
          message_type: 'text',
          body: res.text,
          reply_to_message_id: userMsgId,
          delivery_status: 'read',
          metadata: {
            thinking_mode: res.thinkingMode,
            thinking_level: res.thinkingLevel,
            model_id: res.model,
            latency_ms: res.latencyMs,
            thinking_summary: res.thinkingMode
              ? `${assistant.name} applied High Thinking Mode (${res.model})`
              : `${assistant.name} responded via fast reasoning`,
          },
          created_at: aiIso,
          edited_at: null,
          deleted_at: null,
        };

        const usageEntry: AssistantUsage = {
          id: `usage_${Date.now().toString(36)}`,
          assistant_id: assistant.id,
          user_id: state.currentUserId || 'u-adeel',
          conversation_id: conv.id,
          model_id: res.model,
          input_units: prompt.length,
          output_units: res.text.length,
          request_status: 'success',
          latency_ms: res.latencyMs,
          request_id: res.requestId,
          created_at: aiIso,
        };

        setState((prev) => ({
          ...prev,
          messages: [...prev.messages, aiMsg],
          assistantUsage: [usageEntry, ...prev.assistantUsage],
          conversations: prev.conversations.map((c) =>
            c.id === conv.id
              ? { ...c, last_message_id: aiMsgId, last_message_at: aiIso, updated_at: aiIso }
              : c
          ),
        }));

        return { ok: true, model: res.model, latencyMs: res.latencyMs };
      } catch (err) {
        const errMessage = err instanceof Error ? err.message : 'AI request failed.';
        return { ok: false, error: errMessage };
      }
    },
    [state.assistants, state.messages, state.currentUserId, openAssistantConversation]
  );

  const syncGroupAssistants = useCallback(
    (
      groupId: string,
      selections: Array<{ assistantId: string; responseMode: AssistantResponseMode; enabled: boolean }>
    ) => {
      const nowIso = new Date().toISOString();
      setState((prev) => {
        const remaining = prev.groupAssistants.filter((ga) => ga.group_conversation_id !== groupId);
        const updatedRows: GroupAssistant[] = selections
          .filter((s) => s.enabled)
          .map((s, idx) => ({
            id: `ga_${Date.now()}_${idx}`,
            group_conversation_id: groupId,
            assistant_id: s.assistantId,
            response_mode: s.responseMode,
            added_by: prev.currentUserId || 'u-adeel',
            is_enabled: true,
            created_at: nowIso,
            updated_at: nowIso,
          }));
        return {
          ...prev,
          groupAssistants: [...remaining, ...updatedRows],
        };
      });
      pushToast('Group AI assistants updated', 'success');
    },
    [pushToast]
  );

  const adminUpdateUserStatus = useCallback(
    (userId: string, status: UserStatus, reason?: string) => {
      if (!isAdmin) return;
      const nowIso = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        profiles: prev.profiles.map((p) =>
          p.id === userId ? { ...p, status, updated_at: nowIso } : p
        ),
        auditLogs: appendAuditLog(prev, 'admin_update_user_status', 'user', userId, {
          next_status: status,
          reason: reason || 'Admin console action',
        }),
      }));
      pushToast(`User status updated to ${status}`, 'success');
    },
    [isAdmin, appendAuditLog, pushToast]
  );

  const adminBulkUpdateUserStatus = useCallback(
    (userIds: string[], status: UserStatus, reason?: string) => {
      if (!isAdmin || userIds.length === 0) return;
      const superAdminIds = new Set(
        state.userRoles.filter((r) => r.role === 'super_admin').map((r) => r.user_id)
      );
      const eligible = userIds.filter((id) => !superAdminIds.has(id));
      if (eligible.length === 0) return;
      const idSet = new Set(eligible);
      const nowIso = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        profiles: prev.profiles.map((p) =>
          idSet.has(p.id) ? { ...p, status, updated_at: nowIso } : p
        ),
        auditLogs: appendAuditLog(prev, 'admin_bulk_user_status', 'user_batch', eligible.join(','), {
          count: eligible.length,
          next_status: status,
          reason: reason || 'Bulk moderation action',
        }),
      }));
      pushToast(`Updated ${eligible.length} user(s) to ${status}`, 'success');
    },
    [isAdmin, state.userRoles, appendAuditLog, pushToast]
  );

  const adminDeleteUser = useCallback(
    (userId: string) => {
      if (!isAdmin) return { ok: false, error: 'Admin access required.' };
      const isTargetSuper = state.userRoles.some(
        (r) => r.user_id === userId && r.role === 'super_admin'
      );
      if (isTargetSuper) {
        return { ok: false, error: 'Super Admin account cannot be deleted.' };
      }
      setState((prev) => ({
        ...prev,
        profiles: prev.profiles.filter((p) => p.id !== userId),
        userRoles: prev.userRoles.filter((r) => r.user_id !== userId),
        conversationMembers: prev.conversationMembers.filter((m) => m.user_id !== userId),
        auditLogs: appendAuditLog(prev, 'admin_delete_user', 'user', userId, {}),
      }));
      pushToast('User account removed', 'info');
      return { ok: true };
    },
    [isAdmin, state.userRoles, appendAuditLog, pushToast]
  );

  const adminSetUserRole = useCallback(
    (userId: string, role: AppRole) => {
      if (!isSuperAdminUser) {
        return { ok: false, error: 'Only a Super Admin can grant or revoke application roles.' };
      }
      const nowIso = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        userRoles: [
          ...prev.userRoles.filter((r) => r.user_id !== userId),
          {
            id: `role_${userId}_${Date.now()}`,
            user_id: userId,
            role,
            granted_by: prev.currentUserId,
            created_at: nowIso,
          },
        ],
        auditLogs: appendAuditLog(prev, 'admin_set_user_role', 'user', userId, { role }),
      }));
      pushToast(`Role updated to ${role}`, 'success');
      return { ok: true };
    },
    [isSuperAdminUser, appendAuditLog, pushToast]
  );

  const adminDeleteGroup = useCallback(
    (groupId: string) => {
      if (!isAdmin) return;
      setState((prev) => ({
        ...prev,
        conversations: prev.conversations.filter((c) => c.id !== groupId),
        groups: prev.groups.filter((g) => g.conversation_id !== groupId),
        conversationMembers: prev.conversationMembers.filter((m) => m.conversation_id !== groupId),
        groupAssistants: prev.groupAssistants.filter((ga) => ga.group_conversation_id !== groupId),
        auditLogs: appendAuditLog(prev, 'admin_delete_group', 'group', groupId, {}),
      }));
      pushToast('Group removed by moderator', 'info');
    },
    [isAdmin, appendAuditLog, pushToast]
  );

  const adminToggleAssistant = useCallback(
    (assistantId: string, isEnabled: boolean) => {
      if (!isAdmin) return;
      setState((prev) => ({
        ...prev,
        assistants: prev.assistants.map((a) =>
          a.id === assistantId ? { ...a, is_enabled: isEnabled } : a
        ),
        auditLogs: appendAuditLog(prev, 'admin_toggle_assistant', 'ai_assistant', assistantId, {
          is_enabled: isEnabled,
        }),
      }));
      pushToast(`Assistant ${isEnabled ? 'enabled' : 'disabled'}`, 'info');
    },
    [isAdmin, appendAuditLog, pushToast]
  );

  const adminDeleteAssistant = useCallback(
    (assistantId: string) => {
      if (!isAdmin) return;
      setState((prev) => ({
        ...prev,
        assistants: prev.assistants.filter((a) => a.id !== assistantId),
        groupAssistants: prev.groupAssistants.filter((ga) => ga.assistant_id !== assistantId),
        auditLogs: appendAuditLog(prev, 'admin_delete_assistant', 'ai_assistant', assistantId, {}),
      }));
      pushToast('Assistant removed by admin', 'info');
    },
    [isAdmin, appendAuditLog, pushToast]
  );

  const adminResolveReport = useCallback(
    (
      reportId: string,
      status: ReportStatus,
      note: string,
      action: 'none' | 'warn' | 'suspend' | 'ban' | 'delete_message' = 'none'
    ) => {
      if (!isAdmin) return;
      const nowIso = new Date().toISOString();
      setState((prev) => {
        const rep = prev.reports.find((r) => r.id === reportId);
        let nextProfiles = prev.profiles;
        let nextMessages = prev.messages;

        if (rep?.target_user_id && (action === 'suspend' || action === 'ban')) {
          const nextStatus: UserStatus = action === 'ban' ? 'banned' : 'suspended';
          nextProfiles = prev.profiles.map((p) =>
            p.id === rep.target_user_id ? { ...p, status: nextStatus, updated_at: nowIso } : p
          );
        }
        if (rep?.target_message_id && action === 'delete_message') {
          nextMessages = prev.messages.map((m) =>
            m.id === rep.target_message_id ? { ...m, deleted_at: nowIso } : m
          );
        }

        return {
          ...prev,
          profiles: nextProfiles,
          messages: nextMessages,
          reports: prev.reports.map((r) =>
            r.id === reportId
              ? {
                  ...r,
                  status,
                  assigned_to: prev.currentUserId,
                  resolution_note: note,
                  resolved_at: nowIso,
                  updated_at: nowIso,
                }
              : r
          ),
          auditLogs: appendAuditLog(prev, 'admin_resolve_report', 'report', reportId, {
            status,
            enforcement_action: action,
            resolution_note: note,
          }),
        };
      });
      pushToast(`Report marked ${status}`, 'success');
    },
    [isAdmin, appendAuditLog, pushToast]
  );

  const adminUpdateDeveloperProfile = useCallback(
    (updates: Partial<DeveloperProfile>) => {
      if (!isAdmin) return;
      const nowIso = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        developerProfile: {
          ...prev.developerProfile,
          ...updates,
          updated_by: prev.currentUserId,
          updated_at: nowIso,
        },
        auditLogs: appendAuditLog(prev, 'admin_update_developer_profile', 'developer_profile', '1', {
          fields: Object.keys(updates),
        }),
      }));
      pushToast('Developer profile published', 'success');
    },
    [isAdmin, appendAuditLog, pushToast]
  );

  const adminUpdateAppSetting = useCallback(
    (key: string, value: unknown) => {
      if (!isAdmin) return;
      const nowIso = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        appSettings: prev.appSettings.map((s) =>
          s.key === key ? { ...s, value, updated_by: prev.currentUserId, updated_at: nowIso } : s
        ),
        auditLogs: appendAuditLog(prev, 'admin_update_app_setting', 'app_settings', key, { value }),
      }));
    },
    [isAdmin, appendAuditLog]
  );

  const adminPublishAnnouncement = useCallback(
    (input: { title: string; body: string; show_as_banner: boolean }) => {
      if (!isAdmin || !state.currentUserId) return;
      const nowIso = new Date().toISOString();
      const ann: Announcement = {
        id: `ann_${Date.now().toString(36)}`,
        title: input.title.trim(),
        body: input.body.trim(),
        show_as_banner: input.show_as_banner,
        status: 'published',
        created_by: state.currentUserId,
        published_at: nowIso,
        created_at: nowIso,
        updated_at: nowIso,
      };
      setState((prev) => ({
        ...prev,
        announcements: [ann, ...prev.announcements],
        auditLogs: appendAuditLog(prev, 'publish_announcement', 'announcement', ann.id, {
          title: ann.title,
        }),
      }));
      pushToast('Announcement published', 'success');
    },
    [isAdmin, state.currentUserId, appendAuditLog, pushToast]
  );

  const resetDemoWorkspace = useCallback(() => {
    if (!IS_DEMO_MODE) return;
    window.localStorage.removeItem(STORAGE_KEY);
    setState(SEED_DATA);
    pushToast('Workspace reset to baseline', 'info');
  }, [pushToast]);

  const value = useMemo<AppStateContextValue>(
    () => ({
      state,
      currentUser,
      currentUserRoles,
      isAdmin,
      isSuperAdminUser,
      isSupabaseConnected: isSupabaseConfigured,
      toasts,
      pushToast,
      dismissToast,
      login,
      signUp,
      quickSignInDemo,
      logout,
      updateMyProfile,
      updateMySettings,
      getOrCreateDirectConversation,
      markConversationRead,
      sendMessage,
      toggleReaction,
      createGroup,
      updateGroupMeta,
      addGroupMembers,
      removeGroupMember,
      toggleGroupMute,
      toggleBlockUser,
      isUserBlocked,
      submitReport,
      createAssistant,
      updateAssistant,
      deleteAssistant,
      openAssistantConversation,
      sendAiMessage,
      syncGroupAssistants,
      adminUpdateUserStatus,
      adminBulkUpdateUserStatus,
      adminDeleteUser,
      adminSetUserRole,
      adminDeleteGroup,
      adminToggleAssistant,
      adminDeleteAssistant,
      adminResolveReport,
      adminUpdateDeveloperProfile,
      adminUpdateAppSetting,
      adminPublishAnnouncement,
      resetDemoWorkspace,
    }),
    [
      state,
      currentUser,
      currentUserRoles,
      isAdmin,
      isSuperAdminUser,
      toasts,
      pushToast,
      dismissToast,
      login,
      signUp,
      quickSignInDemo,
      logout,
      updateMyProfile,
      updateMySettings,
      getOrCreateDirectConversation,
      markConversationRead,
      sendMessage,
      toggleReaction,
      createGroup,
      updateGroupMeta,
      addGroupMembers,
      removeGroupMember,
      toggleGroupMute,
      toggleBlockUser,
      isUserBlocked,
      submitReport,
      createAssistant,
      updateAssistant,
      deleteAssistant,
      openAssistantConversation,
      sendAiMessage,
      syncGroupAssistants,
      adminUpdateUserStatus,
      adminBulkUpdateUserStatus,
      adminDeleteUser,
      adminSetUserRole,
      adminDeleteGroup,
      adminToggleAssistant,
      adminDeleteAssistant,
      adminResolveReport,
      adminUpdateDeveloperProfile,
      adminUpdateAppSetting,
      adminPublishAnnouncement,
      resetDemoWorkspace,
    ]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used inside AppStateProvider');
  return ctx;
}
