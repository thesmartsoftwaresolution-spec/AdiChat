# AdiChat --- Supabase Backend Schema

**Version:** 1.0 \| **Date:** 20 November 2026\
**Status:** Proposed implementation schema; planning document only. It
does not create a Supabase project or database.

## 1. Conventions

-   PostgreSQL with `uuid` primary keys unless a table is a natural join
    table.
-   `created_at` and `updated_at` use `timestamptz` in UTC.
-   Supabase Auth owns credentials. Never duplicate password hashes in
    application tables.
-   `auth.uid()` is the identity source for user-scoped RLS.
-   Use `ON DELETE CASCADE` only where the dependent data must not
    outlive its owner/parent; retain audit/legal records where policy
    requires.
-   Enable RLS on all tables exposed through Supabase APIs.
-   Tables below are the canonical names for frontend services. If
    implementation needs a change, update this file and dependent docs
    before coding.

## 2. Enums

``` sql
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
```

## 3. Tables

### 3.1 `profiles`

One row per Supabase Auth user. -
`id uuid primary key references auth.users(id) on delete cascade` -
`full_name text not null` - `email text` (display/cache only; Auth
remains authoritative) - `avatar_path text` - `about text` -
`status public.user_status not null default 'active'` -
`last_seen_at timestamptz` - `is_online boolean not null default false`
(best-effort presence snapshot) -
`theme_preference text not null default 'system'` (`light`, `dark`,
`system`) - `created_at timestamptz not null default now()` -
`updated_at timestamptz not null default now()`

Indexes: `(status)`, `(full_name)`, lower(email) if email search is
permitted.

### 3.2 `user_roles`

Separate privilege table; do not allow users to update it. -
`id uuid primary key default gen_random_uuid()` -
`user_id uuid not null references auth.users(id) on delete cascade` -
`role public.app_role not null` -
`granted_by uuid references auth.users(id)` -
`created_at timestamptz not null default now()` - Unique
`(user_id, role)`

Only trusted bootstrap/Super Admin operations may insert/update this
table. Ordinary users have no write policy.

### 3.3 `user_settings`

-   `user_id uuid primary key references auth.users(id) on delete cascade`
-   `show_last_seen boolean not null default true`
-   `show_online_status boolean not null default true`
-   `read_receipts_enabled boolean not null default true`
-   `notify_messages boolean not null default true`
-   `notify_groups boolean not null default true`
-   `notify_ai_replies boolean not null default true`
-   `created_at timestamptz not null default now()`
-   `updated_at timestamptz not null default now()`

### 3.4 `conversations`

Represents direct, group and assistant conversation threads. -
`id uuid primary key default gen_random_uuid()` -
`type public.conversation_type not null` - `title text` (primarily group
display title) - `created_by uuid not null references auth.users(id)` -
`direct_pair_key text unique` (canonical key for direct pair; generated
server-side from sorted participant UUIDs; null for non-direct) -
`last_message_id uuid` (nullable FK added after messages table) -
`last_message_at timestamptz` -
`created_at timestamptz not null default now()` -
`updated_at timestamptz not null default now()`

Indexes: `(type, last_message_at desc)`, `(created_by)`.

### 3.5 `conversation_members`

-   `id uuid primary key default gen_random_uuid()`
-   `conversation_id uuid not null references public.conversations(id) on delete cascade`
-   `user_id uuid not null references auth.users(id) on delete cascade`
-   `member_role public.group_member_role not null default 'member'`
-   `joined_at timestamptz not null default now()`
-   `last_read_at timestamptz`
-   `muted_until timestamptz`
-   `is_blocked boolean not null default false`
-   `created_at timestamptz not null default now()`
-   Unique `(conversation_id, user_id)`

Indexes: `(user_id, conversation_id)`, `(conversation_id, joined_at)`.

For direct conversations, exactly two members are required and roles are
not used as group permissions. Enforce participant count and direct-pair
uniqueness through a trusted transaction/function.

### 3.6 `groups`

