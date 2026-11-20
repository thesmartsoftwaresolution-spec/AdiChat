-- AdiChat Canonical PostgreSQL & Supabase Schema
-- Complete implementation matching 05_Backend_Schema.md:
-- 10 Enums, 18 Tables (+ bootstrap_state), Indexes, Constraints,
-- Security Helper Functions, All Table RLS Policies, 4 Storage Buckets & Policies,
-- Triggers & Trusted Server/RPC Operations.

create extension if not exists pgcrypto;

-- 1. Enums
create type public.app_role as enum ('user', 'admin', 'super_admin');
create type public.user_status as enum ('active', 'suspended', 'banned');
create type public.conversation_type as enum ('direct', 'group', 'assistant');
create type public.message_type as enum ('text', 'image', 'file', 'voice', 'system');
create type public.message_delivery_status as enum ('sending', 'sent', 'delivered', 'read', 'failed');
create type public.group_member_role as enum ('admin', 'member');
create type public.assistant_response_mode as enum ('mentioned_only', 'every_message');
create type public.report_target_type as enum ('user', 'message', 'group');
create type public.report_status as enum ('open', 'resolved', 'dismissed');
create type public.announcement_status as enum ('draft', 'published', 'archived');

-- 2. Tables
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  avatar_path text,
  about text,
  title text,
  status public.user_status not null default 'active',
  last_seen_at timestamptz,
  is_online boolean not null default false,
  theme_preference text not null default 'system' check (theme_preference in ('light', 'dark', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  show_last_seen boolean not null default true,
  show_online_status boolean not null default true,
  read_receipts_enabled boolean not null default true,
  notify_messages boolean not null default true,
  notify_groups boolean not null default true,
  notify_ai_replies boolean not null default true,
  disappearing_timer text not null default 'off' check (disappearing_timer in ('off', '24h', '7d', '90d')),
  auto_download_media text not null default 'wifi' check (auto_download_media in ('wifi', 'always', 'never')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  type public.conversation_type not null,
  title text,
  created_by uuid not null references auth.users(id),
  direct_pair_key text unique,
  last_message_id uuid,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversation_members (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_role public.group_member_role not null default 'member',
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  muted_until timestamptz,
  is_blocked boolean not null default false,
  created_at timestamptz not null default now(),
  unique (conversation_id, user_id)
);

create table public.groups (
  conversation_id uuid primary key references public.conversations(id) on delete cascade,
  name text not null,
  description text,
  avatar_path text,
  created_by uuid not null references auth.users(id),
  allow_ai_auto_respond boolean not null default true,
  only_admins_send boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_assistants (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  handle text,
  avatar_path text,
  description text,
  personality text,
  instructions text not null,
  tone text,
  language text,
  starter_prompts jsonb not null default '[]'::jsonb,
  is_enabled boolean not null default true,
  thinking_enabled_default boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.conversations
  add column if not exists assistant_id uuid references public.ai_assistants(id) on delete set null;

create unique index if not exists conversations_assistant_owner_unique
  on public.conversations (created_by, assistant_id)
  where type = 'assistant' and assistant_id is not null;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_user_id uuid references auth.users(id) on delete set null,
  sender_assistant_id uuid references public.ai_assistants(id) on delete set null,
  message_type public.message_type not null default 'text',
  body text,
  reply_to_message_id uuid references public.messages(id) on delete set null,
  delivery_status public.message_delivery_status not null default 'sent',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  constraint messages_sender_identity_chk check (
    (message_type = 'system' and sender_user_id is null and sender_assistant_id is null)
    or ((sender_user_id is not null) <> (sender_assistant_id is not null))
  )
);

alter table public.conversations
  add constraint conversations_last_message_fkey
  foreign key (last_message_id) references public.messages(id) on delete set null;

create table public.message_receipts (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (message_id, user_id)
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id),
  bucket_id text not null,
  object_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes >= 0),
  width integer,
  height integer,
  duration_ms integer,
  created_at timestamptz not null default now(),
  unique (bucket_id, object_path)
);

create table public.group_assistants (
  id uuid primary key default gen_random_uuid(),
  group_conversation_id uuid not null references public.groups(conversation_id) on delete cascade,
  assistant_id uuid not null references public.ai_assistants(id) on delete cascade,
  response_mode public.assistant_response_mode not null default 'mentioned_only',
  added_by uuid not null references auth.users(id),
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_conversation_id, assistant_id)
);

create table public.assistant_usage (
  id uuid primary key default gen_random_uuid(),
  assistant_id uuid not null references public.ai_assistants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  model_id text not null,
  input_units integer,
  output_units integer,
  request_status text not null,
  latency_ms integer,
  request_id text,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references auth.users(id),
  target_type public.report_target_type not null,
  target_user_id uuid references auth.users(id) on delete set null,
  target_message_id uuid references public.messages(id) on delete set null,
  target_group_conversation_id uuid references public.groups(conversation_id) on delete set null,
  reason text not null,
  details text,
  status public.report_status not null default 'open',
  assigned_to uuid references auth.users(id),
  resolution_note text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reports_target_chk check (
    (target_type = 'user' and target_user_id is not null and target_message_id is null and target_group_conversation_id is null)
    or (target_type = 'message' and target_message_id is not null and target_user_id is null and target_group_conversation_id is null)
    or (target_type = 'group' and target_group_conversation_id is not null and target_user_id is null and target_message_id is null)
  )
);

create table public.developer_profile (
  id smallint primary key default 1 check (id = 1),
  name text not null default 'Adeel Bhatti',
  subtitle text not null default 'Developer of AdiChat',
  bio text,
  why_built text,
  photo_path text,
  email_url text,
  whatsapp_url text,
  github_url text,
  linkedin_url text,
  is_visible boolean not null default true,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table public.app_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  show_as_banner boolean not null default false,
  status public.announcement_status not null default 'draft',
  created_by uuid not null references auth.users(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  request_id text,
  ip_hash text,
  created_at timestamptz not null default now()
);

create table public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_user_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_user_id, blocked_user_id),
  check (blocker_user_id <> blocked_user_id)
);

