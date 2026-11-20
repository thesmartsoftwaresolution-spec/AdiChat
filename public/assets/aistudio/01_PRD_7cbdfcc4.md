# AdiChat --- Product Requirements Document (PRD)

**Version:** 1.0\
**Prepared:** 20 November 2026\
**Status:** Baseline approved for Google AI Studio implementation\
**Product:** AdiChat

## 1. Product summary

AdiChat is a responsive, realtime messaging application where people can
communicate one-to-one and in groups, share media/files/voice notes, and
create personal AI Assistants that can be chatted with directly or added
to groups. The application includes a public developer-introduction page
and a protected administration panel with operational controls.

The approved Stitch export is the visual source of truth. The
implementation must preserve its existing visual design and translate
the supplied HTML/CSS into reusable React + TypeScript components
without redesigning it.

## 2. Confirmed decisions and constraints

-   UI decision: **use the actual uploaded Stitch ZIP as the visual
    baseline**, not the earlier idealized palette from
    `00_Stitch_UI_Prompts.md`.
-   AI provider: **Cloudflare Workers AI**. The deployment target is
    Cloudflare, and AI inference is to run through Workers AI.
-   Exact Workers AI model identifier is **not yet selected**. Keep it
    configurable and record the selected model as a deployment
    configuration decision; do not silently invent a model.
-   Backend: Supabase (PostgreSQL, Auth, Storage, Realtime).
-   Frontend: React + TypeScript + Vite.
-   Hosting/deployment: Cloudflare Workers & Pages only; no Vercel.
-   Source control: GitHub `main` branch. Future ChatGPT-assisted code
    changes are direct commits to `main`; do not create pull requests.
-   First Super Admin: secure bootstrap of Adeel Bhatti after his
    account exists. No public self-service privilege escalation.
-   No additional Prompt 1 requirements have been supplied. This
    document set is based on `00_Stitch_UI_Prompts.md`, the Stitch ZIP,
    and the confirmations above.
-   English UI, left-to-right.
-   Public, authenticated user, group-level admin/member, and
    application admin roles.

## 3. Goals

1.  Deliver a reliable realtime messaging experience across mobile and
    desktop.
2.  Allow users to discover registered users and start direct
    conversations.
3.  Allow users to create and administer groups, including group
    membership.
4.  Allow users to create, configure, and use their own AI Assistants.
5.  Allow AI Assistants to participate in groups according to per-group
    response mode.
6.  Provide secure account, privacy, notification, profile, media and
    search experiences.
7.  Provide a protected admin console for user, group, assistant,
    report, developer-profile, application-settings, announcement and
    audit-log management.
8.  Preserve the approved Stitch appearance across all responsive views
    and both themes.

## 4. Target users

-   Everyday users communicating with friends, family, study groups and
    communities.
-   Users who want personal AI helpers with custom names, personalities,
    instructions and starter prompts.
-   Group owners/admins who manage membership and group assistants.
-   Application administrators who moderate and configure the platform.
-   Public visitors viewing the welcome and developer-introduction
    pages.

## 5. Roles and authorization

  -----------------------------------------------------------------------
  Role                    Scope                   Capabilities
  ----------------------- ----------------------- -----------------------
  Public                  Unauthenticated         View Welcome / Landing
                                                  and Developer Intro;
                                                  sign up, log in,
                                                  request password reset

  User                    Own account and         Direct chats, groups,
                          conversations           media, search, own
                                                  profile/settings, own
                                                  assistants

  Group Admin             A particular group      Group settings, member
                                                  management, add/remove
                                                  assistants, group-level
                                                  actions

  Group Member            A particular group      Read/send messages and
                                                  use group features
                                                  allowed by settings

  Admin                   Application-wide,       Admin console
                          granted by trusted      operations according to
                          admin                   assigned admin role

  Super Admin             Application-wide        Manage admins and all
                          highest privilege       platform controls;
                                                  initial bootstrap
                                                  account is Adeel Bhatti
  -----------------------------------------------------------------------

Authorization is enforced by Supabase RLS and trusted server-side
functions, not by hiding buttons in the UI. The UI may hide unauthorized
controls, but this is not a security boundary.

## 6. Product scope and features

### 6.1 Public and authentication

-   Welcome / Landing with Create account, Log in, theme choice and
    About the developer.
-   Sign Up using full name, email, password and confirmation.
-   Login using email and password.
-   Forgot Password email request.
-   Reset Password using a valid Supabase recovery session.
-   Clear validation, loading, success and error states.
-   Email verification behavior follows the Supabase Auth configuration.

### 6.2 Direct messaging

-   Chats List (Home) with mixed direct, group and AI conversations.
-   New Chat / Find Users by name or email.
-   Chat Conversation (1-to-1), message history and composer.
-   Message delivery states: sending, sent, delivered and read, where
    supported by the implemented event model.
-   Typing/presence indicators where supported by Supabase Realtime and
    client presence.
-   Attachments: images, files and voice notes.
-   Contact Info, mute/block controls, shared media and groups in
    common.
-   Global Search across authorized chats, messages, people and
    assistants.

### 6.3 Groups

-   New Group - Select Members.
-   New Group - Group Details.
-   Group Chat Conversation with sender labels and assistant replies.
-   Group Info & Members.
-   Add Members to Group.
-   Group Admin/member permissions.
-   Add Assistant to Group with response mode:
    -   Only when @mentioned
    -   Reply to every message

### 6.4 AI Assistants

-   AI Assistants Hub.
-   Create AI Assistant with name, avatar, personality, instructions,
    tone, language and starter prompts.
-   AI Assistant Profile & Settings (view/edit/delete, usage and group
    membership).