Group-specific metadata, one-to-one with a group conversation. -
`conversation_id uuid primary key references public.conversations(id) on delete cascade` -
`name text not null` - `description text` - `avatar_path text` -
`created_by uuid not null references auth.users(id)` -
`created_at timestamptz not null default now()` -
`updated_at timestamptz not null default now()`

### 3.7 `messages`

-   `id uuid primary key default gen_random_uuid()`
-   `conversation_id uuid not null references public.conversations(id) on delete cascade`
-   `sender_user_id uuid references auth.users(id) on delete set null`
-   `sender_assistant_id uuid references public.ai_assistants(id) on delete set null`
-   `message_type public.message_type not null default 'text'`
-   `body text`
-   `reply_to_message_id uuid references public.messages(id) on delete set null`
-   `delivery_status public.message_delivery_status not null default 'sent'`
-   `metadata jsonb not null default '{}'::jsonb` (safe structured
    metadata only; never trust for authorization)
-   `created_at timestamptz not null default now()`
-   `edited_at timestamptz`
-   `deleted_at timestamptz`

Constraint: exactly one sender identity (`sender_user_id` XOR
`sender_assistant_id`) for ordinary messages; system messages may use
neither if explicitly allowed by trusted code. Validate message
type/body/metadata server-side.

Indexes: `(conversation_id, created_at desc, id desc)`,
`(sender_user_id, created_at desc)`, partial index for non-deleted
messages.

After creation, add FK `conversations.last_message_id -> messages.id`
with `ON DELETE SET NULL`.

### 3.8 `message_receipts`

Per-recipient delivery/read state. -
`id uuid primary key default gen_random_uuid()` -
`message_id uuid not null references public.messages(id) on delete cascade` -
`user_id uuid not null references auth.users(id) on delete cascade` -
`delivered_at timestamptz` - `read_at timestamptz` -
`created_at timestamptz not null default now()` - Unique
`(message_id, user_id)`

Indexes: `(user_id, read_at)`, `(message_id)`.

### 3.9 `attachments`

-   `id uuid primary key default gen_random_uuid()`
-   `message_id uuid not null references public.messages(id) on delete cascade`
-   `conversation_id uuid not null references public.conversations(id) on delete cascade`
-   `uploaded_by uuid not null references auth.users(id)`
-   `bucket_id text not null`
-   `object_path text not null`
-   `file_name text not null`
-   `mime_type text not null`
-   `file_size_bytes bigint not null check (file_size_bytes >= 0)`
-   `width integer`
-   `height integer`
-   `duration_ms integer`
-   `created_at timestamptz not null default now()`
-   Unique `(bucket_id, object_path)`

Indexes: `(conversation_id, created_at desc)`,
`(uploaded_by, created_at desc)`.

### 3.10 `ai_assistants`

-   `id uuid primary key default gen_random_uuid()`
-   `owner_user_id uuid not null references auth.users(id) on delete cascade`
-   `name text not null`
-   `avatar_path text`
-   `description text`
-   `personality text`
-   `instructions text not null`
-   `tone text`
-   `language text`
-   `starter_prompts jsonb not null default '[]'::jsonb`
-   `is_enabled boolean not null default true`
-   `created_at timestamptz not null default now()`
-   `updated_at timestamptz not null default now()`

Indexes: `(owner_user_id, created_at desc)`, `(is_enabled)`.

No client-supplied model override is trusted. Provider is Cloudflare
Workers AI; model ID is controlled by validated platform configuration.

### 3.11 `group_assistants`

-   `id uuid primary key default gen_random_uuid()`
-   `group_conversation_id uuid not null references public.groups(conversation_id) on delete cascade`
-   `assistant_id uuid not null references public.ai_assistants(id) on delete cascade`
-   `response_mode public.assistant_response_mode not null default 'mentioned_only'`
-   `added_by uuid not null references auth.users(id)`
-   `is_enabled boolean not null default true`
-   `created_at timestamptz not null default now()`
-   `updated_at timestamptz not null default now()`
-   Unique `(group_conversation_id, assistant_id)`

### 3.12 `assistant_usage`