-- One-Time Super Admin Bootstrap Guard Table
create table if not exists public.bootstrap_state (
  id smallint primary key default 1 check (id = 1),
  consumed boolean not null default false,
  consumed_at timestamptz,
  consumed_by_user_id uuid references auth.users(id)
);

-- 3. Indexes
create index profiles_status_idx on public.profiles (status);
create index profiles_full_name_idx on public.profiles (full_name);
create index profiles_email_lower_idx on public.profiles (lower(email));

create index conversations_type_last_msg_idx on public.conversations (type, last_message_at desc);
create index conversations_created_by_idx on public.conversations (created_by);

create index conversation_members_user_conv_idx on public.conversation_members (user_id, conversation_id);
create index conversation_members_conv_joined_idx on public.conversation_members (conversation_id, joined_at);

create index messages_conv_created_id_idx on public.messages (conversation_id, created_at desc, id desc);
create index messages_sender_created_idx on public.messages (sender_user_id, created_at desc);
create index messages_not_deleted_idx on public.messages (conversation_id, created_at desc) where deleted_at is null;

create index message_receipts_user_read_idx on public.message_receipts (user_id, read_at);
create index message_receipts_message_idx on public.message_receipts (message_id);

create index attachments_conv_created_idx on public.attachments (conversation_id, created_at desc);
create index attachments_uploader_created_idx on public.attachments (uploaded_by, created_at desc);

create index ai_assistants_owner_created_idx on public.ai_assistants (owner_user_id, created_at desc);
create index ai_assistants_enabled_idx on public.ai_assistants (is_enabled);

create index assistant_usage_user_created_idx on public.assistant_usage (user_id, created_at desc);
create index assistant_usage_assistant_created_idx on public.assistant_usage (assistant_id, created_at desc);
create index assistant_usage_created_idx on public.assistant_usage (created_at desc);

create index reports_status_created_idx on public.reports (status, created_at desc);
create index reports_target_type_created_idx on public.reports (target_type, created_at desc);

create index announcements_status_published_idx on public.announcements (status, published_at desc);

create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_actor_created_idx on public.audit_logs (actor_user_id, created_at desc);
create index audit_logs_target_idx on public.audit_logs (target_type, target_id);

create index announcements_created_by_idx on public.announcements(created_by);
create index app_settings_updated_by_idx on public.app_settings(updated_by);
create index assistant_usage_conversation_id_idx on public.assistant_usage(conversation_id);
create index attachments_message_id_idx on public.attachments(message_id);
create index bootstrap_state_consumed_by_user_id_idx on public.bootstrap_state(consumed_by_user_id);
create index conversations_assistant_id_idx on public.conversations(assistant_id) where assistant_id is not null;
create index conversations_last_message_id_idx on public.conversations(last_message_id);
create index developer_profile_updated_by_idx on public.developer_profile(updated_by);
create index group_assistants_added_by_idx on public.group_assistants(added_by);
create index group_assistants_assistant_id_idx on public.group_assistants(assistant_id);
create index groups_created_by_idx on public.groups(created_by);
create index messages_reply_to_message_id_idx on public.messages(reply_to_message_id);
create index messages_sender_assistant_id_idx on public.messages(sender_assistant_id);
create index reports_assigned_to_idx on public.reports(assigned_to);
create index reports_reporter_user_id_idx on public.reports(reporter_user_id);
create index reports_target_group_conversation_id_idx on public.reports(target_group_conversation_id);
create index reports_target_message_id_idx on public.reports(target_message_id);
create index reports_target_user_id_idx on public.reports(target_user_id);
create index user_blocks_blocked_user_id_idx on public.user_blocks(blocked_user_id);
create index user_roles_granted_by_idx on public.user_roles(granted_by);

