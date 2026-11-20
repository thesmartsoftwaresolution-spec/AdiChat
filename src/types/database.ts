// Canonical Supabase Schema Types matching 05_Backend_Schema.md

export type AppRole = 'user' | 'admin' | 'super_admin';
export type UserStatus = 'active' | 'suspended' | 'banned';
export type ConversationType = 'direct' | 'group' | 'assistant';
export type MessageType = 'text' | 'image' | 'file' | 'voice' | 'system';
export type MessageDeliveryStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
export type GroupMemberRole = 'admin' | 'member';
export type AssistantResponseMode = 'mentioned_only' | 'every_message';
export type ReportTargetType = 'user' | 'message' | 'group';
export type ReportStatus = 'open' | 'resolved' | 'dismissed';
export type AnnouncementStatus = 'draft' | 'published' | 'archived';
export type ThemePreference = 'light' | 'dark' | 'system';

export interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  avatar_path: string | null;
  about: string | null;
  title?: string | null;
  status: UserStatus;
  last_seen_at: string | null;
  is_online: boolean;
  theme_preference: ThemePreference;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  granted_by: string | null;
  created_at: string;
}

export interface UserSettings {
  user_id: string;
  show_last_seen: boolean;
  show_online_status: boolean;
  read_receipts_enabled: boolean;
  notify_messages: boolean;
  notify_groups: boolean;
  notify_ai_replies: boolean;
  disappearing_timer?: 'off' | '24h' | '7d' | '90d';
  auto_download_media?: 'wifi' | 'always' | 'never';
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  title: string | null;
  created_by: string;
  direct_pair_key: string | null;
  last_message_id: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationMember {
  id: string;
  conversation_id: string;
  user_id: string;
  member_role: GroupMemberRole;
  joined_at: string;
  last_read_at: string | null;
  muted_until: string | null;
  is_blocked: boolean;
  created_at: string;
}

export interface GroupMetadata {
  conversation_id: string;
  name: string;
  description: string | null;
  avatar_path: string | null;
  created_by: string;
  allow_ai_auto_respond?: boolean;
  only_admins_send?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_user_id: string | null;
  sender_assistant_id: string | null;
  message_type: MessageType;
  body: string | null;
  reply_to_message_id: string | null;
  delivery_status: MessageDeliveryStatus;
  metadata: {
    file_name?: string;
    file_size_bytes?: number;
    mime_type?: string;
    duration_ms?: number;
    media_url?: string;
    thinking_mode?: boolean;
    thinking_summary?: string;
    model_id?: string;
    reactions?: Record<string, number>;
    code_snippet?: { title: string; language: string; code: string };
    [key: string]: unknown;
  };
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
}

export interface MessageReceipt {
  id: string;
  message_id: string;
  user_id: string;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
}

export interface Attachment {
  id: string;
  message_id: string;
  conversation_id: string;
  uploaded_by: string;
  bucket_id: string;
  object_path: string;
  file_name: string;
  mime_type: string;
  file_size_bytes: number;
  width: number | null;
  height: number | null;
  duration_ms: number | null;
  preview_url?: string;
  created_at: string;
}

export interface AIAssistant {
  id: string;
  owner_user_id: string;
  name: string;
  handle: string;
  avatar_path: string | null;
  icon_name?: string;
  description: string | null;
  personality: string | null;
  instructions: string;
  tone: string | null;
  language: string | null;
  starter_prompts: string[];
  is_enabled: boolean;
  thinking_enabled_default?: boolean;
  created_at: string;
  updated_at: string;
}

export interface GroupAssistant {
  id: string;
  group_conversation_id: string;
  assistant_id: string;
  response_mode: AssistantResponseMode;
  added_by: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssistantUsage {
  id: string;
  assistant_id: string;
  user_id: string;
  conversation_id: string | null;
  model_id: string;
  input_units: number | null;
  output_units: number | null;
  request_status: string;
  latency_ms: number | null;
  request_id: string | null;
  created_at: string;
}

export interface ModerationReport {
  id: string;
  reporter_user_id: string;
  target_type: ReportTargetType;
  target_user_id: string | null;
  target_message_id: string | null;
  target_group_conversation_id: string | null;
  reason: string;
  details: string | null;
  status: ReportStatus;
  assigned_to: string | null;
  resolution_note: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeveloperProfile {
  id: number;
  name: string;
  subtitle: string;
  bio: string | null;
  why_built: string | null;
  photo_path: string | null;
  email_url: string | null;
  whatsapp_url: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  is_visible: boolean;
  updated_by: string | null;
  updated_at: string;
}

export interface AppSetting {
  key: string;
  value: unknown;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  show_as_banner: boolean;
  status: AnnouncementStatus;
  created_by: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  actor_user_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown>;
  request_id: string | null;
  ip_hash: string | null;
  created_at: string;
}

export interface UserBlock {
  id: string;
  blocker_user_id: string;
  blocked_user_id: string;
  created_at: string;
}