-   `id uuid primary key default gen_random_uuid()`
-   `assistant_id uuid not null references public.ai_assistants(id) on delete cascade`
-   `user_id uuid not null references auth.users(id) on delete cascade`
-   `conversation_id uuid references public.conversations(id) on delete set null`
-   `model_id text not null`
-   `input_units integer`
-   `output_units integer`
-   `request_status text not null`
-   `latency_ms integer`
-   `request_id text`
-   `created_at timestamptz not null default now()`

Indexes: `(user_id, created_at desc)`,
`(assistant_id, created_at desc)`, `(created_at desc)`.

### 3.13 `reports`

-   `id uuid primary key default gen_random_uuid()`
-   `reporter_user_id uuid not null references auth.users(id)`
-   `target_type public.report_target_type not null`
-   `target_user_id uuid references auth.users(id) on delete set null`
-   `target_message_id uuid references public.messages(id) on delete set null`
-   `target_group_conversation_id uuid references public.groups(conversation_id) on delete set null`
-   `reason text not null`
-   `details text`
-   `status public.report_status not null default 'open'`
-   `assigned_to uuid references auth.users(id)`
-   `resolution_note text`
-   `resolved_at timestamptz`
-   `created_at timestamptz not null default now()`
-   `updated_at timestamptz not null default now()`

Indexes: `(status, created_at desc)`, `(target_type, created_at desc)`.

Enforce that the target columns match `target_type`.

### 3.14 `developer_profile`

Singleton public developer content. -
`id smallint primary key default 1 check (id = 1)` -
`name text not null default 'Adeel Bhatti'` -
`subtitle text not null default 'Developer of AdiChat'` - `bio text` -
`why_built text` - `photo_path text` - `email_url text` -
`whatsapp_url text` - `github_url text` - `linkedin_url text` -
`is_visible boolean not null default true` -
`updated_by uuid references auth.users(id)` -
`updated_at timestamptz not null default now()`

Public read only when visible; writes restricted to admins.

### 3.15 `app_settings`

Key/value settings with explicit typed values in JSON. -
`key text primary key` - `value jsonb not null` - `description text` -
`updated_by uuid references auth.users(id)` -
`updated_at timestamptz not null default now()`

Suggested keys: `app_name`, `default_theme`, `allow_signups`,
`email_verification_required`, `max_file_size_bytes`,
`allowed_file_types`, `voice_note_max_length_seconds`,
`group_size_limit`, `feature_groups_enabled`,
`feature_voice_notes_enabled`, `feature_ai_enabled`,
`feature_reactions_enabled`, `ai_model_id`, `ai_daily_message_limit`,
`ai_max_assistants_per_user`, `maintenance_mode`, `maintenance_message`,
`terms_content`, `privacy_content`.

Validate each key and value schema in trusted code; never accept
arbitrary unvalidated JSON from browser.

### 3.16 `announcements`

-   `id uuid primary key default gen_random_uuid()`
-   `title text not null`
-   `body text not null`
-   `show_as_banner boolean not null default false`
-   `status public.announcement_status not null default 'draft'`
-   `created_by uuid not null references auth.users(id)`
-   `published_at timestamptz`
-   `created_at timestamptz not null default now()`
-   `updated_at timestamptz not null default now()`

Indexes: `(status, published_at desc)`.

### 3.17 `audit_logs`

Append-only record of privileged operations. -
`id uuid primary key default gen_random_uuid()` -
`actor_user_id uuid references auth.users(id) on delete set null` -
`action text not null` - `target_type text` - `target_id text` -
`details jsonb not null default '{}'::jsonb` - `request_id text` -
`ip_hash text` - `created_at timestamptz not null default now()`

Indexes: `(created_at desc)`, `(actor_user_id, created_at desc)`,
`(target_type, target_id)`.

Do not store passwords, secrets, full private message bodies or
unnecessary personal data in audit details.

### 3.18 `user_blocks`