-- 4. Security & Role Helpers (fixed search_path, recursion-safe)
create or replace function public.get_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select role from public.user_roles
      where user_id = auth.uid()
      order by case role
        when 'super_admin' then 1
        when 'admin' then 2
        else 3
      end
      limit 1
    ),
    'user'::public.app_role
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role in ('admin', 'super_admin')
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role = 'super_admin'
  );
$$;

create or replace function public.is_conversation_member(conv_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = conv_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_group_admin(conv_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = conv_id
      and user_id = auth.uid()
      and member_role = 'admin'
  );
$$;

create or replace function public.is_active_account()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and status = 'active'
  );
$$;

-- 5. Enable RLS on every table
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.user_settings enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.groups enable row level security;
alter table public.messages enable row level security;
alter table public.message_receipts enable row level security;
alter table public.attachments enable row level security;
alter table public.ai_assistants enable row level security;
alter table public.group_assistants enable row level security;
alter table public.assistant_usage enable row level security;
alter table public.reports enable row level security;
alter table public.developer_profile enable row level security;
alter table public.app_settings enable row level security;
alter table public.announcements enable row level security;
alter table public.audit_logs enable row level security;
alter table public.user_blocks enable row level security;
alter table public.bootstrap_state enable row level security;

-- 6. Explicit RLS Policies (All 18 Tables)

-- profiles
create policy "profiles_select_directory" on public.profiles
  for select to authenticated
  using (status = 'active' or id = auth.uid() or public.is_admin());

-- Safe directory projection; never expose private profile columns through the base table.
create or replace view public.profile_directory with (security_invoker = true) as
select id, full_name, avatar_path, about, title, is_online, last_seen_at
from public.profiles
where status = 'active';
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid() and public.is_active_account())
  with check (id = auth.uid());

-- user_roles (never writable by regular users; Super Admin / trusted bootstrap only)
create policy "user_roles_select_own_or_super" on public.user_roles
  for select to authenticated using (user_id = auth.uid() or public.is_super_admin());
create policy "user_roles_super_admin_insert" on public.user_roles
  for insert to authenticated with check (public.is_super_admin());
create policy "user_roles_super_admin_update" on public.user_roles
  for update to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
create policy "user_roles_super_admin_delete" on public.user_roles
  for delete to authenticated using (public.is_super_admin());

-- user_settings
create policy "user_settings_own_all" on public.user_settings
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- conversations
create policy "conversations_member_or_admin_select" on public.conversations
  for select to authenticated using (public.is_conversation_member(id) or public.is_admin());
create policy "conversations_group_admin_update" on public.conversations
  for update to authenticated using (public.is_group_admin(id) or public.is_admin());
create policy "conversations_admin_delete" on public.conversations
  for delete to authenticated using (public.is_group_admin(id) or public.is_admin());

-- conversation_members
create policy "conversation_members_select" on public.conversation_members
  for select to authenticated
  using (user_id = auth.uid() or public.is_conversation_member(conversation_id) or public.is_admin());
create policy "conversation_members_update_own_preferences" on public.conversation_members
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- groups
create policy "groups_member_or_admin_select" on public.groups
  for select to authenticated using (public.is_conversation_member(conversation_id) or public.is_admin());
create policy "groups_admin_update" on public.groups
  for update to authenticated using (public.is_group_admin(conversation_id) or public.is_admin());
create policy "groups_admin_delete" on public.groups
  for delete to authenticated using (public.is_group_admin(conversation_id) or public.is_admin());

-- messages
create policy "messages_member_select" on public.messages
  for select to authenticated using (public.is_conversation_member(conversation_id));
create policy "messages_member_insert" on public.messages
  for insert to authenticated
  with check (
    public.is_active_account()
    and public.is_conversation_member(conversation_id)
    and sender_user_id = auth.uid()
    and sender_assistant_id is null
  );
create policy "messages_sender_update_own" on public.messages
  for update to authenticated
  using (sender_user_id = auth.uid() or public.is_admin())
  with check (sender_user_id = auth.uid() or public.is_admin());

