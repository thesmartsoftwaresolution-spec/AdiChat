import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { SEED_DATA, type AdiChatStoreState } from '../../data/seed';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabase/client';
import { requestAssistantReply } from '../../services/ai.service';
import type {
  AIAssistant,
  Announcement,
  AppSetting,
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
  UserBlock,
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
  isAuthReady: boolean;
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
  updateMyProfile: (updates: Partial<Pick<Profile, 'full_name' | 'about' | 'title' | 'theme_preference' | 'avatar_path'>>) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  updateMySettings: (updates: Partial<UserSettings>) => Promise<void>;
  // Direct & Group Messaging
  getOrCreateDirectConversation: (otherUserId: string) => Promise<Conversation | null>;
  markConversationRead: (conversationId: string) => Promise<void>;
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
  }) => Promise<Conversation | null>;
  updateGroupMeta: (
    groupId: string,
    updates: Partial<Pick<GroupMetadata, 'name' | 'description' | 'only_admins_send' | 'allow_ai_auto_respond'>>
  ) => Promise<{ ok: boolean; error?: string }>;
  addGroupMembers: (groupId: string, memberIds: string[]) => Promise<{ ok: boolean; error?: string }>;
  removeGroupMember: (groupId: string, targetUserId: string) => Promise<{ ok: boolean; error?: string }>;
  toggleGroupMute: (conversationId: string) => Promise<void>;
  toggleBlockUser: (targetUserId: string) => Promise<boolean>;
  isUserBlocked: (targetUserId: string) => boolean;
  submitReport: (input: {
    targetType: ReportTargetType;
    targetUserId?: string | null;
    targetMessageId?: string | null;
    targetGroupConversationId?: string | null;
    reason: string;
    details?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  // AI Assistants
  createAssistant: (input: {
    name: string;
    description: string;
    role: string;
    scenario: string;
    behaviour: string;
    personality: string;
    instructions: string;
    tone: string;
    language: string;
    starter_prompts: string[];
    avatarFile?: File | null;
    thinking_enabled_default?: boolean;
  }) => Promise<AIAssistant | null>;
  updateAssistant: (assistantId: string, updates: Partial<AIAssistant>, avatarFile?: File | null) => Promise<boolean>;
  deleteAssistant: (assistantId: string) => void;
  openAssistantConversation: (assistantId: string) => Conversation | null;
  sendAiMessage: (
    assistantId: string,
    prompt: string,
    thinkingMode: boolean,
    options?: { file?: File | null; replyToMessageId?: string | null }
  ) => Promise<{ ok: boolean; error?: string; model?: string; latencyMs?: number; assistantMessageId?: string }>;
  syncGroupAssistants: (
    groupId: string,
    selections: Array<{ assistantId: string; responseMode: AssistantResponseMode; enabled: boolean }>
  ) => Promise<boolean>;
  // Admin Operations
  adminUpdateUserStatus: (userId: string, status: UserStatus, reason?: string) => Promise<boolean>;
  adminBulkUpdateUserStatus: (userIds: string[], status: UserStatus, reason?: string) => Promise<number>;
  adminDeleteUser: (userId: string) => { ok: boolean; error?: string };
  adminSetUserRole: (userId: string, role: AppRole) => Promise<{ ok: boolean; error?: string }>;
  adminDeleteGroup: (groupId: string) => void;
  adminToggleAssistant: (assistantId: string, isEnabled: boolean) => Promise<boolean>;
  adminDeleteAssistant: (assistantId: string) => void;
  adminResolveReport: (
    reportId: string,
    status: ReportStatus,
    note: string,
    action?: 'none' | 'warn' | 'suspend' | 'ban' | 'delete_message'
  ) => Promise<{ ok: boolean; error?: string }>;
  adminUpdateDeveloperProfile: (updates: Partial<DeveloperProfile>) => Promise<boolean>;
  adminUpdateAppSetting: (key: string, value: unknown) => Promise<boolean>;
  adminPublishAnnouncement: (input: { title: string; body: string; show_as_banner: boolean }) => Promise<boolean>;
  resetDemoWorkspace: () => void;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AdiChatStoreState>(loadInitialState);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(IS_DEMO_MODE);

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
    if (!sb) {
      setIsAuthReady(true);
      return;
    }
    let active = true;
    let hydrationVersion = 0;

    const hydrateIdentity = async (user: { id: string; email?: string | null } | null) => {
      if (!user) {
        if (active) {
          setState((prev) => ({
            ...prev,
            currentUserId: null,
            profiles: [],
            userRoles: [],
            userSettings: {},
            assistants: [],
            conversations: [],
            conversationMembers: [],
            groups: [],
            messages: [],
            attachments: [],
            groupAssistants: [],
            assistantUsage: [],
            userBlocks: [],
            reports: [],
            auditLogs: [],
            appSettings: [],
            announcements: [],
            developerProfile: SEED_DATA.developerProfile,
          }));
        }
        return;
      }

      const [
        profileResult,
        rolesResult,
        directoryResult,
        assistantsResult,
        conversationsResult,
        conversationMembersResult,
        settingsResult,
        blocksResult,
        usageResult,
        groupsResult,
        messagesResult,
        groupAssistantsResult,
        reportsResult,
        auditLogsResult,
        appSettingsResult,
        developerProfileResult,
        announcementsResult,
      ] = await Promise.all([
        sb.from('profiles')
          .select('id,full_name,avatar_path,about,title,status,last_seen_at,is_online,theme_preference,created_at,updated_at')
          .eq('id', user.id)
          .maybeSingle(),
        // RLS returns the caller's roles, or all roles only for a Super Admin.
        sb.from('user_roles').select('*'),
        // RLS returns active profiles to members and all profiles to active admins.
        sb.from('profiles')
          .select('id,full_name,avatar_path,about,title,status,last_seen_at,is_online,theme_preference,created_at,updated_at')
          .order('full_name', { ascending: true })
          .limit(1000),
        sb.from('ai_assistants').select('*').order('created_at', { ascending: false }).limit(1000),
        sb.from('conversations').select('*').order('updated_at', { ascending: false }).limit(1000),
        sb.from('conversation_members').select('*').limit(2000),
        sb.from('user_settings').select('*').eq('user_id', user.id).maybeSingle(),
        sb.from('user_blocks').select('*').eq('blocker_user_id', user.id),
        sb.from('assistant_usage').select('*').order('created_at', { ascending: false }).limit(1000),
        sb.from('groups').select('*'),
        sb.from('messages').select('*').order('created_at', { ascending: false }).limit(1000),
        sb.from('group_assistants').select('*'),
        sb.from('reports').select('*').order('created_at', { ascending: false }).limit(1000),
        sb.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(1000),
        sb.from('app_settings').select('*').order('key', { ascending: true }),
        sb.from('developer_profile').select('*').eq('id', 1).maybeSingle(),
        sb.from('announcements').select('*').order('created_at', { ascending: false }).limit(100),
      ]);

      if (!active) return;
      if (profileResult.error || !profileResult.data || rolesResult.error) {
        setState((prev) => ({ ...prev, currentUserId: null }));
        return;
      }

      const ownProfileRaw = { ...profileResult.data, email: user.email ?? null } as Profile;
      const profileRowsRaw = (directoryResult.data || []).map((row) => ({
        ...row,
        email: row.id === user.id ? user.email ?? null : null,
      })) as Profile[];
      const rawProfiles = profileRowsRaw.some((row) => row.id === user.id)
        ? profileRowsRaw
        : [ownProfileRaw, ...profileRowsRaw];
      const avatarPaths = Array.from(new Set(rawProfiles
        .map((profile) => profile.avatar_path)
        .filter((path): path is string => Boolean(path))));
      const signedAvatarMap = new Map<string, string>();
      if (avatarPaths.length) {
        const { data: signedAvatars } = await sb.storage.from('avatars').createSignedUrls(avatarPaths, 604800);
        (signedAvatars || []).forEach((item) => {
          if (item.path && item.signedUrl) signedAvatarMap.set(item.path, item.signedUrl);
        });
      }
      if (!active) return;
      const profiles = rawProfiles.map((profile) => ({
        ...profile,
        avatar_path: profile.avatar_path ? signedAvatarMap.get(profile.avatar_path) || null : null,
      })) as Profile[];
      const ownProfile = profiles.find((profile) => profile.id === user.id) || ownProfileRaw;
      const allRoleRows = (rolesResult.data || []) as Array<{
        id: string; user_id: string; role: AppRole; granted_by: string | null; created_at: string;
      }>;
      const ownRoles = allRoleRows.filter((row) => row.user_id === user.id);
      const nowIso = new Date().toISOString();
      const defaultSettings: UserSettings = {
        user_id: user.id,
        show_last_seen: true,
        show_online_status: true,
        read_receipts_enabled: true,
        notify_messages: true,
        notify_groups: true,
        notify_ai_replies: true,
        disappearing_timer: 'off',
        auto_download_media: 'wifi',
        created_at: ownProfile.created_at,
        updated_at: ownProfile.updated_at || nowIso,
      };
      const userSettings = settingsResult.data || defaultSettings;
      const messageRows = messagesResult.data || [];
      const messageIds = messageRows.map((row) => row.id);
      const attachmentsResult = messageIds.length
        ? await sb.from('attachments').select('*').in('message_id', messageIds)
        : { data: [], error: null };
      const rawAttachments = (attachmentsResult.data || []) as Attachment[];
      const attachmentSignedMap = new Map<string, string>();
      const attachmentBuckets = new Map<string, string[]>();
      rawAttachments.forEach((item) => {
        const paths = attachmentBuckets.get(item.bucket_id) || [];
        paths.push(item.object_path);
        attachmentBuckets.set(item.bucket_id, paths);
      });
      await Promise.all(Array.from(attachmentBuckets.entries()).map(async ([bucketId, paths]) => {
        const { data: signedFiles } = await sb.storage.from(bucketId).createSignedUrls(Array.from(new Set(paths)), 604800);
        (signedFiles || []).forEach((item) => {
          if (item.path && item.signedUrl) attachmentSignedMap.set(`${bucketId}:${item.path}`, item.signedUrl);
        });
      }));
      const attachments = rawAttachments.map((item) => ({
        ...item,
        preview_url: attachmentSignedMap.get(`${item.bucket_id}:${item.object_path}`) || null,
      })) as Attachment[];
      const rawAssistants = (assistantsResult.data || []) as AIAssistant[];
      const assistantAvatarPaths = Array.from(new Set(rawAssistants
        .map((assistant) => assistant.avatar_path)
        .filter((path): path is string => Boolean(path))));
      const signedAssistantAvatarMap = new Map<string, string>();
      if (assistantAvatarPaths.length) {
        const { data: signedAssistantAvatars } = await sb.storage.from('avatars').createSignedUrls(assistantAvatarPaths, 604800);
        (signedAssistantAvatars || []).forEach((item) => {
          if (item.path && item.signedUrl) signedAssistantAvatarMap.set(item.path, item.signedUrl);
        });
      }
      if (!active) return;
      const assistants = rawAssistants.map((assistant) => ({
        ...assistant,
        avatar_url: assistant.avatar_path ? signedAssistantAvatarMap.get(assistant.avatar_path) || null : null,
      })) as AIAssistant[];
      const sortedMessages = [...messageRows].sort((a, b) => a.created_at.localeCompare(b.created_at));

      setState((prev) => ({
        ...prev,
        currentUserId: user.id,
        profiles,
        userRoles: allRoleRows,
        userSettings: { ...prev.userSettings, [user.id]: userSettings as UserSettings },
        assistants,
        conversations: (conversationsResult.data || []) as Conversation[],
        conversationMembers: (conversationMembersResult.data || []) as AdiChatStoreState['conversationMembers'],
        groups: (groupsResult.data || []) as GroupMetadata[],
        messages: sortedMessages as Message[],
        attachments,
        groupAssistants: (groupAssistantsResult.data || []) as GroupAssistant[],
        assistantUsage: (usageResult.data || []) as AssistantUsage[],
        userBlocks: (blocksResult.data || []) as AdiChatStoreState['userBlocks'],
        reports: (reportsResult.data || []) as ModerationReport[],
        auditLogs: (auditLogsResult.data || []) as AuditLog[],
        appSettings: (appSettingsResult.data || []) as AppSetting[],
        developerProfile: (developerProfileResult.data as DeveloperProfile | null) ?? prev.developerProfile,
        announcements: (announcementsResult.data || []) as Announcement[],
      }));
    };

    const hydrateAndMarkReady = async (user: { id: string; email?: string | null } | null) => {
      const version = ++hydrationVersion;
      try {
        await hydrateIdentity(user);
      } catch (error) {
        console.error('AdiChat session restoration failed.', error);
      } finally {
        if (active && version === hydrationVersion) setIsAuthReady(true);
      }
    };

    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      void Promise.resolve().then(() => hydrateAndMarkReady(session?.user ?? null));
    });
    void sb.auth.getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        return hydrateAndMarkReady(data.session?.user ?? null);
      })
      .catch((error: unknown) => {
        console.error('AdiChat could not restore the Supabase session.', error);
        if (active) setIsAuthReady(true);
      });

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
          const message = (error?.message || '').toLowerCase();
          if (message.includes('email not confirmed') || message.includes('email_not_confirmed')) {
            return { ok: false, error: 'Your email address is not verified yet. Use the resend confirmation option below, then check your inbox.' };
          }
          if (message.includes('invalid login credentials')) {
            return { ok: false, error: 'Email or password is incorrect. Please check both and try again.' };
          }
          return { ok: false, error: error?.message || 'Unable to sign in right now. Please try again.' };
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
        const { data, error } = await sb.auth.signUp({
          email: normalizedEmail,
          password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (error) return { ok: false, error: error.message };
        return { ok: true, requiresEmailVerification: !data.session };
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
        userSettings: {},
        assistants: [],
        conversations: [],
        conversationMembers: [],
        groups: [],
        messages: [],
        attachments: [],
        groupAssistants: [],
        assistantUsage: [],
        userBlocks: [],
        reports: [],
        auditLogs: [],
        appSettings: [],
        announcements: [],
        developerProfile: SEED_DATA.developerProfile,
      }));
    } else {
      setState((prev) => ({ ...prev, currentUserId: null }));
    }
  }, []);

  const updateMyProfile = useCallback(
    async (updates: Partial<Pick<Profile, 'full_name' | 'about' | 'title' | 'theme_preference' | 'avatar_path'>>) => {
      if (!state.currentUserId) return;
      if (!IS_DEMO_MODE) {
        const sb = getSupabaseClient();
        if (!sb) {
          pushToast('Profile service is unavailable.', 'error');
          return;
        }
        if (updates.avatar_path !== undefined && updates.avatar_path !== null) {
          pushToast('Use the secure avatar upload action to change your photo.', 'error');
          return;
        }
        const patch: Record<string, unknown> = {};
        for (const key of ['full_name', 'about', 'title', 'theme_preference'] as const) {
          if (updates[key] !== undefined) patch[key] = updates[key];
        }
        let oldAvatarPath: string | null = null;
        if (updates.avatar_path === null) {
          const current = await sb.from('profiles').select('avatar_path').eq('id', state.currentUserId).maybeSingle();
          oldAvatarPath = current.data?.avatar_path || null;
          patch.avatar_path = null;
        }
        if (!Object.keys(patch).length) return;
        const { data, error } = await sb.from('profiles')
          .update(patch)
          .eq('id', state.currentUserId)
          .select('id,full_name,avatar_path,about,title,status,last_seen_at,is_online,theme_preference,created_at,updated_at')
          .maybeSingle();
        if (error || !data) {
          pushToast('Profile could not be saved. Please try again.', 'error');
          return;
        }
        if (oldAvatarPath) {
          await sb.storage.from('avatars').remove([oldAvatarPath]);
        }
        setState((prev) => ({
          ...prev,
          profiles: prev.profiles.map((profile) =>
            profile.id === state.currentUserId
              ? { ...profile, ...data, email: profile.email ?? null, avatar_path: updates.avatar_path === null ? null : profile.avatar_path }
              : profile
          ),
        }));
        pushToast('Profile saved', 'success');
        return;
      }
      const nowIso = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        profiles: prev.profiles.map((profile) =>
          profile.id === prev.currentUserId ? { ...profile, ...updates, updated_at: nowIso } : profile
        ),
      }));
      pushToast('Profile saved', 'success');
    },
    [state.currentUserId, pushToast]
  );

  const uploadAvatar = useCallback(
    async (file: File) => {
      if (!state.currentUserId) return;
      if (file.size > 2 * 1024 * 1024) {
        pushToast('Profile photo must be under 2 MB.', 'error');
        return;
      }
      const extensionByType: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/gif': 'gif',
      };
      const extension = extensionByType[file.type];
      if (!extension) {
        pushToast('Use a JPG, PNG, WEBP, or GIF image.', 'error');
        return;
      }
      if (IS_DEMO_MODE) {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            setState((prev) => ({
              ...prev,
              profiles: prev.profiles.map((profile) =>
                profile.id === prev.currentUserId
                  ? { ...profile, avatar_path: reader.result as string, updated_at: new Date().toISOString() }
                  : profile
              ),
            }));
          }
        };
        reader.readAsDataURL(file);
        return;
      }

      const sb = getSupabaseClient();
      if (!sb) {
        pushToast('Profile storage is unavailable.', 'error');
        return;
      }
      const userId = state.currentUserId;
      const current = await sb.from('profiles').select('avatar_path').eq('id', userId).maybeSingle();
      const oldAvatarPath = current.data?.avatar_path || null;
      const objectPath = `${userId}/${crypto.randomUUID()}.${extension}`;
      const upload = await sb.storage.from('avatars').upload(objectPath, file, {
        upsert: false,
        contentType: file.type,
        cacheControl: '3600',
      });
      if (upload.error) {
        pushToast('Profile photo upload failed. Please try again.', 'error');
        return;
      }
      const updated = await sb.from('profiles')
        .update({ avatar_path: objectPath })
        .eq('id', userId)
        .select('id')
        .maybeSingle();
      if (updated.error || !updated.data) {
        await sb.storage.from('avatars').remove([objectPath]);
        pushToast('Profile photo could not be saved.', 'error');
        return;
      }
      const signed = await sb.storage.from('avatars').createSignedUrl(objectPath, 604800);
      if (oldAvatarPath && oldAvatarPath !== objectPath) {
        await sb.storage.from('avatars').remove([oldAvatarPath]);
      }
      setState((prev) => ({
        ...prev,
        profiles: prev.profiles.map((profile) =>
          profile.id === userId
            ? { ...profile, avatar_path: signed.data?.signedUrl || null, updated_at: new Date().toISOString() }
            : profile
        ),
      }));
      pushToast(signed.data?.signedUrl ? 'Profile photo updated' : 'Profile photo saved; it will appear after refresh.', 'success');
    },
    [state.currentUserId, pushToast]
  );

  const updateMySettings = useCallback(
    async (updates: Partial<UserSettings>) => {
      if (!state.currentUserId) return;
      const userId = state.currentUserId;
      const nowIso = new Date().toISOString();
      const allowedKeys = [
        'show_last_seen',
        'show_online_status',
        'read_receipts_enabled',
        'notify_messages',
        'notify_groups',
        'notify_ai_replies',
        'disappearing_timer',
        'auto_download_media',
      ] as const;
      const patch: Record<string, unknown> = {};
      for (const key of allowedKeys) {
        if (updates[key] !== undefined) patch[key] = updates[key];
      }
      if (!Object.keys(patch).length) return;
      if (!IS_DEMO_MODE) {
        const sb = getSupabaseClient();
        if (!sb) {
          pushToast('Settings service is unavailable.', 'error');
          return;
        }
        const { data, error } = await sb.from('user_settings')
          .upsert({ user_id: userId, ...patch, updated_at: nowIso }, { onConflict: 'user_id' })
          .select('*')
          .maybeSingle();
        if (error || !data) {
          pushToast('Settings could not be saved. Please try again.', 'error');
          return;
        }
        setState((prev) => ({
          ...prev,
          userSettings: { ...prev.userSettings, [userId]: data as UserSettings },
        }));
        return;
      }
      setState((prev) => {
        const current = prev.userSettings[userId] || {
          user_id: userId,
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
            [userId]: { ...current, ...patch, updated_at: nowIso },
          },
        };
      });
    },
    [state.currentUserId, pushToast]
  );

  const getOrCreateDirectConversation = useCallback(
    async (otherUserId: string): Promise<Conversation | null> => {
      if (!state.currentUserId || state.currentUserId === otherUserId) return null;
      const pairKey = buildDirectPairKey(state.currentUserId, otherUserId);
      const existing = state.conversations.find((c) => c.type === 'direct' && c.direct_pair_key === pairKey);
      if (existing) return existing;

      if (!IS_DEMO_MODE) {
        const sb = getSupabaseClient();
        if (!sb) return null;
        const { data: conversationId, error } = await sb.rpc('create_direct_conversation', {
          other_user_id: otherUserId,
        });
        if (error || !conversationId) {
          const message = error?.message?.toLowerCase().includes('block')
            ? 'This conversation cannot be started because a participant has blocked the other.'
            : 'Unable to start this conversation. Please try again.';
          pushToast(message, 'error');
          return null;
        }
        const [conversationResult, membersResult] = await Promise.all([
          sb.from('conversations').select('*').eq('id', conversationId).maybeSingle(),
          sb.from('conversation_members').select('*').eq('conversation_id', conversationId),
        ]);
        if (conversationResult.error || !conversationResult.data || membersResult.error) {
          pushToast('Conversation was created but could not be loaded. Please refresh.', 'error');
          return null;
        }
        const savedConversation = conversationResult.data as Conversation;
        setState((prev) => ({
          ...prev,
          conversations: [
            savedConversation,
            ...prev.conversations.filter((item) => item.id !== savedConversation.id),
          ],
          conversationMembers: [
            ...prev.conversationMembers.filter((item) => item.conversation_id !== savedConversation.id),
            ...(membersResult.data || []) as AdiChatStoreState['conversationMembers'],
          ],
        }));
        return savedConversation;
      }

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
    [state.currentUserId, state.conversations, state.profiles, pushToast]
  );

  const markConversationRead = useCallback(
    async (conversationId: string): Promise<void> => {
      if (!state.currentUserId) return;
      if (!IS_DEMO_MODE) {
        const sb = getSupabaseClient();
        if (!sb) return;
        const relevantMessages = state.messages
          .filter((message) => message.conversation_id === conversationId && !message.deleted_at)
          .sort((a, b) => a.created_at.localeCompare(b.created_at));
        const lastMessageId = relevantMessages.length
          ? relevantMessages[relevantMessages.length - 1].id
          : null;
        const { error } = await sb.rpc('set_message_read', {
          conv_id: conversationId,
          last_msg_id: lastMessageId,
        });
        if (error) {
          pushToast('Unable to update read status right now.', 'error');
          return;
        }
      }
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
    [state.currentUserId, state.messages, pushToast]
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

      if (!IS_DEMO_MODE) {
        if (options?.attachment || options?.durationMs || msgType !== 'text') {
          const message = 'Secure media and voice uploads are still being connected. Text messages are available now.';
          pushToast(message, 'info');
          return { ok: false, error: message };
        }
        const sb = getSupabaseClient();
        if (!sb) return { ok: false, error: 'Messaging service is unavailable.' };
        const { data: messageId, error } = await sb.rpc('send_conversation_message', {
          p_conversation_id: conversationId,
          p_body: trimmed,
          p_message_type: 'text',
          p_metadata: {},
          p_reply_to_message_id: null,
        });
        if (error || !messageId) {
          const raw = (error?.message || '').toLowerCase();
          const message = raw.includes('blocked')
            ? 'Message could not be sent because a participant has blocked the other.'
            : raw.includes('only group admins')
              ? 'Only Group Admins can send messages in this group.'
              : 'Message could not be sent. Please try again.';
          pushToast(message, 'error');
          return { ok: false, error: message };
        }

        const nowIso = new Date().toISOString();
        const optimisticMessage: Message = {
          id: messageId as string,
          conversation_id: conversationId,
          sender_user_id: state.currentUserId,
          sender_assistant_id: null,
          message_type: 'text',
          body: trimmed,
          reply_to_message_id: null,
          delivery_status: 'sent',
          metadata: {},
          created_at: nowIso,
          edited_at: null,
          deleted_at: null,
        };
        setState((prev) => ({
          ...prev,
          messages: [...prev.messages.filter((item) => item.id !== optimisticMessage.id), optimisticMessage],
          conversations: prev.conversations.map((item) =>
            item.id === conversationId
              ? { ...item, last_message_id: optimisticMessage.id, last_message_at: nowIso, updated_at: nowIso }
              : item
          ),
        }));

        const [savedMessage, savedConversation] = await Promise.all([
          sb.from('messages').select('*').eq('id', messageId).maybeSingle(),
          sb.from('conversations').select('*').eq('id', conversationId).maybeSingle(),
        ]);
        if (savedMessage.data) {
          setState((prev) => ({
            ...prev,
            messages: [
              ...prev.messages.filter((item) => item.id !== savedMessage.data.id),
              savedMessage.data as Message,
            ].sort((a, b) => a.created_at.localeCompare(b.created_at)),
          }));
        }
        if (savedConversation.data) {
          setState((prev) => ({
            ...prev,
            conversations: prev.conversations.map((item) =>
              item.id === conversationId ? savedConversation.data as Conversation : item
            ),
          }));
        }
        return { ok: true };
      }

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
              conversationId,
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
    async (input: {
      name: string;
      description: string;
      memberIds: string[];
      assistantIds: string[];
      onlyAdminsSend?: boolean;
      allowAiAutoRespond?: boolean;
    }): Promise<Conversation | null> => {
      if (!state.currentUserId) return null;
      if (!IS_DEMO_MODE) {
        const sb = getSupabaseClient();
        if (!sb) return null;
        const { data: conversationId, error } = await sb.rpc('create_group_with_settings', {
          p_group_name: input.name.trim(),
          p_group_description: input.description.trim() || null,
          p_member_ids: input.memberIds,
          p_assistant_ids: input.assistantIds,
          p_only_admins_send: Boolean(input.onlyAdminsSend),
          p_allow_ai_auto_respond: input.allowAiAutoRespond ?? true,
        });
        if (error || !conversationId) {
          const raw = (error?.message || '').toLowerCase();
          const message = raw.includes('at least one other active group member')
            ? 'Select at least one other active member.'
            : raw.includes('active accounts')
              ? 'One or more selected members are not active.'
              : raw.includes('enabled ai assistants')
                ? 'Only your enabled AI assistants can be added.'
                : 'Group could not be created. Please review your selections and try again.';
          pushToast(message, 'error');
          return null;
        }

        const [conversationResult, groupResult, membersResult, assistantsResult, messagesResult] = await Promise.all([
          sb.from('conversations').select('*').eq('id', conversationId).maybeSingle(),
          sb.from('groups').select('*').eq('conversation_id', conversationId).maybeSingle(),
          sb.from('conversation_members').select('*').eq('conversation_id', conversationId),
          sb.from('group_assistants').select('*').eq('group_conversation_id', conversationId),
          sb.from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true }),
        ]);
        if (
          conversationResult.error || !conversationResult.data ||
          groupResult.error || !groupResult.data ||
          membersResult.error || assistantsResult.error || messagesResult.error
        ) {
          pushToast('Group created, but its details could not be loaded. Refresh the page to continue.', 'error');
          return null;
        }

        const savedConversation = conversationResult.data as Conversation;
        setState((prev) => ({
          ...prev,
          conversations: [savedConversation, ...prev.conversations.filter((item) => item.id !== savedConversation.id)],
          groups: [groupResult.data as GroupMetadata, ...prev.groups.filter((item) => item.conversation_id !== conversationId)],
          conversationMembers: [
            ...prev.conversationMembers.filter((item) => item.conversation_id !== conversationId),
            ...(membersResult.data || []) as AdiChatStoreState['conversationMembers'],
          ],
          groupAssistants: [
            ...prev.groupAssistants.filter((item) => item.group_conversation_id !== conversationId),
            ...(assistantsResult.data || []) as GroupAssistant[],
          ],
          messages: [
            ...prev.messages.filter((item) => item.conversation_id !== conversationId),
            ...(messagesResult.data || []) as Message[],
          ],
        }));
        pushToast(`Group "${input.name.trim()}" created`, 'success');
        return savedConversation;
      }
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
    async (
      groupId: string,
      updates: Partial<Pick<GroupMetadata, 'name' | 'description' | 'only_admins_send' | 'allow_ai_auto_respond'>>
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!state.currentUserId) return { ok: false, error: 'Unauthorized' };
      const allowed = isAdmin || isGroupAdmin(state.conversationMembers, groupId, state.currentUserId);
      if (!allowed) return { ok: false, error: 'Only Group Admins or platform admins can edit group details.' };

      if (!IS_DEMO_MODE) {
        const sb = getSupabaseClient();
        if (!sb) return { ok: false, error: 'Group service is unavailable.' };
        const current = state.groups.find((group) => group.conversation_id === groupId);
        if (!current) return { ok: false, error: 'Group not found.' };
        const next = {
          name: updates.name ?? current.name,
          description: updates.description !== undefined ? updates.description : current.description,
          only_admins_send: updates.only_admins_send ?? current.only_admins_send,
          allow_ai_auto_respond: updates.allow_ai_auto_respond ?? current.allow_ai_auto_respond,
        };
        const { error } = await sb.rpc('update_group_settings', {
          p_group_id: groupId,
          p_group_name: next.name,
          p_group_description: next.description,
          p_only_admins_send: next.only_admins_send,
          p_allow_ai_auto_respond: next.allow_ai_auto_respond,
        });
        if (error) {
          pushToast('Group settings could not be saved. Please try again.', 'error');
          return { ok: false, error: 'Group settings could not be saved.' };
        }
        const [groupResult, conversationResult] = await Promise.all([
          sb.from('groups').select('*').eq('conversation_id', groupId).maybeSingle(),
          sb.from('conversations').select('*').eq('id', groupId).maybeSingle(),
        ]);
        if (groupResult.data) {
          setState((prev) => ({
            ...prev,
            groups: prev.groups.map((group) => group.conversation_id === groupId ? groupResult.data as GroupMetadata : group),
            conversations: prev.conversations.map((conversation) => conversation.id === groupId && conversationResult.data
              ? conversationResult.data as Conversation
              : conversation),
          }));
        }
        pushToast('Group updated', 'success');
        return { ok: true };
      }

      const nowIso = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        groups: prev.groups.map((group) =>
          group.conversation_id === groupId ? { ...group, ...updates, updated_at: nowIso } : group
        ),
        conversations: prev.conversations.map((conversation) =>
          conversation.id === groupId && updates.name
            ? { ...conversation, title: updates.name.trim(), updated_at: nowIso }
            : conversation
        ),
        auditLogs: isAdmin
          ? appendAuditLog(prev, 'admin_update_group', 'group', groupId, { fields: Object.keys(updates) })
          : prev.auditLogs,
      }));
      pushToast('Group updated', 'success');
      return { ok: true };
    },
    [state.currentUserId, state.conversationMembers, state.groups, isAdmin, appendAuditLog, pushToast]
  );

  const addGroupMembers = useCallback(
    async (groupId: string, memberIds: string[]): Promise<{ ok: boolean; error?: string }> => {
      if (!state.currentUserId) return { ok: false, error: 'Unauthorized' };
      const existingIds = new Set(
        state.conversationMembers.filter((member) => member.conversation_id === groupId).map((member) => member.user_id)
      );
      const toAdd = memberIds.filter((id) => !existingIds.has(id));
      if (toAdd.length === 0) return { ok: false, error: 'Selected users are already in this group.' };

      if (!IS_DEMO_MODE) {
        const sb = getSupabaseClient();
        if (!sb) return { ok: false, error: 'Group service is unavailable.' };
        const { error } = await sb.rpc('add_group_members', { group_id: groupId, member_ids: toAdd });
        if (error) {
          const message = error.message.toLowerCase().includes('active accounts')
            ? 'Only active users can be added to a group.'
            : 'Members could not be added. Check your group permissions and try again.';
          pushToast(message, 'error');
          return { ok: false, error: message };
        }
        const { data, error: refreshError } = await sb.from('conversation_members').select('*').eq('conversation_id', groupId);
        if (refreshError || !data) {
          pushToast('Members were added, but the group roster could not be refreshed.', 'error');
          return { ok: false, error: 'Group roster refresh failed.' };
        }
        setState((prev) => ({
          ...prev,
          conversationMembers: [
            ...prev.conversationMembers.filter((member) => member.conversation_id !== groupId),
            ...(data as AdiChatStoreState['conversationMembers']),
          ],
        }));
        pushToast(`Added ${toAdd.length} member(s) to group`, 'success');
        return { ok: true };
      }

      const nowIso = new Date().toISOString();
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
      setState((prev) => ({ ...prev, conversationMembers: [...prev.conversationMembers, ...newRows] }));
      pushToast(`Added ${toAdd.length} member(s) to group`, 'success');
      return { ok: true };
    },
    [state.currentUserId, state.conversationMembers, pushToast]
  );

  const removeGroupMember = useCallback(
    async (groupId: string, targetUserId: string): Promise<{ ok: boolean; error?: string }> => {
      if (!state.currentUserId) return { ok: false, error: 'Unauthorized' };
      const check = canRemoveGroupMember(
        state.conversationMembers,
        groupId,
        state.currentUserId,
        targetUserId,
        isAdmin
      );
      if (!check.allowed) return { ok: false, error: check.reason };

      const actedAsPlatformAdmin =
        isAdmin && !isGroupAdmin(state.conversationMembers, groupId, state.currentUserId);
      if (!IS_DEMO_MODE) {
        const sb = getSupabaseClient();
        if (!sb) return { ok: false, error: 'Group service is unavailable.' };
        const { error } = await sb.rpc('remove_group_member', {
          group_id: groupId,
          target_user_id: targetUserId,
        });
        if (error) {
          pushToast('Member could not be removed. Please check group permissions.', 'error');
          return { ok: false, error: 'Member could not be removed.' };
        }
        if (targetUserId === state.currentUserId) {
          setState((prev) => ({
            ...prev,
            conversations: prev.conversations.filter((conversation) => conversation.id !== groupId),
            groups: prev.groups.filter((group) => group.conversation_id !== groupId),
            conversationMembers: prev.conversationMembers.filter((member) => member.conversation_id !== groupId),
            groupAssistants: prev.groupAssistants.filter((assistant) => assistant.group_conversation_id !== groupId),
            messages: prev.messages.filter((message) => message.conversation_id !== groupId),
          }));
        } else {
          const { data, error: refreshError } = await sb.from('conversation_members').select('*').eq('conversation_id', groupId);
          if (refreshError || !data) {
            pushToast('Member removed, but the group roster could not be refreshed.', 'error');
            return { ok: false, error: 'Group roster refresh failed.' };
          }
          setState((prev) => ({
            ...prev,
            conversationMembers: [
              ...prev.conversationMembers.filter((member) => member.conversation_id !== groupId),
              ...(data as AdiChatStoreState['conversationMembers']),
            ],
          }));
        }
        if (actedAsPlatformAdmin) {
          setState((prev) => ({
            ...prev,
            auditLogs: appendAuditLog(prev, 'admin_remove_group_member', 'group', groupId, { target_user_id: targetUserId }),
          }));
        }
        pushToast(targetUserId === state.currentUserId ? 'You left the group' : 'Member removed from group', 'info');
        return { ok: true };
      }

      setState((prev) => ({
        ...prev,
        conversationMembers: prev.conversationMembers.filter(
          (member) => !(member.conversation_id === groupId && member.user_id === targetUserId)
        ),
        auditLogs: actedAsPlatformAdmin
          ? appendAuditLog(prev, 'admin_remove_group_member', 'group', groupId, { target_user_id: targetUserId })
          : prev.auditLogs,
      }));
      pushToast('Member removed from group', 'info');
      return { ok: true };
    },
    [state.currentUserId, state.conversationMembers, isAdmin, appendAuditLog, pushToast]
  );

  const toggleGroupMute = useCallback(
    async (conversationId: string): Promise<void> => {
      if (!state.currentUserId) return;
      const currentMember = state.conversationMembers.find(
        (member) => member.conversation_id === conversationId && member.user_id === state.currentUserId
      );
      const nextMutedUntil = currentMember?.muted_until ? null : '2099-01-01T00:00:00.000Z';
      if (!IS_DEMO_MODE) {
        const sb = getSupabaseClient();
        if (!sb) return;
        const { data, error } = await sb.from('conversation_members')
          .update({ muted_until: nextMutedUntil })
          .eq('conversation_id', conversationId)
          .eq('user_id', state.currentUserId)
          .select('*')
          .maybeSingle();
        if (error || !data) {
          pushToast('Mute preference could not be saved.', 'error');
          return;
        }
        setState((prev) => ({
          ...prev,
          conversationMembers: prev.conversationMembers.map((member) =>
            member.conversation_id === conversationId && member.user_id === prev.currentUserId
              ? data as AdiChatStoreState['conversationMembers'][number]
              : member
          ),
        }));
        return;
      }
      setState((prev) => ({
        ...prev,
        conversationMembers: prev.conversationMembers.map((member) =>
          member.conversation_id === conversationId && member.user_id === prev.currentUserId
            ? { ...member, muted_until: nextMutedUntil }
            : member
        ),
      }));
    },
    [state.currentUserId, state.conversationMembers, pushToast]
  );

  const toggleBlockUser = useCallback(
    async (targetUserId: string): Promise<boolean> => {
      if (!state.currentUserId || state.currentUserId === targetUserId) return false;
      const userId = state.currentUserId;
      const existing = state.userBlocks.find(
        (block) => block.blocker_user_id === userId && block.blocked_user_id === targetUserId
      );
      if (!IS_DEMO_MODE) {
        const sb = getSupabaseClient();
        if (!sb) return false;
        if (existing) {
          const { error } = await sb.from('user_blocks')
            .delete()
            .eq('blocker_user_id', userId)
            .eq('blocked_user_id', targetUserId);
          if (error) {
            pushToast('User could not be unblocked.', 'error');
            return false;
          }
          setState((prev) => ({
            ...prev,
            userBlocks: prev.userBlocks.filter((block) =>
              !(block.blocker_user_id === userId && block.blocked_user_id === targetUserId)
            ),
          }));
        } else {
          const { data, error } = await sb.from('user_blocks')
            .insert({ blocker_user_id: userId, blocked_user_id: targetUserId })
            .select('*')
            .single();
          if (error || !data) {
            pushToast('User could not be blocked.', 'error');
            return false;
          }
          setState((prev) => ({ ...prev, userBlocks: [data as UserBlock, ...prev.userBlocks] }));
        }
        return true;
      }
      setState((prev) => {
        const exists = prev.userBlocks.some(
          (block) => block.blocker_user_id === userId && block.blocked_user_id === targetUserId
        );
        return {
          ...prev,
          userBlocks: exists
            ? prev.userBlocks.filter((block) => !(block.blocker_user_id === userId && block.blocked_user_id === targetUserId))
            : [...prev.userBlocks, {
                id: `blk_${Date.now()}`,
                blocker_user_id: userId,
                blocked_user_id: targetUserId,
                created_at: new Date().toISOString(),
              }],
        };
      });
      return true;
    },
    [state.currentUserId, state.userBlocks, pushToast]
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
    async (input: {
      targetType: ReportTargetType;
      targetUserId?: string | null;
      targetMessageId?: string | null;
      targetGroupConversationId?: string | null;
      reason: string;
      details?: string;
    }): Promise<{ ok: boolean; error?: string }> => {
      if (!state.currentUserId) return { ok: false, error: 'Sign in required' };
      const reasonClean = input.reason.trim();
      if (!reasonClean) return { ok: false, error: 'Please provide a reason.' };
      const payload = {
        reporter_user_id: state.currentUserId,
        target_type: input.targetType,
        target_user_id: input.targetType === 'user' ? input.targetUserId || null : null,
        target_message_id: input.targetType === 'message' ? input.targetMessageId || null : null,
        target_group_conversation_id: input.targetType === 'group' ? input.targetGroupConversationId || null : null,
        reason: reasonClean,
        details: input.details?.trim() || null,
      };
      if (!IS_DEMO_MODE) {
        const sb = getSupabaseClient();
        if (!sb) return { ok: false, error: 'Reporting service is unavailable.' };
        const { data, error } = await sb.from('reports').insert(payload).select('*').single();
        if (error || !data) {
          pushToast('Report could not be submitted. Please try again.', 'error');
          return { ok: false, error: 'Report could not be submitted.' };
        }
        setState((prev) => ({ ...prev, reports: [data as ModerationReport, ...prev.reports] }));
        pushToast('Report submitted to moderation queue', 'success');
        return { ok: true };
      }
      const nowIso = new Date().toISOString();
      const report: ModerationReport = {
        id: `rep_${Date.now().toString(36)}`,
        ...payload,
        status: 'open',
        assigned_to: null,
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
      role: string;
      scenario: string;
      behaviour: string;
      personality: string;
      instructions: string;
      tone: string;
      language: string;
      starter_prompts: string[];
      avatarFile?: File | null;
      thinking_enabled_default?: boolean;
    }): Promise<AIAssistant | null> => {
      if (!state.currentUserId) return null;
      const nowIso = new Date().toISOString();
      const id = crypto.randomUUID();
      const handle = input.name.replace(/[^a-zA-Z0-9]/g, '') || 'CustomAI';
      const file = input.avatarFile || null;
      const extensionByType: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
      };
      if (file && (!extensionByType[file.type] || file.size > 2 * 1024 * 1024)) {
        pushToast('Assistant photo must be JPG, PNG or WebP and under 2 MB.', 'error');
        return null;
      }

      if (!IS_DEMO_MODE) {
        const sb = getSupabaseClient();
        if (!sb) return null;
        let avatarPath: string | null = null;
        if (file) {
          avatarPath = `${state.currentUserId}/assistants/${id}.${extensionByType[file.type]}`;
          const upload = await sb.storage.from('avatars').upload(avatarPath, file, {
            upsert: false,
            contentType: file.type,
            cacheControl: '3600',
          });
          if (upload.error) {
            pushToast('Assistant photo upload failed. Please try another image.', 'error');
            return null;
          }
        }
        const { data, error } = await sb.from('ai_assistants').insert({
          id,
          owner_user_id: state.currentUserId,
          name: input.name.trim(),
          handle,
          avatar_path: avatarPath,
          description: input.description.trim() || null,
          role: input.role.trim() || null,
          scenario: input.scenario.trim() || null,
          behaviour: input.behaviour.trim() || null,
          personality: input.behaviour.trim() || input.personality.trim() || null,
          instructions: input.instructions.trim(),
          tone: input.tone.trim() || 'Helpful',
          language: input.language.trim() || 'English',
          starter_prompts: input.starter_prompts.filter(Boolean),
          is_enabled: true,
          thinking_enabled_default: input.thinking_enabled_default ?? true,
        }).select('*').single();
        if (error || !data) {
          if (avatarPath) await sb.storage.from('avatars').remove([avatarPath]);
          pushToast(error?.message || 'Unable to save assistant.', 'error');
          return null;
        }
        const signed = avatarPath
          ? await sb.storage.from('avatars').createSignedUrl(avatarPath, 604800)
          : { data: null };
        const savedAssistant = { ...(data as AIAssistant), avatar_url: signed.data?.signedUrl || null };
        setState((prev) => ({ ...prev, assistants: [savedAssistant, ...prev.assistants] }));
        pushToast(`${savedAssistant.name} created`, 'success');
        return savedAssistant;
      }

      const newAssistant: AIAssistant = {
        id,
        owner_user_id: state.currentUserId,
        name: input.name.trim(),
        handle,
        avatar_path: null,
        avatar_url: file ? URL.createObjectURL(file) : null,
        icon_name: 'auto_awesome',
        description: input.description.trim() || null,
        role: input.role.trim() || null,
        scenario: input.scenario.trim() || null,
        behaviour: input.behaviour.trim() || null,
        personality: input.behaviour.trim() || input.personality.trim() || null,
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
    async (assistantId: string, updates: Partial<AIAssistant>, avatarFile?: File | null): Promise<boolean> => {
      const existing = state.assistants.find((assistant) => assistant.id === assistantId);
      if (!existing) return false;
      const nowIso = new Date().toISOString();
      if (!IS_DEMO_MODE) {
        const sb = getSupabaseClient();
        if (!sb) return false;
        const extensionByType: Record<string, string> = {
          'image/jpeg': 'jpg',
          'image/png': 'png',
          'image/webp': 'webp',
        };
        if (avatarFile && (!extensionByType[avatarFile.type] || avatarFile.size > 2 * 1024 * 1024)) {
          pushToast('Assistant photo must be JPG, PNG or WebP and under 2 MB.', 'error');
          return false;
        }
        let uploadedPath: string | null = null;
        if (avatarFile) {
          uploadedPath = `${state.currentUserId}/assistants/${assistantId}-${crypto.randomUUID()}.${extensionByType[avatarFile.type]}`;
          const upload = await sb.storage.from('avatars').upload(uploadedPath, avatarFile, {
            upsert: false,
            contentType: avatarFile.type,
            cacheControl: '3600',
          });
          if (upload.error) {
            pushToast('Assistant photo upload failed. Please try again.', 'error');
            return false;
          }
        }
        const { avatar_url: _avatarUrl, ...safeUpdates } = updates;
        const payload: Record<string, unknown> = { ...safeUpdates, updated_at: nowIso };
        if (uploadedPath) payload.avatar_path = uploadedPath;
        const { data, error } = await sb.from('ai_assistants')
          .update(payload)
          .eq('id', assistantId)
          .select('*')
          .maybeSingle();
        if (error || !data) {
          if (uploadedPath) await sb.storage.from('avatars').remove([uploadedPath]);
          pushToast('Assistant settings could not be saved.', 'error');
          return false;
        }
        if ((uploadedPath || updates.avatar_path === null) && existing.avatar_path) {
          await sb.storage.from('avatars').remove([existing.avatar_path]);
        }
        const savedPath = (data as AIAssistant).avatar_path;
        const signed = savedPath
          ? await sb.storage.from('avatars').createSignedUrl(savedPath, 604800)
          : { data: null };
        const savedAssistant = { ...(data as AIAssistant), avatar_url: signed.data?.signedUrl || null };
        setState((prev) => ({
          ...prev,
          assistants: prev.assistants.map((assistant) => assistant.id === assistantId ? savedAssistant : assistant),
        }));
        pushToast('Assistant settings updated', 'success');
        return true;
      }

      const avatarUrl = avatarFile ? URL.createObjectURL(avatarFile) : updates.avatar_path === null ? null : existing.avatar_url;
      setState((prev) => ({
        ...prev,
        assistants: prev.assistants.map((assistant) =>
          assistant.id === assistantId
            ? { ...assistant, ...updates, avatar_url: avatarUrl, updated_at: nowIso }
            : assistant
        ),
      }));
      pushToast('Assistant settings updated', 'success');
      return true;
    },
    [state.assistants, state.currentUserId, pushToast]
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
    async (
      assistantId: string,
      prompt: string,
      thinkingMode: boolean,
      options?: { file?: File | null; replyToMessageId?: string | null }
    ) => {
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

        let attachment: {
          bucketId: 'chat-attachments';
          objectPath: string;
          fileName: string;
          mimeType: string;
          fileSizeBytes: number;
        } | null = null;
        try {
          const file = options?.file || null;
          if (file) {
            const extension = file.name.split('.').pop()?.toLowerCase() || '';
            const mimeByExtension: Record<string, string> = {
              txt: 'text/plain', md: 'text/markdown', csv: 'text/csv', json: 'application/json',
              log: 'text/plain', xml: 'application/xml', html: 'text/html', css: 'text/css',
              js: 'text/javascript', jsx: 'text/javascript', ts: 'text/typescript', tsx: 'text/typescript',
              py: 'text/x-python', sql: 'application/sql', sh: 'text/x-shellscript',
              yaml: 'text/yaml', yml: 'text/yaml',
            };
            const mimeType = mimeByExtension[extension];
            if (!mimeType || file.size < 1 || file.size > 5 * 1024 * 1024) {
              return { ok: false, error: 'Supported files must be text-based formats and no larger than 5 MB.' };
            }
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120) || `document.${extension}`;
            const objectPath = `${conversationId}/${state.currentUserId}/${crypto.randomUUID()}-${safeName}`;
            const upload = await supabase.storage.from('chat-attachments').upload(objectPath, file, {
              upsert: false,
              contentType: mimeType,
              cacheControl: '3600',
            });
            if (upload.error) {
              return { ok: false, error: 'File upload failed. Please check the file and try again.' };
            }
            attachment = {
              bucketId: 'chat-attachments',
              objectPath,
              fileName: safeName,
              mimeType,
              fileSizeBytes: file.size,
            };
          }
          const response = await requestAssistantReply({
            prompt,
            assistant,
            conversationId,
            thinkingMode,
            replyToMessageId: options?.replyToMessageId || undefined,
            attachment,
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
          const savedMessageIds = savedMessages.map((message) => message.id);
          const attachmentResult = savedMessageIds.length
            ? await supabase.from('attachments').select('*').in('message_id', savedMessageIds)
            : { data: [], error: null };
          const rawNewAttachments = (attachmentResult.data || []) as Attachment[];
          const signedNewAttachments = rawNewAttachments.length
            ? await supabase.storage.from('chat-attachments').createSignedUrls(
                rawNewAttachments.map((item) => item.object_path), 604800
              )
            : { data: [] };
          const signedNewMap = new Map((signedNewAttachments.data || [])
            .filter((item) => item.path && item.signedUrl)
            .map((item) => [item.path, item.signedUrl]));
          const newAttachments = rawNewAttachments.map((item) => ({
            ...item,
            preview_url: signedNewMap.get(item.object_path) || null,
          })) as Attachment[];
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
            attachments: [
              ...prev.attachments.filter((item) => item.conversation_id !== conversationId),
              ...newAttachments,
            ],
          }));

          return { ok: true, model: response.model, latencyMs: response.latencyMs, assistantMessageId: response.assistantMessageId };
        } catch (error) {
          if (attachment) {
            const { data: savedAttachment } = await supabase.from('attachments')
              .select('id')
              .eq('object_path', attachment.objectPath)
              .maybeSingle();
            if (!savedAttachment) {
              await supabase.storage.from('chat-attachments').remove([attachment.objectPath]);
            }
          }
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
        reply_to_message_id: options?.replyToMessageId || null,
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
          conversationId: conv.id,
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

        return { ok: true, model: res.model, latencyMs: res.latencyMs, assistantMessageId: aiMsgId };
      } catch (err) {
        const errMessage = err instanceof Error ? err.message : 'AI request failed.';
        return { ok: false, error: errMessage };
      }
    },
    [state.assistants, state.messages, state.currentUserId, openAssistantConversation]
  );

  const syncGroupAssistants = useCallback(
    async (
      groupId: string,
      selections: Array<{ assistantId: string; responseMode: AssistantResponseMode; enabled: boolean }>
    ): Promise<boolean> => {
      if (!state.currentUserId) return false;
      if (!IS_DEMO_MODE) {
        const sb = getSupabaseClient();
        if (!sb) return false;
        const payload = selections.map((selection) => ({
          assistant_id: selection.assistantId,
          response_mode: selection.responseMode,
          enabled: selection.enabled,
        }));
        const { error } = await sb.rpc('sync_group_assistants', {
          p_group_id: groupId,
          p_selections: payload,
        });
        if (error) {
          const message = error.message.toLowerCase().includes('enabled ai assistants')
            ? 'Only your enabled AI assistants can be added to this group.'
            : 'Group assistants could not be updated.';
          pushToast(message, 'error');
          return false;
        }
        const { data, error: refreshError } = await sb.from('group_assistants')
          .select('*')
          .eq('group_conversation_id', groupId);
        if (refreshError || !data) {
          pushToast('Group assistants were saved, but the list could not be refreshed.', 'error');
          return false;
        }
        setState((prev) => ({
          ...prev,
          groupAssistants: [
            ...prev.groupAssistants.filter((assistant) => assistant.group_conversation_id !== groupId),
            ...(data as GroupAssistant[]),
          ],
        }));
        pushToast('Group AI assistants updated', 'success');
        return true;
      }
      const nowIso = new Date().toISOString();
      setState((prev) => {
        const remaining = prev.groupAssistants.filter((assistant) => assistant.group_conversation_id !== groupId);
        const updatedRows: GroupAssistant[] = selections
          .filter((selection) => selection.enabled)
          .map((selection, index) => ({
            id: `ga_${Date.now()}_${index}`,
            group_conversation_id: groupId,
            assistant_id: selection.assistantId,
            response_mode: selection.responseMode,
            added_by: prev.currentUserId || 'u-adeel',
            is_enabled: true,
            created_at: nowIso,
            updated_at: nowIso,
          }));
        return { ...prev, groupAssistants: [...remaining, ...updatedRows] };
      });
      pushToast('Group AI assistants updated', 'success');
      return true;
    },
    [state.currentUserId, pushToast]
  );

  const adminUpdateUserStatus = useCallback(
    async (userId: string, status: UserStatus, reason = 'Admin console action'): Promise<boolean> => {
      if (!isAdmin) return false;
      if (!IS_DEMO_MODE) {
        const sb = getSupabaseClient();
        if (!sb) return false;
        const { error } = await sb.rpc('admin_update_user_status', {
          target_user_id: userId,
          next_status: status,
          reason,
        });
        if (error) {
          pushToast(error.message.includes('Super Admin') ? error.message : 'User status could not be updated.', 'error');
          return false;
        }
        const [profileResult, logsResult] = await Promise.all([
          sb.from('profiles').select('id,status,updated_at').eq('id', userId).maybeSingle(),
          sb.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(1000),
        ]);
        setState((prev) => ({
          ...prev,
          profiles: profileResult.data
            ? prev.profiles.map((profile) => profile.id === userId
                ? { ...profile, status: profileResult.data?.status ?? profile.status, updated_at: profileResult.data?.updated_at ?? profile.updated_at }
                : profile)
            : prev.profiles,
          auditLogs: (logsResult.data || prev.auditLogs) as AuditLog[],
        }));
        pushToast(`User status updated to ${status}`, 'success');
        return true;
      }
      const nowIso = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        profiles: prev.profiles.map((profile) =>
          profile.id === userId ? { ...profile, status, updated_at: nowIso } : profile
        ),
        auditLogs: appendAuditLog(prev, 'admin_update_user_status', 'user', userId, {
          next_status: status,
          reason,
        }),
      }));
      pushToast(`User status updated to ${status}`, 'success');
      return true;
    },
    [isAdmin, appendAuditLog, pushToast]
  );

  const adminBulkUpdateUserStatus = useCallback(
    async (userIds: string[], status: UserStatus, reason = 'Bulk moderation action'): Promise<number> => {
      if (!isAdmin || userIds.length === 0) return 0;
      const superAdminIds = new Set(state.userRoles.filter((role) => role.role === 'super_admin').map((role) => role.user_id));
      const eligible = userIds.filter((id) => !superAdminIds.has(id));
      if (!eligible.length) {
        pushToast('No eligible accounts were selected.', 'info');
        return 0;
      }
      if (!IS_DEMO_MODE) {
        const sb = getSupabaseClient();
        if (!sb) return 0;
        const results = await Promise.all(eligible.map((userId) =>
          sb.rpc('admin_update_user_status', { target_user_id: userId, next_status: status, reason })
        ));
        const successIds = eligible.filter((_, index) => !results[index].error);
        const [profilesResult, logsResult] = await Promise.all([
          successIds.length
            ? sb.from('profiles').select('id,status,updated_at').in('id', successIds)
            : Promise.resolve({ data: [], error: null }),
          sb.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(1000),
        ]);
        setState((prev) => ({
          ...prev,
          profiles: prev.profiles.map((profile) => {
            const updated = (profilesResult.data || []).find((row) => row.id === profile.id);
            return updated ? { ...profile, status: updated.status, updated_at: updated.updated_at } : profile;
          }),
          auditLogs: (logsResult.data || prev.auditLogs) as AuditLog[],
        }));
        pushToast(`Updated ${successIds.length} of ${eligible.length} selected account(s).`, successIds.length ? 'success' : 'error');
        return successIds.length;
      }
      const idSet = new Set(eligible);
      const nowIso = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        profiles: prev.profiles.map((profile) => idSet.has(profile.id) ? { ...profile, status, updated_at: nowIso } : profile),
        auditLogs: appendAuditLog(prev, 'admin_bulk_user_status', 'user_batch', eligible.join(','), {
          count: eligible.length, next_status: status, reason,
        }),
      }));
      pushToast(`Updated ${eligible.length} user(s) to ${status}`, 'success');
      return eligible.length;
    },
    [isAdmin, state.userRoles, appendAuditLog, pushToast]
  );

  const adminDeleteUser = useCallback(
    (userId: string) => {
      if (!isAdmin) return { ok: false, error: 'Admin access required.' };
      const isTargetSuper = state.userRoles.some((role) => role.user_id === userId && role.role === 'super_admin');
      if (isTargetSuper) return { ok: false, error: 'Super Admin account cannot be deleted.' };
      if (!IS_DEMO_MODE) {
        const error = 'Permanent user deletion is disabled in production to protect account history. Use suspend or ban instead.';
        pushToast(error, 'info');
        return { ok: false, error };
      }
      setState((prev) => ({
        ...prev,
        profiles: prev.profiles.filter((profile) => profile.id !== userId),
        userRoles: prev.userRoles.filter((role) => role.user_id !== userId),
        conversationMembers: prev.conversationMembers.filter((member) => member.user_id !== userId),
        auditLogs: appendAuditLog(prev, 'admin_delete_user', 'user', userId, {}),
      }));
      pushToast('User account removed from demo workspace', 'info');
      return { ok: true };
    },
    [isAdmin, state.userRoles, appendAuditLog, pushToast]
  );

  const adminSetUserRole = useCallback(
    async (userId: string, role: AppRole): Promise<{ ok: boolean; error?: string }> => {
      if (!isSuperAdminUser) return { ok: false, error: 'Only a Super Admin can grant or revoke application roles.' };
      if (!IS_DEMO_MODE) {
        const sb = getSupabaseClient();
        if (!sb) return { ok: false, error: 'Role service is unavailable.' };
        const { error } = await sb.rpc('admin_set_user_role', {
          target_user_id: userId,
          next_role: role,
        });
        if (error) {
          pushToast(error.message, 'error');
          return { ok: false, error: error.message };
        }
        const [rolesResult, logsResult] = await Promise.all([
          sb.from('user_roles').select('*'),
          sb.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(1000),
        ]);
        setState((prev) => ({
          ...prev,
          userRoles: (rolesResult.data || prev.userRoles) as AdiChatStoreState['userRoles'],
          auditLogs: (logsResult.data || prev.auditLogs) as AuditLog[],
        }));
        pushToast(`Role updated to ${role}`, 'success');
        return { ok: true };
      }
      const nowIso = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        userRoles: [
          ...prev.userRoles.filter((item) => !(item.user_id === userId && ['admin','super_admin'].includes(item.role))),
          { id: `role_${userId}_${Date.now()}`, user_id: userId, role, granted_by: prev.currentUserId, created_at: nowIso },
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
      if (!IS_DEMO_MODE) {
        pushToast('Permanent group deletion is disabled in production to preserve messages and audit history.', 'info');
        return;
      }
      setState((prev) => ({
        ...prev,
        conversations: prev.conversations.filter((conversation) => conversation.id !== groupId),
        groups: prev.groups.filter((group) => group.conversation_id !== groupId),
        conversationMembers: prev.conversationMembers.filter((member) => member.conversation_id !== groupId),
        groupAssistants: prev.groupAssistants.filter((assistant) => assistant.group_conversation_id !== groupId),
        auditLogs: appendAuditLog(prev, 'admin_delete_group', 'group', groupId, {}),
      }));
      pushToast('Group removed from demo workspace', 'info');
    },
    [isAdmin, appendAuditLog, pushToast]
  );

  const adminToggleAssistant = useCallback(
    async (assistantId: string, isEnabled: boolean): Promise<boolean> => {
      if (!isAdmin) return false;
      if (!IS_DEMO_MODE) {
        const sb = getSupabaseClient();
        if (!sb) return false;
        const { error } = await sb.rpc('admin_toggle_assistant', {
          p_assistant_id: assistantId,
          p_is_enabled: isEnabled,
        });
        if (error) {
          pushToast('Assistant status could not be changed.', 'error');
          return false;
        }
        const [assistantResult, logsResult] = await Promise.all([
          sb.from('ai_assistants').select('*').eq('id', assistantId).maybeSingle(),
          sb.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(1000),
        ]);
        setState((prev) => ({
          ...prev,
          assistants: assistantResult.data
            ? prev.assistants.map((assistant) => assistant.id === assistantId ? assistantResult.data as AIAssistant : assistant)
            : prev.assistants,
          auditLogs: (logsResult.data || prev.auditLogs) as AuditLog[],
        }));
        pushToast(`Assistant ${isEnabled ? 'enabled' : 'disabled'}`, 'success');
        return true;
      }
      setState((prev) => ({
        ...prev,
        assistants: prev.assistants.map((assistant) => assistant.id === assistantId ? { ...assistant, is_enabled: isEnabled } : assistant),
        auditLogs: appendAuditLog(prev, 'admin_toggle_assistant', 'ai_assistant', assistantId, { is_enabled: isEnabled }),
      }));
      pushToast(`Assistant ${isEnabled ? 'enabled' : 'disabled'}`, 'info');
      return true;
    },
    [isAdmin, appendAuditLog, pushToast]
  );

  const adminDeleteAssistant = useCallback(
    (assistantId: string) => {
      if (!isAdmin) return;
      if (!IS_DEMO_MODE) {
        pushToast('Permanent assistant deletion is disabled in production. Disable the assistant instead.', 'info');
        return;
      }
      setState((prev) => ({
        ...prev,
        assistants: prev.assistants.filter((assistant) => assistant.id !== assistantId),
        groupAssistants: prev.groupAssistants.filter((assistant) => assistant.assistant_id !== assistantId),
        auditLogs: appendAuditLog(prev, 'admin_delete_assistant', 'ai_assistant', assistantId, {}),
      }));
      pushToast('Assistant removed from demo workspace', 'info');
    },
    [isAdmin, appendAuditLog, pushToast]
  );

  const adminResolveReport = useCallback(
    async (
      reportId: string,
      status: ReportStatus,
      note: string,
      action: 'none' | 'warn' | 'suspend' | 'ban' | 'delete_message' = 'none'
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!isAdmin) return { ok: false, error: 'Admin access required.' };
      if (!IS_DEMO_MODE) {
        const sb = getSupabaseClient();
        if (!sb) return { ok: false, error: 'Moderation service is unavailable.' };
        const { error } = await sb.rpc('admin_resolve_report_with_action', {
          p_report_id: reportId,
          p_next_status: status,
          p_note: note,
          p_action: action,
        });
        if (error) {
          pushToast(error.message, 'error');
          return { ok: false, error: error.message };
        }
        const targetReport = state.reports.find((report) => report.id === reportId);
        const [reportsResult, profilesResult, messageResult, logsResult] = await Promise.all([
          sb.from('reports').select('*').eq('id', reportId).maybeSingle(),
          sb.from('profiles').select('id,status,updated_at'),
          targetReport?.target_message_id
            ? sb.from('messages').select('id,deleted_at').eq('id', targetReport.target_message_id).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          sb.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(1000),
        ]);
        setState((prev) => ({
          ...prev,
          reports: reportsResult.data
            ? prev.reports.map((report) => report.id === reportId ? reportsResult.data as ModerationReport : report)
            : prev.reports,
          profiles: (action === 'suspend' || action === 'ban') && targetReport?.target_user_id && profilesResult.data
            ? prev.profiles.map((profile) => {
                const updated = profilesResult.data.find((row) => row.id === targetReport.target_user_id);
                return updated ? { ...profile, status: updated.status, updated_at: updated.updated_at } : profile;
              })
            : prev.profiles,
          messages: action === 'delete_message' && targetReport?.target_message_id && messageResult.data
            ? prev.messages.map((message) => message.id === targetReport.target_message_id
                ? { ...message, deleted_at: messageResult.data?.deleted_at ?? message.deleted_at }
                : message)
            : prev.messages,
          auditLogs: (logsResult.data || prev.auditLogs) as AuditLog[],
        }));
        pushToast(`Report marked ${status}`, 'success');
        return { ok: true };
      }

      const nowIso = new Date().toISOString();
      setState((prev) => {
        const report = prev.reports.find((item) => item.id === reportId);
        let nextProfiles = prev.profiles;
        let nextMessages = prev.messages;
        if (report?.target_user_id && (action === 'suspend' || action === 'ban')) {
          const nextStatus: UserStatus = action === 'ban' ? 'banned' : 'suspended';
          nextProfiles = prev.profiles.map((profile) => profile.id === report.target_user_id ? { ...profile, status: nextStatus, updated_at: nowIso } : profile);
        }
        if (report?.target_message_id && action === 'delete_message') {
          nextMessages = prev.messages.map((message) => message.id === report.target_message_id ? { ...message, deleted_at: nowIso } : message);
        }
        return {
          ...prev,
          profiles: nextProfiles,
          messages: nextMessages,
          reports: prev.reports.map((item) => item.id === reportId ? {
            ...item, status, assigned_to: prev.currentUserId, resolution_note: note, resolved_at: nowIso, updated_at: nowIso,
          } : item),
          auditLogs: appendAuditLog(prev, 'admin_resolve_report', 'report', reportId, { status, enforcement_action: action, resolution_note: note }),
        };
      });
      pushToast(`Report marked ${status}`, 'success');
      return { ok: true };
    },
    [isAdmin, state.reports, appendAuditLog, pushToast]
  );

  const adminUpdateDeveloperProfile = useCallback(
    async (updates: Partial<DeveloperProfile>): Promise<boolean> => {
      if (!isAdmin) return false;
      if (!IS_DEMO_MODE) {
        const sb = getSupabaseClient();
        if (!sb) return false;
        const safeUpdates: Record<string, unknown> = { ...updates };
        if (typeof safeUpdates.photo_path === 'string' && safeUpdates.photo_path.startsWith('data:')) {
          delete safeUpdates.photo_path;
          pushToast('Developer photo upload is not available yet; other profile fields will still be saved.', 'info');
        }
        if (!Object.keys(safeUpdates).length) return false;
        const { data, error } = await sb.rpc('admin_update_developer_profile', { p_updates: safeUpdates });
        if (error || !data) {
          pushToast('Developer profile could not be saved.', 'error');
          return false;
        }
        const { data: refreshed } = await sb.from('developer_profile').select('*').eq('id', 1).maybeSingle();
        setState((prev) => ({
          ...prev,
          developerProfile: (refreshed || data) as DeveloperProfile,
        }));
        pushToast('Developer profile saved', 'success');
        return true;
      }
      const nowIso = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        developerProfile: { ...prev.developerProfile, ...updates, updated_by: prev.currentUserId, updated_at: nowIso },
        auditLogs: appendAuditLog(prev, 'admin_update_developer_profile', 'developer_profile', '1', { fields: Object.keys(updates) }),
      }));
      pushToast('Developer profile published', 'success');
      return true;
    },
    [isAdmin, pushToast, appendAuditLog]
  );

  const adminUpdateAppSetting = useCallback(
    async (key: string, value: unknown): Promise<boolean> => {
      if (!isAdmin) return false;
      if (!IS_DEMO_MODE) {
        const sb = getSupabaseClient();
        if (!sb) return false;
        const { error } = await sb.rpc('admin_update_app_settings', {
          setting_key: key,
          setting_value: value,
        });
        if (error) {
          pushToast(error.message, 'error');
          return false;
        }
        const [settingResult, logsResult] = await Promise.all([
          sb.from('app_settings').select('*').eq('key', key).maybeSingle(),
          sb.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(1000),
        ]);
        setState((prev) => ({
          ...prev,
          appSettings: settingResult.data
            ? [settingResult.data as AppSetting, ...prev.appSettings.filter((item) => item.key !== key)]
            : prev.appSettings,
          auditLogs: (logsResult.data || prev.auditLogs) as AuditLog[],
        }));
        pushToast(`Saved ${key}`, 'success');
        return true;
      }
      const nowIso = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        appSettings: prev.appSettings.map((setting) =>
          setting.key === key ? { ...setting, value, updated_by: prev.currentUserId, updated_at: nowIso } : setting
        ),
        auditLogs: appendAuditLog(prev, 'admin_update_app_setting', 'app_settings', key, { value }),
      }));
      return true;
    },
    [isAdmin, appendAuditLog, pushToast]
  );

  const adminPublishAnnouncement = useCallback(
    async (input: { title: string; body: string; show_as_banner: boolean }): Promise<boolean> => {
      if (!isAdmin || !state.currentUserId) return false;
      if (!IS_DEMO_MODE) {
        const sb = getSupabaseClient();
        if (!sb) return false;
        const { data: announcementId, error } = await sb.rpc('admin_publish_announcement', {
          p_title: input.title,
          p_body: input.body,
          p_show_as_banner: input.show_as_banner,
        });
        if (error || typeof announcementId !== 'string') {
          pushToast(error?.message || 'Announcement could not be published.', 'error');
          return false;
        }
        const [announcementResult, logsResult] = await Promise.all([
          sb.from('announcements').select('*').eq('id', announcementId).maybeSingle(),
          sb.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(1000),
        ]);
        setState((prev) => ({
          ...prev,
          announcements: announcementResult.data
            ? [announcementResult.data as Announcement, ...prev.announcements.filter((item) => item.id !== announcementId)]
            : prev.announcements,
          auditLogs: (logsResult.data || prev.auditLogs) as AuditLog[],
        }));
        pushToast('Announcement published', 'success');
        return true;
      }
      const nowIso = new Date().toISOString();
      const announcement: Announcement = {
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
        announcements: [announcement, ...prev.announcements],
        auditLogs: appendAuditLog(prev, 'publish_announcement', 'announcement', announcement.id, { title: announcement.title }),
      }));
      pushToast('Announcement published', 'success');
      return true;
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
      isAuthReady,
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
      uploadAvatar,
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
      isAuthReady,
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
      uploadAvatar,
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