-   `id uuid primary key default gen_random_uuid()`
-   `blocker_user_id uuid not null references auth.users(id) on delete cascade`
-   `blocked_user_id uuid not null references auth.users(id) on delete cascade`
-   `created_at timestamptz not null default now()`
-   Unique `(blocker_user_id, blocked_user_id)`
-   Check blocker and blocked users differ.

## 4. Relationships summary

-   `auth.users` 1:1 `profiles`, `user_settings`.
-   `auth.users` 1:N `user_roles`, `ai_assistants`, `messages`,
    `reports`, `audit_logs`.
-   `conversations` N:M users through `conversation_members`.
-   `conversations` 1:1 `groups` for group conversations.
-   `conversations` 1:N `messages`; messages 1:N `attachments` and
    `message_receipts`.
-   `ai_assistants` N:M group conversations through `group_assistants`.
-   `ai_assistants` 1:N `assistant_usage`.
-   `developer_profile` and `app_settings` are platform-level records.

## 5. RLS policy requirements

Enable RLS on every table. Policies must be implemented with
security-definer helper functions only when necessary, fixed
`search_path`, explicit grants and careful recursion prevention.

  --------------------------------------------------------------------------------------------------------
  Table                  SELECT                INSERT              UPDATE            DELETE
  ---------------------- --------------------- ------------------- ----------------- ---------------------
  profiles               Own profile; limited  Auth                Own safe fields;  Auth
                         public directory      trigger/trusted     admin limited     lifecycle/trusted
                         fields only for       creation            moderation fields only
                         authenticated search;                                       
                         admins per policy                                           

  user_roles             Own roles; Super      Super               Super Admin only  Super Admin only
                         Admin can inspect     Admin/bootstrap                       
                                               only                                  

  user_settings          Own                   Own                 Own               Own/trusted

  conversations          Members only          Trusted function    Group admins      Group admin under
                                               creates with valid  limited group     policy / admin
                                               members             metadata; trusted moderation
                                                                   updates           

  conversation_members   Same conversation     Creator/group admin Group admin;      Group admin removes
                         members; user can see or trusted          member can update member; user may
                         own memberships       direct-chat         own read/mute     leave
                                               function            state only        

  groups                 Group members         Trusted group       Group admins      Group admins/admin
                                               creation                              moderation

  messages               Conversation members  Member with valid   Sender edits own  Sender soft-delete
                         only                  sender identity     allowed message   own where allowed;
                                                                   fields; trusted   admin moderation
                                                                   moderation        audited

  message_receipts       Recipient and         Recipient/trusted   Recipient updates Trusted cleanup
                         conversation members  delivery function   own read state    
                         as narrowly required                                        

  attachments            Conversation members  Authenticated       Uploader limited  Uploader/authorized
                         and authorized owner  uploader with       metadata or       admin under policy
                                               membership and file trusted           
                                               checks                                

  ai_assistants          Owner; authorized     Authenticated owner Owner             Owner/admin
                         group users only for                                        moderation
                         public assistant                                            
                         display fields                                              

  group_assistants       Group members         Group admin         Group admin       Group admin

  assistant_usage        Owner of assistant    Worker/trusted      No client update  No client delete
                         and authorized admin  function                              
                         aggregates                                                  

  reports                Reporter sees own;    Authenticated user  Authorized        Super Admin
                         moderators/admins see                     moderator/admin   only/retention
                         assigned/authorized                                         
                         reports                                                     

  developer_profile      Public if visible;    Bootstrap           Admin             Super Admin only
                         admin always          seed/trusted only                     

  app_settings           Only safe public      Admin trusted       Admin/Super Admin Super Admin only
                         settings; admin all                                         

  announcements          Published             Admin               Admin             Admin/Super Admin
                         announcements for                                           
                         users; admin all                                            

  audit_logs             Super                 Trusted server      No client update  No client delete
                         Admin/authorized      function only                         
                         admins read                                                 

  user_blocks            Blocker only          Authenticated       No client update  Blocker only
                                               blocker                               
  --------------------------------------------------------------------------------------------------------

Important: "admin" access must be implemented by querying `user_roles`
through a safe helper; never accept a client-supplied role claim without
verification. Group-level policies must check `conversation_members`
membership and role.