-- message_receipts
create policy "message_receipts_select" on public.message_receipts
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.messages m
      where m.id = message_id and public.is_conversation_member(m.conversation_id)
    )
  );
create policy "message_receipts_upsert_own" on public.message_receipts
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.messages m
      where m.id = message_id
        and public.is_conversation_member(m.conversation_id)
    )
  );
create policy "message_receipts_update_own" on public.message_receipts
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- attachments
create policy "attachments_member_select" on public.attachments
  for select to authenticated using (public.is_conversation_member(conversation_id));
create policy "attachments_member_insert" on public.attachments
  for insert to authenticated
  with check (
    public.is_active_account()
    and public.is_conversation_member(conversation_id)
    and uploaded_by = auth.uid()
    and exists (
      select 1 from public.messages m
      where m.id = message_id
        and m.conversation_id = attachments.conversation_id
        and m.sender_user_id = auth.uid()
    )
  );
create policy "attachments_owner_or_admin_delete" on public.attachments
  for delete to authenticated
  using (uploaded_by = auth.uid() or public.is_admin());

-- ai_assistants
create policy "ai_assistants_select" on public.ai_assistants
  for select to authenticated
  using (
    owner_user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.group_assistants ga
      where ga.assistant_id = id
        and public.is_conversation_member(ga.group_conversation_id)
    )
  );
create policy "ai_assistants_owner_insert" on public.ai_assistants
  for insert to authenticated
  with check (public.is_active_account() and owner_user_id = auth.uid());
create policy "ai_assistants_owner_update" on public.ai_assistants
  for update to authenticated
  using (owner_user_id = auth.uid() or public.is_admin())
  with check (owner_user_id = auth.uid() or public.is_admin());
create policy "ai_assistants_owner_delete" on public.ai_assistants
  for delete to authenticated
  using (owner_user_id = auth.uid() or public.is_admin());

-- group_assistants
create policy "group_assistants_member_select" on public.group_assistants
  for select to authenticated using (public.is_conversation_member(group_conversation_id) or public.is_admin());
create policy "group_assistants_group_admin_insert" on public.group_assistants
  for insert to authenticated
  with check (
    public.is_group_admin(group_conversation_id)
    and added_by = auth.uid()
    and exists (
      select 1 from public.ai_assistants a
      where a.id = assistant_id and a.owner_user_id = auth.uid()
    )
  );
create policy "group_assistants_group_admin_update" on public.group_assistants
  for update to authenticated
  using (public.is_group_admin(group_conversation_id) or public.is_admin())
  with check (public.is_group_admin(group_conversation_id) or public.is_admin());
create policy "group_assistants_group_admin_delete" on public.group_assistants
  for delete to authenticated using (public.is_group_admin(group_conversation_id) or public.is_admin());

-- assistant_usage (inserts via trusted Cloudflare Worker service role only)
create policy "assistant_usage_select_own_or_admin" on public.assistant_usage
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.ai_assistants a
      where a.id = assistant_id and a.owner_user_id = auth.uid()
    )
  );

-- reports
create policy "reports_select_own_or_admin" on public.reports
  for select to authenticated using (reporter_user_id = auth.uid() or public.is_admin());
create policy "reports_authenticated_insert" on public.reports
  for insert to authenticated
  with check (public.is_active_account() and reporter_user_id = auth.uid());
create policy "reports_admin_update" on public.reports
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "reports_super_admin_delete" on public.reports
  for delete to authenticated using (public.is_super_admin());

-- developer_profile
create policy "developer_profile_public_read" on public.developer_profile
  for select to anon using (is_visible = true);
create policy "developer_profile_authenticated_read" on public.developer_profile
  for select to authenticated using (is_visible = true or public.is_admin());
create policy "developer_profile_admin_update" on public.developer_profile
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "developer_profile_super_admin_insert" on public.developer_profile
  for insert to authenticated with check (public.is_super_admin());

-- app_settings
create policy "app_settings_safe_read" on public.app_settings
  for select to authenticated
  using (
    public.is_admin()
    or key in (
      'app_name', 'default_theme', 'allow_signups', 'feature_groups_enabled',
      'feature_voice_notes_enabled', 'feature_ai_enabled', 'maintenance_mode',
      'maintenance_message'
    )
  );
create policy "app_settings_admin_update" on public.app_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "app_settings_super_admin_insert" on public.app_settings
  for insert to authenticated with check (public.is_super_admin());

-- announcements
create policy "announcements_public_read" on public.announcements
  for select to anon using (status = 'published');