-   AI Chat Conversation with streaming response presentation, thinking
    state, regenerate and copy.
-   Add Assistant to Group.
-   Inference provider: Cloudflare Workers AI, invoked from trusted
    server-side Cloudflare Worker code.
-   The browser must never call a privileged Workers AI endpoint using a
    secret or expose provider credentials.
-   Exact model ID, model availability/limits, and production rate/cost
    limits remain configurable decisions pending deployment validation.

### 6.5 Profile, settings and media

-   My Profile: avatar, name, about, email read-only, edit.
-   Settings: account, privacy, notifications, theme, storage/data,
    help, developer page, admin-only entry, logout.
-   Media Viewer for images, files and voice notes.
-   Shared Media & Files with Media, Files and Voice notes tabs.
-   Light / Dark / System theme preference.

### 6.6 Developer Intro

-   Public and authenticated access.
-   Initial developer name: Adeel Bhatti.
-   Initial avatar placeholder: initials "AB"; actual photo is uploaded
    later through Admin - Developer Profile.
-   Subtitle, bio, "Why I built AdiChat", optional
    Email/WhatsApp/GitHub/LinkedIn links, app version and footer.
-   Links only render when populated and valid.

### 6.7 Admin console

-   Admin - Dashboard: totals, activity, quick actions, signups and
    reports.
-   Admin - Users: search, filters, statuses, bulk actions, admin
    management.
-   Admin - User Detail: overview, groups, assistants, reports, status
    and role controls.
-   Admin - Groups: inspect, rename, remove members, delete.
-   Admin - AI Assistants: inspect, enable/disable/delete, usage limits.
-   Admin - Reports & Moderation: review and resolve reports;
    warn/suspend/ban/delete where authorized.
-   Admin - Developer Profile: edit public developer content and photo.
-   Admin - App Settings: general, access, chat/files, feature flags, AI
    configuration, maintenance and legal content.
-   Admin - Announcements & Logs: publish announcements and inspect
    audit events.
-   All privileged mutations must be audited.

## 7. Core business rules

1.  Users can access only their own private profile fields, assistant
    configurations, and conversations unless group membership or an
    explicit admin permission grants access.
2.  A direct conversation must have exactly two distinct user
    participants; only one canonical conversation per unordered
    participant pair should exist.
3.  Group membership is explicit. A non-member cannot read group
    messages or group files.
4.  Group Admin authority is scoped to the relevant group.
5.  AI Assistants are owned by a user. The owner can edit/delete their
    assistants, subject to platform limits.
6.  An assistant can only be added to a group by an authorized group
    admin and only if it is owned/accessible under the product policy.
    Initial implementation should permit only assistants owned by the
    adding user unless a later explicit sharing rule is approved.
7.  Assistant response mode is stored per group-assistant membership.
8.  AI prompts, user messages and generated responses are stored as
    conversation messages according to the retention policy configured
    for the app.
9.  AI inference is performed server-side using Cloudflare Workers AI.
    User instructions are untrusted input and must not override
    platform/system policy.
10. File access uses private storage buckets and signed URLs or
    authenticated object access. Do not make private chat attachments
    publicly readable.
11. User status values include active, suspended and banned.
    Suspended/banned users cannot use protected app actions; exact admin
    appeal workflow is not specified.
12. Admin role assignment is restricted to Super Admin or a trusted
    bootstrap procedure.
13. Admin mutations, moderation actions, role changes and sensitive
    settings changes create audit records.
14. Destructive actions require confirmation in the UI and server-side
    authorization.
15. Admin analytics must be derived from actual records; do not
    fabricate totals or activity.
16. Privacy controls (last seen, online status, read receipts,
    notification preferences) must be honored in UI and server/event
    behavior where applicable.

## 8. Non-functional requirements

-   Responsive mobile, tablet and desktop layouts.
-   Realtime updates for message creation and relevant presence/typing
    events.
-   Secure-by-default authorization and private storage.
-   Input validation on client and server.
-   Accessible keyboard navigation, visible focus, semantic labels,
    sufficient contrast and minimum 44px touch targets.
-   Graceful loading, empty, offline, retry and error states.
-   Reasonable pagination/virtualization for long lists and message
    histories.
-   Avoid leaking email addresses, private metadata, provider secrets or
    admin data.
-   Use environment variables for public client configuration and
    Cloudflare secrets/bindings for privileged server-side values.
-   Build reproducibly with npm and `npm run build`, producing `dist`.

## 9. Out of scope / not yet specified

-   Voice/video calling.
-   End-to-end encryption protocol.
-   Paid plans, billing, subscriptions or monetization.
-   Multi-language UI beyond English.
-   Native iOS/Android applications.
-   Exact AI model selection, token budget, inference limits and model
    fallback.
-   Exact retention/deletion schedule and legal jurisdiction policy.
-   Detailed abuse appeals workflow.
-   External push-notification provider.
-   Exact online/presence retention and offline delivery SLA.

These must not be invented during implementation. Keep configuration
seams where practical and report decisions that block production.

## 10. Success criteria

-   All 35 named Stitch screens are implemented as responsive React
    routes/components.
-   The supplied ZIP is used as the UI source of truth; actual screen
    layouts are not replaced by a new design.
-   Light/dark appearance is consistent with the actual ZIP baseline.
-   Authenticated users can complete direct chat and group chat
    workflows.
-   Users can create/use assistants via Cloudflare Workers AI
    server-side integration.
-   RLS prevents cross-user and non-member access.
-   Admin-only pages and operations are protected at both UI and backend
    levels.
-   Bootstrap process grants Super Admin only to the intended existing
    account and cannot be invoked by ordinary users.
-   Cloudflare production build and SPA navigation work on refresh/deep
    links.