## 6. Storage buckets and policies

  -----------------------------------------------------------------------------------------------------
  Bucket               Visibility        Object path                                  Policy
  -------------------- ----------------- -------------------------------------------- -----------------
  `avatars`            Private by        `{user_id}/{file_id}`                        Owner writes;
                       default                                                        authorized users
                                                                                      read avatar
                                                                                      according to
                                                                                      profile
                                                                                      visibility

  `chat-attachments`   Private           `{conversation_id}/{message_id}/{file_id}`   Only conversation
                                                                                      members read;
                                                                                      uploader writes

  `voice-notes`        Private           `{conversation_id}/{message_id}/{file_id}`   Only conversation
                                                                                      members read;
                                                                                      uploader writes

  `developer-assets`   Public read if    `{file_id}`                                  Admin-only
                       profile visible                                                write/delete
  -----------------------------------------------------------------------------------------------------

Storage policies must cross-check database membership/ownership.
Validate content type and size before accepting upload. Do not rely only
on file extension.

## 7. Functions, triggers and trusted operations

Required database/backend operations: 1. `handle_new_user()` trigger:
create profile and default settings from Auth metadata safely. 2.
`set_updated_at()` trigger for mutable tables. 3.
`create_direct_conversation(other_user_id)` trusted RPC: validate active
users, block state, canonical pair key and create/retrieve direct thread
atomically. 4. `create_group(name, description, member_ids)` trusted
transaction/RPC: create conversation, group row, creator as group admin
and selected members. 5. `add_group_members(group_id, member_ids)`
checks caller is group admin. 6.
`remove_group_member(group_id, user_id)` checks group admin and prevents
invalid removal of last admin. 7.
`set_message_read(conversation_id, last_message_id)` updates recipient
receipts and read cursor, honoring read-receipt preference. 8.
`get_user_role()` / `is_admin()` safe helper for RLS. 9.
`bootstrap_super_admin(target_user_id, expected_email, one_time_secret)`
trusted one-time process. Verify existing Auth user identity, ensure no
unsafe caller path, write role and audit log, then disable/consume
bootstrap. 10. `admin_update_user_status()` privileged operation with
audit log. 11. `admin_resolve_report()` privileged moderation operation
with audit log. 12. `admin_update_app_settings()` validates allowed
keys/types and audits changes. 13. Workers AI request handler is a
Cloudflare Worker function, not a browser-exposed SQL function. It
authenticates user, validates membership, invokes `env.AI`, persists
usage and response. 14. Search functions/queries must return only
records visible to the caller.

Use transactions for multi-table writes. Prefer RPC/Worker service
boundary for privileged workflows.

## 8. Bootstrap Super Admin procedure

-   Adeel Bhatti must first sign up and verify the intended account.
-   Confirm the Auth user UUID and verified email through the trusted
    operator channel.
-   Run the one-time bootstrap using a server-only credential or SQL
    executed by an authorized project owner.
-   Grant `super_admin` to that exact UUID; do not search by display
    name.
-   Insert an audit record identifying the bootstrap event.
-   Disable/remove the bootstrap endpoint/secret immediately.
-   Verify `/admin` access and that another ordinary account cannot
    access admin routes or mutate `user_roles`.
-   Never expose service-role credentials in browser code, Vite
    variables, GitHub or logs.

## 9. Open schema/config decisions

-   Exact AI model ID and validated Workers AI model capabilities.
-   Numeric upload limits, allowed MIME types and voice-note duration.
-   Group member maximum and AI assistant quotas.
-   Whether admin roles other than Super Admin need granular permission
    scopes.
-   Message edit/delete retention rules and data retention/legal
    deletion policy.
-   Whether a user can add another owner's assistant to a group (default
    proposed: only own assistants).
-   Whether private message content is ever accessible to moderators
    (default: no unrestricted admin access).
-   Whether app analytics require a separate aggregated analytics table.

Do not create defaults for these without recording the owner's approval
or a clearly marked temporary development setting.