create policy "announcements_authenticated_read" on public.announcements
  for select to authenticated using (status = 'published' or public.is_admin());
create policy "announcements_admin_insert" on public.announcements
  for insert to authenticated with check (public.is_admin() and created_by = auth.uid());
create policy "announcements_admin_update" on public.announcements
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "announcements_admin_delete" on public.announcements
  for delete to authenticated using (public.is_admin());

-- audit_logs (append-only via trusted server/RPCs)
create policy "audit_logs_admin_read" on public.audit_logs
  for select to authenticated using (public.is_admin());

-- user_blocks
create policy "user_blocks_blocker_select" on public.user_blocks
  for select to authenticated using (blocker_user_id = auth.uid());
create policy "user_blocks_blocker_insert" on public.user_blocks
  for insert to authenticated with check (blocker_user_id = auth.uid());
create policy "user_blocks_blocker_delete" on public.user_blocks
  for delete to authenticated using (blocker_user_id = auth.uid());

-- 7. Storage Buckets & Policies
insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', false),
  ('chat-attachments', 'chat-attachments', false),
  ('voice-notes', 'voice-notes', false),
  ('developer-assets', 'developer-assets', true)
on conflict (id) do nothing;

create policy "avatars_authenticated_read" on storage.objects
  for select to authenticated using (bucket_id = 'avatars');
create policy "avatars_owner_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "chat_attachments_member_read" on storage.objects
  for select to authenticated
  using (
    bucket_id in ('chat-attachments', 'voice-notes')
    and public.is_conversation_member(((storage.foldername(name))[1])::uuid)
  );
create policy "chat_attachments_member_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('chat-attachments', 'voice-notes')
    and public.is_conversation_member(((storage.foldername(name))[1])::uuid)
  );

create policy "developer_assets_public_read" on storage.objects
  for select using (bucket_id = 'developer-assets');
create policy "developer_assets_admin_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'developer-assets' and public.is_admin())
  with check (bucket_id = 'developer-assets' and public.is_admin());

-- 8. Triggers & Trusted RPC Operations

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_user_settings_updated_at before update on public.user_settings
  for each row execute function public.set_updated_at();
create trigger set_conversations_updated_at before update on public.conversations
  for each row execute function public.set_updated_at();
create trigger set_groups_updated_at before update on public.groups
  for each row execute function public.set_updated_at();
create trigger set_ai_assistants_updated_at before update on public.ai_assistants
  for each row execute function public.set_updated_at();
create trigger set_group_assistants_updated_at before update on public.group_assistants
  for each row execute function public.set_updated_at();
create trigger set_reports_updated_at before update on public.reports
  for each row execute function public.set_updated_at();
create trigger set_announcements_updated_at before update on public.announcements
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Canonical 1-to-1 Direct Conversation RPC
create or replace function public.create_direct_conversation(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  pair_key text;
  conv_id uuid;
begin
  if caller_id is null or caller_id = other_user_id then
    raise exception 'Valid distinct participants required.';
  end if;

  if not public.is_active_account() then
    raise exception 'Account is not active.';
  end if;

  if exists (
    select 1 from public.user_blocks
    where (blocker_user_id = caller_id and blocked_user_id = other_user_id)
       or (blocker_user_id = other_user_id and blocked_user_id = caller_id)
  ) then
    raise exception 'Cannot start conversation due to block settings.';
  end if;

  pair_key := least(caller_id::text, other_user_id::text) || ':' || greatest(caller_id::text, other_user_id::text);

  select id into conv_id from public.conversations where direct_pair_key = pair_key;
  if conv_id is not null then
    return conv_id;
  end if;

  insert into public.conversations (type, created_by, direct_pair_key)
  values ('direct', caller_id, pair_key)
  returning id into conv_id;

  insert into public.conversation_members (conversation_id, user_id, member_role)
  values
    (conv_id, caller_id, 'member'),
    (conv_id, other_user_id, 'member');

  return conv_id;
end;
$$;

-- Create Group RPC
create or replace function public.create_group(
  group_name text,
  group_description text default null,
  member_ids uuid[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  conv_id uuid;
  uid uuid;
begin
  if caller_id is null or not public.is_active_account() then
    raise exception 'Unauthorized or inactive user.';
  end if;
  if length(trim(coalesce(group_name, ''))) < 2 then
    raise exception 'Group name must be at least 2 characters.';
  end if;

  insert into public.conversations (type, title, created_by)
  values ('group', trim(group_name), caller_id)
  returning id into conv_id;

  insert into public.groups (conversation_id, name, description, created_by)
  values (conv_id, trim(group_name), nullif(trim(coalesce(group_description, '')), ''), caller_id);

  insert into public.conversation_members (conversation_id, user_id, member_role)
  values (conv_id, caller_id, 'admin');

  foreach uid in array coalesce(member_ids, '{}') loop
    if uid <> caller_id then
      insert into public.conversation_members (conversation_id, user_id, member_role)
      values (conv_id, uid, 'member')
      on conflict (conversation_id, user_id) do nothing;
    end if;
  end loop;

  return conv_id;
end;
$$;

-- Add Group Members RPC
create or replace function public.add_group_members(group_id uuid, member_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  if not public.is_group_admin(group_id) and not public.is_admin() then
    raise exception 'Forbidden: only group admins can add members.';
  end if;
  foreach uid in array coalesce(member_ids, '{}') loop
    insert into public.conversation_members (conversation_id, user_id, member_role)
    values (group_id, uid, 'member')
    on conflict (conversation_id, user_id) do nothing;
  end loop;
end;
$$;

-- Remove Group Member RPC (prevents removing last admin when others remain)
create or replace function public.remove_group_member(group_id uuid, target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  target_role public.group_member_role;
  other_admins integer;
  other_members integer;
begin
  if caller_id is null then
    raise exception 'Unauthorized';
  end if;
  if caller_id <> target_user_id and not public.is_group_admin(group_id) and not public.is_admin() then
    raise exception 'Forbidden: group admin access required.';
  end if;

  select member_role into target_role
  from public.conversation_members
  where conversation_id = group_id and user_id = target_user_id;

  if target_role = 'admin' then
    select count(*) into other_admins
    from public.conversation_members
    where conversation_id = group_id and member_role = 'admin' and user_id <> target_user_id;

    select count(*) into other_members
    from public.conversation_members
    where conversation_id = group_id and user_id <> target_user_id;

    if other_admins = 0 and other_members > 0 then
      raise exception 'Promote another group admin before leaving or removing the last admin.';
    end if;
  end if;

  delete from public.conversation_members
  where conversation_id = group_id and user_id = target_user_id;
end;
$$;

-- Mark Conversation / Message Read RPC
create or replace function public.set_message_read(conv_id uuid, last_msg_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  receipts_on boolean := true;
begin
  if not public.is_conversation_member(conv_id) then
    raise exception 'Forbidden';
  end if;

  update public.conversation_members
  set last_read_at = now()
  where conversation_id = conv_id and user_id = caller_id;

  select read_receipts_enabled into receipts_on
  from public.user_settings where user_id = caller_id;

  if coalesce(receipts_on, true) and last_msg_id is not null then
    insert into public.message_receipts (message_id, user_id, delivered_at, read_at)
    values (last_msg_id, caller_id, now(), now())
    on conflict (message_id, user_id)
    do update set read_at = now();
  end if;
end;
$$;


-- Assistant conversation and authenticated AI persistence RPCs
create or replace function public.get_or_create_assistant_conversation(p_assistant_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $
declare
  caller_id uuid := auth.uid();
  assistant_row public.ai_assistants%rowtype;
  conv_id uuid;
begin
  if caller_id is null or not public.is_active_account() then
    raise exception 'Authentication required and account must be active.';
  end if;
  select * into assistant_row from public.ai_assistants
  where id = p_assistant_id and is_enabled = true;
  if not found or (assistant_row.owner_user_id <> caller_id and not public.is_admin()) then
    raise exception 'Assistant not found or access denied.';
  end if;
  insert into public.conversations (type, title, created_by, assistant_id)
  values ('assistant', assistant_row.name, caller_id, assistant_row.id)
  on conflict (created_by, assistant_id)
    where type = 'assistant' and assistant_id is not null do nothing;
  select id into conv_id from public.conversations
  where type = 'assistant' and created_by = caller_id and assistant_id = assistant_row.id;
  insert into public.conversation_members (conversation_id, user_id, member_role)
  values (conv_id, caller_id, 'member')
  on conflict (conversation_id, user_id) do nothing;
  return conv_id;
end;
$;

create or replace function public.create_assistant_user_message(
  p_conversation_id uuid, p_assistant_id uuid, p_body text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $
declare
  caller_id uuid := auth.uid();
  message_id uuid;
begin
  if caller_id is null or not public.is_active_account() then
    raise exception 'Authentication required and account must be active.';
  end if;
  if length(trim(coalesce(p_body, ''))) = 0 or length(p_body) > 4000 then
    raise exception 'Prompt must contain 1 to 4000 characters.';
  end if;
  if not exists (
    select 1 from public.conversations c
    join public.ai_assistants a on a.id = c.assistant_id
    join public.conversation_members cm on cm.conversation_id = c.id and cm.user_id = caller_id
    where c.id = p_conversation_id and c.type = 'assistant'
      and c.assistant_id = p_assistant_id and a.is_enabled = true
      and (a.owner_user_id = caller_id or public.is_admin())
  ) then raise exception 'Assistant conversation access denied.'; end if;
  insert into public.messages (conversation_id, sender_user_id, message_type, body, delivery_status)
  values (p_conversation_id, caller_id, 'text', trim(p_body), 'sent')
  returning id into message_id;
  update public.conversations set last_message_id = message_id, last_message_at = now(), updated_at = now()
  where id = p_conversation_id;
  return message_id;
end;
$;

create or replace function public.can_request_assistant_reply()
returns boolean
language plpgsql
security definer
set search_path = public
as $
declare caller_id uuid := auth.uid();
begin
  if caller_id is null or not public.is_active_account() then return false; end if;
  return (select count(*) < 50 from public.assistant_usage
    where user_id = caller_id and created_at >= now() - interval '24 hours'
      and request_status = 'success');
end;
$;

create or replace function public.record_assistant_response(
  p_conversation_id uuid, p_assistant_id uuid, p_body text, p_model_id text,
  p_latency_ms integer, p_input_units integer, p_output_units integer,
  p_request_id text, p_thinking_mode boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $
declare
  caller_id uuid := auth.uid();
  message_id uuid;
begin
  if caller_id is null or not public.is_active_account() then
    raise exception 'Authentication required and account must be active.';
  end if;
  if length(trim(coalesce(p_body, ''))) = 0 or length(p_body) > 20000 then
    raise exception 'Assistant response is empty or too large.';
  end if;
  if not exists (
    select 1 from public.conversations c
    join public.ai_assistants a on a.id = c.assistant_id
    join public.conversation_members cm on cm.conversation_id = c.id and cm.user_id = caller_id
    where c.id = p_conversation_id and c.type = 'assistant'
      and c.assistant_id = p_assistant_id and a.is_enabled = true
      and (a.owner_user_id = caller_id or public.is_admin())
  ) then raise exception 'Assistant conversation access denied.'; end if;
  if (select count(*) from public.assistant_usage
      where user_id = caller_id and created_at >= now() - interval '24 hours'
        and request_status = 'success') >= 50 then
    raise exception 'Daily assistant request limit reached.';
  end if;
  insert into public.messages (
    conversation_id, sender_assistant_id, message_type, body, delivery_status, metadata
  ) values (
    p_conversation_id, p_assistant_id, 'text', trim(p_body), 'sent',
    jsonb_build_object('thinking_mode', coalesce(p_thinking_mode, false),
      'model_id', p_model_id, 'latency_ms', p_latency_ms)
  ) returning id into message_id;
  update public.conversations set last_message_id = message_id, last_message_at = now(), updated_at = now()
  where id = p_conversation_id;
  insert into public.assistant_usage (
    assistant_id, user_id, conversation_id, model_id, input_units,
    output_units, request_status, latency_ms, request_id
  ) values (
    p_assistant_id, caller_id, p_conversation_id, p_model_id,
    p_input_units, p_output_units, 'success', p_latency_ms, p_request_id
  );
  return message_id;
end;
$;

revoke execute on function public.get_or_create_assistant_conversation(uuid) from public, anon;
revoke execute on function public.create_assistant_user_message(uuid, uuid, text) from public, anon;
revoke execute on function public.can_request_assistant_reply() from public, anon;
revoke execute on function public.record_assistant_response(uuid, uuid, text, text, integer, integer, integer, text, boolean) from public, anon;
grant execute on function public.get_or_create_assistant_conversation(uuid) to authenticated;
grant execute on function public.create_assistant_user_message(uuid, uuid, text) to authenticated;
grant execute on function public.can_request_assistant_reply() to authenticated;
grant execute on function public.record_assistant_response(uuid, uuid, text, text, integer, integer, integer, text, boolean) to authenticated;

-- Admin Privileged Operations (audited)
create or replace function public.admin_update_user_status(
  target_user_id uuid,
  next_status public.user_status,
  reason text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;
  if exists (select 1 from public.user_roles where user_id = target_user_id and role = 'super_admin')
     and next_status <> 'active' then
    raise exception 'Cannot suspend or ban Super Admin.';
  end if;

  update public.profiles set status = next_status where id = target_user_id;

  insert into public.audit_logs (actor_user_id, action, target_type, target_id, details)
  values (
    auth.uid(),
    'admin_update_user_status',
    'user',
    target_user_id::text,
    jsonb_build_object('next_status', next_status, 'reason', reason)
  );
end;
$$;

create or replace function public.admin_resolve_report(
  report_id uuid,
  next_status public.report_status,
  note text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  update public.reports
  set status = next_status,
      resolution_note = note,
      resolved_at = now(),
      assigned_to = auth.uid()
  where id = report_id;

  insert into public.audit_logs (actor_user_id, action, target_type, target_id, details)
  values (
    auth.uid(),
    'admin_resolve_report',
    'report',
    report_id::text,
    jsonb_build_object('status', next_status, 'resolution_note', note)
  );
end;
$$;

create or replace function public.admin_update_app_settings(
  setting_key text,
  setting_value jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  if setting_key not in (
    'app_name', 'default_theme', 'allow_signups', 'email_verification_required',
    'max_file_size_bytes', 'allowed_file_types', 'voice_note_max_length_seconds',
    'group_size_limit', 'feature_groups_enabled', 'feature_voice_notes_enabled',
    'feature_ai_enabled', 'feature_reactions_enabled', 'ai_model_id',
    'ai_daily_message_limit', 'ai_max_assistants_per_user', 'maintenance_mode',
    'maintenance_message', 'terms_content', 'privacy_content'
  ) then
    raise exception 'Unsupported app setting key.';
  end if;

  insert into public.app_settings (key, value, updated_by)
  values (setting_key, setting_value, auth.uid())
  on conflict (key) do update
  set value = excluded.value, updated_by = auth.uid(), updated_at = now();

  insert into public.audit_logs (actor_user_id, action, target_type, target_id, details)
  values (
    auth.uid(),
    'admin_update_app_setting',
    'app_settings',
    setting_key,
    jsonb_build_object('value', setting_value)
  );
end;
$$;


-- 9. Explicit API grants and column-level mutation boundaries
revoke all on all tables in schema public from anon;
grant select on public.developer_profile, public.announcements to anon;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.profile_directory to authenticated;
revoke insert, update, delete on public.profile_directory from authenticated;

-- Profiles: users can update only safe self-service columns.
revoke all on public.profiles from anon;
revoke select on public.profiles from authenticated;
grant select (id, full_name, avatar_path, about, title, is_online, last_seen_at, status, theme_preference)
  on public.profiles to authenticated;
revoke update on public.profiles from authenticated;
grant update (full_name, avatar_path, about, title, theme_preference, last_seen_at, is_online)
  on public.profiles to authenticated;

-- Membership role changes are trusted RPC operations, never direct row updates.
revoke update on public.conversation_members from authenticated;
grant update (last_read_at, muted_until) on public.conversation_members to authenticated;

-- Message identity, ownership, routing and delivery fields are immutable to clients.
revoke update on public.messages from authenticated;
grant update (body, metadata, edited_at, deleted_at) on public.messages to authenticated;

-- Public helper functions are read-only authorization predicates.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.get_user_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.is_conversation_member(uuid) to authenticated;
grant execute on function public.is_group_admin(uuid) to authenticated;
grant execute on function public.is_active_account() to authenticated;
revoke all on public.bootstrap_state from anon, authenticated;

-- Authenticated users may call guarded RPCs; trigger functions remain non-callable directly.
grant execute on function public.create_direct_conversation(uuid) to authenticated;
grant execute on function public.create_group(text, text, uuid[]) to authenticated;
grant execute on function public.add_group_members(uuid, uuid[]) to authenticated;
grant execute on function public.remove_group_member(uuid, uuid) to authenticated;
grant execute on function public.set_message_read(uuid, uuid) to authenticated;
grant execute on function public.admin_update_user_status(uuid, public.user_status, text) to authenticated;
grant execute on function public.admin_resolve_report(uuid, public.report_status, text) to authenticated;
grant execute on function public.admin_update_app_settings(text, jsonb) to authenticated;
grant execute on function public.get_or_create_assistant_conversation(uuid) to authenticated;
grant execute on function public.create_assistant_user_message(uuid, uuid, text) to authenticated;
grant execute on function public.can_request_assistant_reply() to authenticated;
grant execute on function public.record_assistant_response(uuid, uuid, text, text, integer, integer, integer, text, boolean) to authenticated;


-- 11. API privileges required for authenticated profile reads
-- RLS remains enabled; row visibility is still controlled by profiles_select_directory.
GRANT SELECT (id, full_name, avatar_path, about, title, is_online, last_seen_at, status, theme_preference, created_at, updated_at) ON TABLE public.profiles TO authenticated;
