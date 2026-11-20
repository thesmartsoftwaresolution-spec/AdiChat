# AdiChat Master Plan & Continuation Rules

> **Purpose:** This is the durable hand-off file for future ChatGPT sessions. Read this file and the six project specification documents before doing further work. Continue from the latest verified GitHub `main`, Supabase production database, and existing Cloudflare deployment. Do not rely on chat history as the source of truth.

**Last updated:** 2026-11-20  
**Last verified main commit before this plan update:** `c1d2abf3c87b5808496a012241703204fb1e383b`  
**Last verified Cloudflare deployment:** `8f340ace-6747-4372-b398-d0042023fa6f` — build/deploy success for commit `c1d2abf3c87b5808496a012241703204fb1e383b`; production alias unchanged.  
**Repository:** https://github.com/thesmartsoftwaresolution-spec/AdiChat  
**Required branch:** `main` only  
**Production URL:** https://adichat.pages.dev  
**Supabase project:** `AdiChat` (`qqaxxpjzkbhofjlmbvrf`, `ap-northeast-1`)  
**Primary language with owner:** Roman Urdu.

---

## 1. Non-negotiable owner rules

- [x] Owner has authorized the current project work and direct commits to `main`.
- [ ] Before each new significant/risky change, explain the intended change and obtain explicit yes/no approval. Routine, low-risk, clearly approved work may continue without repeatedly interrupting.
- [x] Never create a new repository, feature branch, or pull request unless the owner explicitly requests it.
- [x] Never migrate hosting to Vercel or introduce OpenAI/Gemini as AdiChat application AI providers without explicit approval.
- [x] Preserve the existing Cloudflare Pages project, URL, custom domains, configuration, bindings, secrets, and working deployment. Never create a replacement project or delete production resources.
- [x] Never expose Supabase service-role keys or Cloudflare secrets in frontend code, commits, logs, or chat.
- [x] Never disable RLS, bypass authorization, or grant privileged roles through user-editable metadata.
- [x] Never delete production users/data, drop tables, reset the database, or run destructive migrations without explicit approval.
- [x] Preserve approved Stitch UI layouts, typography, spacing, colors, responsive behavior, and interactions. No unnecessary redesign.
- [x] Do not ask the owner to run technical commands or perform technical configuration. Do not request passwords, OTPs, recovery codes, or secret keys.
- [x] Report only changes and tests actually confirmed by tools. Clearly distinguish deployed, built, and end-to-end tested states.
- [x] Keep this file updated after meaningful work. Use `[x]` only for verified completion; use `[ ]` for pending work and document blockers.

## 2. Source-of-truth documents and assets

Read these project specifications from the owner-provided archive / repository copies when available:

- `01_PRD.md`
- `02_TRD.md`
- `03_App_Flow.md`
- `04_UI_UX_Design_Brief.md`
- `05_Backend_Schema.md`
- `06_Implementation_Plan.md`

Google Stitch screens are the visual source of truth. The supplied archive was inspected: it contains exactly **35 HTML screens + 35 matching PNG screenshots** (70 files total), consistent with the title **35 Mobile Light Screens**. The TRD/implementation docs claim 140 variants (mobile/desktop × light/dark); those additional 105 design variants are not present in the supplied archive. Do not claim 140 variants are available or implemented; record this as a source-asset gap and use the 35 supplied mobile-light designs as the current visual baseline until the owner supplies additional variants or confirms a derived responsive/theme strategy.

The connected GitHub repository `thesmartsoftwaresolution-spec/AdiChat` on `main` is the source of truth for application code. Supabase project `qqaxxpjzkbhofjlmbvrf` is the source of truth for the live database. Existing Cloudflare Pages project `adichat` and `https://adichat.pages.dev` are the source of truth for hosting.

## 3. Approved architecture

- Frontend: React + TypeScript + Vite.
- Database, authentication, storage, realtime: Supabase.
- Hosting: existing Cloudflare Pages project.
- Application AI: Cloudflare Workers AI through a server-side Pages Function.
- Current AI model configured: `@cf/meta/llama-3.3-70b-instruct-fp8-fast` via binding `AI`; configured model is a Cloudflare-hosted Workers AI model, not an OpenAI API integration.
- Never expose service-role credentials; server-side AI route uses user JWT and public publishable key with database permission checks.

## 4. Current production and implementation snapshot

### Cloudflare / AI

- [x] Existing Cloudflare Pages project `adichat` retained.
- [x] Production URL remains `https://adichat.pages.dev`.
- [x] Production AI binding `AI` configured.
- [x] Model ID `@cf/meta/llama-3.3-70b-instruct-fp8-fast` configured.
- [x] Server-side `functions/api/ai/chat.ts` deployed; origin, JWT, active profile, assistant visibility, conversation membership, quota, and persistence checks implemented.
- [x] Wrangler Pages configuration committed.
- [x] Latest deployment previously verified successful at immutable URL `https://6c461022.adichat.pages.dev`, commit `828ad0c16a90c990856261180364741af62118d4`. **Re-check current deployment after later commits.**
- [ ] Authenticated AI chat end-to-end test with a verified user and real assistant.
- [x] Cloudflare Pages builds/deployments passed for direct messaging and group creation commits (`e84b677`, `10305d5`, `8e000db`, `863ce27`, `c36d4c5`).
- [ ] Production browser smoke test for login, direct chat, group creation, and AI chat; browser interaction is not available through the current connected tools.

### Supabase

- [x] Existing project is `ACTIVE_HEALTHY`, PostgreSQL 17.
- [x] Application schema exists (19 public app tables in latest audit).
- [x] RLS is enabled; do not disable.
- [x] Four migrations were listed in latest verified audit:
  - `20261120150815_initial_schema_hardened`
  - `20261120150900_secure_profile_access`
  - `20261120151448_cloudflare_ai_assistant_chat`
  - `20261120151931_index_foreign_keys`
  - `20261120153635_grant_profiles_select_authenticated` (temporary broad grant, superseded)
  - `20261120154054_tighten_profiles_column_select`
  - `20261120154113_restore_safe_profile_column_select`
  - `20261120154502_harden_set_message_read`
  - `20261120154639_send_conversation_message`
  - `20261120154848_harden_create_direct_conversation`
  - `20261120155036_create_group_with_settings` (initial)
  - `20261120155325_use_configured_group_size_limit`
  - `20261120155554_harden_privileged_helpers_and_group_membership`
  - `20261120155739_grant_safe_profile_and_mute_updates`
  - `20261120160204_group_settings_and_assistant_sync`
  - `20261120160615_fix_sync_group_assistants_alias`
- [x] AI assistant conversation and quota/persistence RPCs are present.
- [x] Foreign-key indexes were added.
- [x] Verified all 16 applied migration files exist in `supabase/migrations/` and their SQL exactly matches the recorded Supabase migration statements.
- [ ] Reconcile canonical `supabase/schema.sql` fully against the complete database object inventory; all new RPCs and recent grants are included, but full clean-room replay is still pending.
- [ ] Review remaining Supabase Security Advisor findings (last verified: 20 SECURITY DEFINER warnings; helper functions now require active accounts and all public SECURITY DEFINER functions use fixed search paths).
- [ ] Review remaining Performance Advisor RLS initplan findings (last known: 24).
- [ ] Review `public.rls_auto_enable()` trigger function and `bootstrap_state` access controls.
- [ ] Verify all relevant RLS policies, storage policies, realtime publication tables, and functions against the approved schema.
- [x] Rollback-only SQL test verified message insertion, conversation last-message update, read receipt insertion, group only-admins-send rejection, and cross-conversation read-receipt rejection; transaction rolled back and no test data persisted.
- [x] Rollback-only SQL validation confirmed invalid self-DM and group-without-other-member requests are rejected.
- [x] Rollback-only authenticated tests verified safe profile updates succeed while `profiles.status` updates are denied; user settings upsert succeeds; group add/remove and report insert succeed; all test transactions rolled back.
- [ ] Test real authenticated flows with a second active account and record evidence.

### Existing account and Super Admin bootstrap

**Intended first Super Admin:** Adeel Bhatti  
**Email:** `thesmartsoftwaresolution@gmail.com`  
**Auth user UUID:** present in Supabase Auth; retrieve afresh from Supabase when needed and do not hardcode into public docs.

- [x] Exact Auth account found.
- [x] Matching profile found: `Adeel Bhatti`; profile status is `active`.
- [x] Initial role was `user`; the one-time bootstrap added `super_admin`. Both `user` and `super_admin` role rows exist; `get_user_role()` resolves `super_admin` by priority.
- [x] `bootstrap_state` was initially empty and is now consumed by the one-time bootstrap for this exact account.
- [x] Root cause of current login failure identified: Auth user is not email-confirmed (`email_confirmed_at IS NULL`, `confirmed_at IS NULL`).
- [x] Login currently swallowed the useful Supabase auth error and displayed generic invalid credentials.
- [x] Login UI updated to explain unverified email and offer a resend-confirmation action.
- [x] Sign-up UI updated to show a confirmation-required state instead of navigating to protected chats when Supabase returns no session.
- [x] Bootstrap instructions corrected to use the intended email and explicitly forbid manually bypassing email verification.
- [x] Supabase Auth confirms `email_confirmed_at IS NOT NULL` (confirmed at `2026-11-20 15:32:56 UTC`).
- [x] Fixed the second login failure cause: the session provider selected profile columns without matching authenticated SELECT grants. Only the required public profile columns are now selectable; `email` remains inaccessible, RLS stays enabled, and the authenticated-role query was verified.
- [x] One-time Super Admin bootstrap completed for this exact Auth user; role `super_admin` added, audit log written, and `bootstrap_state` consumed at `2026-11-20 15:36:01 UTC`.
- [x] Database verification confirms both `user` and `super_admin` roles; an authenticated-role SQL test can read this user's own role rows.
- [ ] Owner login end-to-end browser test after the profile privilege fix; never request or store the password.

**Security rule:** Do not manually set `auth.users.email_confirmed_at`, do not disable confirmation requirements, and do not grant `super_admin` while the email is unverified. The owner explicitly requested this account, but verification is the required proof of mailbox ownership.

### GitHub CI

- [x] Added `.github/workflows/ci.yml` for `npm run lint`, `npm test`, and `npm run build` on pushes to `main`.
- [ ] Verify the GitHub Actions run result; the connected GitHub status interface has not exposed a workflow conclusion yet.

### GitHub auth changes in current work

- [x] `src/app/providers/AppStateProvider.tsx`: distinguish unconfirmed email from invalid credentials and expose actionable error.
- [x] `src/pages/public/LoginPage.tsx`: add resend confirmation email action.
- [x] `src/pages/public/SignUpPage.tsx`: show confirmation-required notice when no authenticated session is returned.
- [x] `supabase/bootstrap_super_admin.md`: correct target email and add explicit verified-email guard.
- [x] Root cause found in PostgreSQL logs: authenticated profile SELECT failed with `permission denied for table profiles` (SQLSTATE `42501`), causing the app to sign out immediately after successful password authentication.
- [x] Login root cause fixed with least-privilege profile grants: `authenticated` can SELECT only `id, full_name, avatar_path, about, title, is_online, last_seen_at, status, theme_preference, created_at, updated_at`; the `email` column remains inaccessible. The temporary table-wide grant was superseded by migrations `20261120154054` and `20261120154113`.
- [x] Added matching migration file `supabase/migrations/20261120153635_grant_profiles_select_authenticated.sql` and updated canonical `supabase/schema.sql`.
- [x] Verified the complete profile projection used by the login/session provider succeeds under `SET ROLE authenticated` + the owner's JWT subject; `email` remains unselectable; RLS remains enabled and `anon` cannot SELECT `public.profiles`.
- [x] Hardened `set_message_read`: it now requires an active member, validates that `last_msg_id` belongs to the supplied conversation, uses a fixed `pg_catalog, public` search path, and is executable only by `authenticated` (not `anon`).
- [x] Hardened exposed SECURITY DEFINER functions: all use fixed `pg_catalog, public` search paths; active-account status is required for admin, super-admin, conversation-member, and group-admin helpers; group member add/remove RPCs require a real group and active caller, and added users must be active; obsolete `create_group` RPC execution was revoked in favor of the validated settings-aware RPC.
- [x] Verified authenticated role can SELECT its own `user_roles`, including `super_admin`.
- [x] Under an authenticated-role test context for this exact user, database helpers return `is_admin() = true` and `is_super_admin() = true`.
- [x] Auth UI and database fixes are committed on `main`; Cloudflare builds for auth UI commits passed. The latest schema sync commit (`1408ef324dbdfa59c43c7fda46e733530ce83506`) completed build and deployment successfully.
- [x] Latest Cloudflare production deployment for commit `4c2967264dac30d4a7f2edb5a7afc9b3e07a4151` finished successfully; production alias/domain unchanged.
- [ ] Owner login/session/admin browser test (password is private and must never be requested).
- [ ] Owner confirms successful login after the profile column grant fix; do not request password.

## 5. Overall product completion checklist

Track each capability against PRD/TRD/App Flow/Backend Schema and Stitch references. Existing screen components alone do not prove backend functionality.

### Authentication and identity
- [ ] Sign-up, confirmation email, resend confirmation, login, logout, password recovery/reset.
- [ ] Session restore and expiration behavior.
- [ ] Profile hydration and active/suspended/banned enforcement.
- [ ] Role hydration and server/database-enforced admin permissions.
- [ ] Super Admin one-time bootstrap and admin route authorization.

### Direct messaging
- [x] Hydrate active profile directory, user's conversations, memberships, groups, messages, attachments, assistant mappings, user settings, blocks, and usage from Supabase on session restore.
- [x] Create/find direct conversations through the guarded `create_direct_conversation` RPC (active target, block check, duplicate-safe).
- [x] Persist text messages through `send_conversation_message`; server enforces active account, membership, block status, group only-admins-send, reply-target membership, and input limits.
- [x] Persist last-read marker through hardened `set_message_read`; invalid cross-conversation message IDs are rejected.
- [ ] Delivery receipts, unread counters, and realtime subscriptions limited to authorized conversations.
- [x] Persist user blocks/unblocks and user/group reports through Supabase with reporter/owner RLS.
- [ ] Reactions, message search, secure chat media/voice storage, and disappearing messages.
- [ ] End-to-end direct chat test requires a second real active account; production test records were not created.

### Groups
- [x] Hydrate group conversations, group metadata, memberships, and group-assistant mappings from Supabase.
- [x] Create groups and persist metadata through atomic `create_group_with_settings`; validate active members and owned/enabled assistants, store group settings and initial system message.
- [x] Use `app_settings.group_size_limit` for the group cap, with 256 as the current UI-aligned fallback; no hard-coded group-assistant count cap.
- [x] Add/remove members through server-side RPCs; targets must be active and only group admins/platform admins can manage other members.
- [x] Group metadata and settings update atomically through `update_group_settings`.
- [x] Member mute preference persists using a column-scoped update permission; member roles remain protected.
- [x] Only-admins-send enforcement in the message RPC/database; UI shows posting restriction.
- [x] Group reports persist through the moderation reports table.
- [x] Group AI assistant membership and response modes persist through `sync_group_assistants`; only enabled assistants owned by the caller can be linked.
- [ ] Group assistant runtime responses, mentions, audit events, and full owner/admin/member UI permission coverage.

### Media and storage
- [x] Profile avatar uploads validate type/size, use the private `avatars` bucket under the user's UUID folder, and display through signed URLs.
- [x] Profile avatar replacement/removal updates the profile path and cleans up the old object after success.
- [ ] Chat image/file/voice uploads and downloads.
- [ ] Attachment metadata and cleanup lifecycle for chat media.
- [ ] Test all chat storage policies and upsert permissions.

### AI assistants
- [x] Cloudflare Workers AI server-side integration deployed.
- [x] Assistant conversation and message RPC foundation.
- [x] Create assistant records persist to Supabase under owner RLS; update/delete actions remain local-only.
- [x] Server AI route validates assistant ownership/visibility and loads conversation history server-side.
- [x] Fast/Thinking modes are passed to Cloudflare Workers AI and assistant responses/usage are persisted.
- [x] Server-side quota enforces 50 successful requests per rolling 24 hours; usage records include model, thinking mode, tokens, and latency.
- [ ] Persist assistant update/delete actions and complete lifecycle management.
- [ ] Group assistant invocation and response modes.
- [ ] End-to-end test after owner account verification.

### Admin console
- [ ] Replace local-only admin actions with authorized Supabase RPC/table operations and audit logging (current provider admin actions are largely local state only).
- [ ] Dashboard metrics from live database.
- [ ] User listing, details, roles, moderation, and audit trail.
- [ ] Group moderation and management.
- [ ] Assistant moderation and usage.
- [ ] Reports and enforcement.
- [ ] Developer profile, app settings, announcements.
- [ ] Verify every admin action is enforced server-side/RLS, not just hidden in UI.

### Realtime, QA, accessibility, responsive UI
- [ ] Verify realtime publication and subscriptions.
- [ ] Test mobile and desktop against Stitch designs.
- [ ] Loading, empty, error, retry, and offline states.
- [ ] Keyboard accessibility and form validation.
- [ ] Unit tests, TypeScript, production build, and browser smoke tests.
- [ ] Verify Cloudflare deployment and live production URL after approved code changes.



### Current backend integration gap confirmed from code review
- Authentication/session identity and role hydration exist; AI assistant creation/chat paths have Supabase integration.
- Most other provider actions remain local-only at present: profile/settings updates, direct-conversation creation, message sending/read tracking/reactions, group membership/metadata changes, reports, assistant update/delete, group-assistant sync, and admin operations.
- The app therefore must not be described as fully backend-functional yet. The next major implementation phase is to add safe, authorized Supabase persistence + hydration for direct messaging and groups, then storage/realtime, then admin workflows.
- Do not add client-side writes to protected tables as a shortcut. Use existing trusted RPCs or create narrowly scoped RPCs with `auth.uid()` checks and explicit grants, and maintain RLS.

## 6. Known issues / risks to carry forward

1. Super Admin is assigned and email is verified. Owner browser login still needs an end-to-end confirmation after the database privilege fix.
2. PostgreSQL logs proved the sign-in failure was caused by missing table-level `SELECT` on `public.profiles`; migration applied and authenticated-role RLS test now passes.
3. Full authenticated chat/AI flows remain untested; no production assistant/test fixture has been seeded.
4. Supabase Advisor currently reports 18 authenticated-executable SECURITY DEFINER functions, 24 RLS initplan performance warnings, one intentional `bootstrap_state` no-policy info finding, and leaked-password protection disabled. Review each finding; do not blanket suppress or weaken security. Consider enabling leaked-password protection after assessing signup impact and owner approval.
5. The earlier direct live browser smoke test could not be completed. Do not state live end-to-end behavior as verified until tested.
6. The uploaded docs describe 140 HTML variants, while the supplied UI archive is labeled 35 Mobile Light Screens. Inspect and reconcile actual contents.
7. `QA_REPORT.md` contains historical implementation claims and older Gemini references; treat it as historical evidence, not current truth. Update it only after new verification.

## 7. Required working sequence for every substantial task

1. Read this file and relevant sections of the six specification docs.
2. Inspect current GitHub `main` files and recent commits before edits.
3. Inspect actual Supabase schema/data/policies/functions or Cloudflare configuration when affected.
4. Compare approved docs, current code, live DB, Stitch screens, and production deployment.
5. Identify security/data/production risks. Obtain owner approval before significant or destructive changes.
6. Make focused changes directly on `main`; preserve lockfiles and dependencies.
7. Verify tests/build and actual service state. Never infer success from a code commit alone.
8. Update this file's checkboxes, known issues, latest commit SHA, deployment status, and next action.
9. Report changed files, commit SHA, tests, database changes, and deployment verification in Roman Urdu.

## 8. New-chat continuation instruction

When the owner says **"GitHub mein ADICHAT_MASTER_PLAN.md aur rules wali file parho aur kaam jari rakho"**:

1. Read this file from the latest `main` branch.
2. Read all six source-of-truth specification documents and relevant Stitch assets.
3. Inspect recent commits and actual current GitHub/Supabase/Cloudflare state.
4. Resume from the first unchecked item, updating this file as work progresses.
5. Do not ask the owner to repeat known context, do not ask them for technical steps, and do not claim unfinished work is complete.
6. Ask one concise yes/no approval only when a new significant/risky decision is needed.

**Owner's preferred short hand-off phrase:**  
`GitHub mein ADICHAT_MASTER_PLAN.md aur project rules parho, current GitHub/Supabase/Cloudflare state verify karo, aur pehle pending task se AdiChat ka kaam jari rakho.`


- [x] Granted only safe profile-column updates (`full_name`, `about`, `title`, `theme_preference`, `avatar_path`) and only `muted_until` updates on membership rows; table-wide UPDATE remains denied and `status`/`member_role` remain protected. Verified allowed update and denied status update in a rollback-only authenticated test.


- [x] Profile edits and user settings now persist through Supabase; avatar files upload to the private `avatars` bucket under the owner's UUID folder, are displayed with short-lived signed URLs, and old avatar objects are removed after successful replacement. Private email and account status remain unavailable to client updates.


- [x] Added `update_group_settings` and `sync_group_assistants` RPCs; group settings are updated atomically and group assistants can only be linked when owned and enabled by the caller.


- [x] Rollback-only group settings/assistant-sync test passed after correcting an ambiguous PL/pgSQL alias; group name, conversation title, and settings persisted within the test transaction, then rolled back. No test rows remain.


---

## 9. Approved enhancement scope — 2026-11-20 (owner approved: "han")

This scope is approved. Continue without pausing for routine steps; ask again only if a new substantial/risky decision falls outside this approval.

### Current verified identity refresh
- [x] Auth lookup confirms `thesmartsoftwaresolution@gmail.com` exists and `email_confirmed_at` is populated.
- [x] Profile lookup confirms `Adeel Bhatti` with status `active`.
- [x] Role lookup confirms both `user` and `super_admin`.
- [x] Do not re-run bootstrap or create duplicate Super Admin grants.

### A. Compact, attractive icon sizing and mobile polish
- [ ] Inventory oversized Material Symbols/Lucide icons across all screens and shared components.
- [ ] Normalize icon sizing in shared controls, headers, navigation, buttons, empty states, assistant avatars, cards and admin pages without shrinking intentional illustrations.
- [ ] Preserve Stitch spacing, colors, proportions and typography; this is a sizing/consistency pass, not a redesign.
- [ ] Test responsive layouts, safe areas, composer, dialogs, forms and no horizontal overflow on narrow screens.

### B. Chrome Android installable PWA
- [ ] Add and validate Web App Manifest.
- [ ] Add AdiChat app icons (192px, 512px and maskable variants) consistent with existing brand assets.
- [ ] Add a safe service worker and offline fallback.
- [ ] Never cache authenticated Supabase responses, chat messages, private attachments, signed URLs, tokens or secrets.
- [ ] Register/update service worker without losing drafts.
- [ ] Verify Chrome Android installability requirements and production HTTPS behavior; clearly distinguish automated validation from an actual physical-device install.

### C. Advanced AI Assistant creation/profile
- [ ] Add explicit form fields: Name, Profile Photo, Role, Scenario, Behaviour, Custom Instructions.
- [ ] Inspect current table/RLS before additive schema migration; preserve legacy `description`, `personality`, `tone`, `language`, `instructions` and all existing assistant records.
- [ ] Add only required DB fields; update migration, canonical schema, TypeScript types, create/edit/profile UI and data hydration.
- [ ] Store profile images in the existing private `avatars` bucket with owner-scoped paths and MIME/size validation; store object path only (never base64).
- [ ] Compose Role, Scenario, Behaviour and Custom Instructions into server-side AI context; client cannot override system instructions.

### D. Animated AI responses
- [ ] Smooth fade-in/typewriter reveal for new AI replies, not the entire old history on every render.
- [ ] Keep Markdown/code formatting stable and avoid excessive layout jumps.
- [ ] Respect `prefers-reduced-motion`.
- [ ] Add stop/cancel only if server inference can be safely cancelled; do not fake functionality.

### E. AI chat file upload and analysis
- [ ] Add attachment picker, file preview and remove-before-send UI.
- [ ] Use existing private `chat-attachments` bucket, scoped to authorized conversation membership.
- [ ] Add server-side file count/size/MIME/extension checks; do not trust browser metadata alone.
- [ ] Implement safe extraction for supported text formats (TXT, MD, CSV, JSON, PDF, DOCX as feasible); inspect actual runtime dependencies and Cloudflare compatibility before choosing parsers.
- [ ] Treat document content as untrusted input; do not execute files/macros/scripts and do not let embedded prompt instructions override system policy.
- [ ] Bound extracted text/context size; reject unsupported, encrypted, oversized or malformed files with clear errors.
- [ ] Persist attachment metadata using existing `attachments` table and private object paths; no public permanent URLs.
- [ ] Test unauthorized storage access and cross-conversation attachment access.

### F. Message quote/reference and ask-about-this
- [ ] Add message action to quote/reference any message in AI chat.
- [ ] Show removable quote preview in composer.
- [ ] Persist reference via existing `reply_to_message_id` where suitable.
- [ ] Include quoted text in AI context only after server-side conversation/member/message checks.
- [ ] Add "Ask about this" shortcut where relevant; do not leak messages across conversations or include deleted messages.

### G. Additional useful AI chat features
- [ ] Copy, regenerate, retry, edit last prompt, feedback, starter prompts and attachment status.
- [ ] Improve keyboard/screen-reader support and mobile composer.
- [ ] Add only features compatible with existing design and safe backend capabilities.

### Required QA for this enhancement
- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] Mobile + desktop and light + dark visual review.
- [ ] PWA manifest/service-worker/static asset validation.
- [ ] Supabase RLS and storage policy verification.
- [ ] Authenticated AI chat/file analysis tests plus unauthorized-user/file rejection tests.
- [ ] Existing Cloudflare Pages build/deployment verification; production alias and domain must remain unchanged.

## 10. Latest state at this addendum
- Latest inspected GitHub `main` HEAD at start of this scope: `a0d7e75b9f0a0c0d77ebf08b50097c841f44e882`. Always re-fetch current HEAD before future commits.
- Current assistant form is `src/pages/assistants/CreateAssistantPage.tsx`; it currently has name, short description, tone, language, personality, system instructions, starter prompts and default thinking mode. Requested Role/Scenario/Behaviour/Profile Photo are not yet present as separate supported fields.
- Current AI chat is `src/pages/assistants/AIChatPage.tsx`; responses are rendered from persisted messages via `MessageBubble`, without progressive typewriter reveal.
- Current AI message component is `src/components/chat/MessageBubble.tsx`.
- Existing `AIAssistant` TypeScript shape is in `src/types/database.ts`; live `ai_assistants` table has `avatar_path`, `description`, `personality`, `instructions`, `tone`, `language`, `starter_prompts`, `is_enabled`, `thinking_enabled_default`; no explicit role/scenario/behaviour columns were found.
- Existing private Storage buckets verified: `avatars`, `chat-attachments`, `voice-notes`; `developer-assets` is public. Existing chat attachment policies require conversation membership. No bucket-wide size/MIME restrictions were set in the inspected config.
- Supplied Stitch archive is `35 Mobile Light Screens` with one `code.html` and one `screen.png` per screen group; docs claim 140 variants, so do not claim the full variant set was supplied.
- PWA manifest/service worker files were not found in the inspected current tree; installability work remains pending.
- Existing `src/index.css` uses Inter + Material Symbols; icon sizing is a mixture of explicit Tailwind font-size utilities and component dimensions. Do a measured shared-component pass rather than a blind global CSS override.


---

## 11. Implementation progress — 2026-11-20

### Verified completed in current approved scope
- [x] Compact icon baseline: Material Symbols default is now 20px in the Tailwind base layer so explicit utilities remain controllable; AppShell navigation icons were reduced from 22px to 20px; AssistantAvatar fallback icons are now 16/18/20px; shared empty-state icon reduced from 24px to 20px; Media Viewer document glyph reduced from 34px to 22px.
- [x] PWA manifest at `public/manifest.webmanifest`, linked in `index.html`; app name, short name, scope, start URL, standalone display, theme color and `prefer_related_applications:false` set.
- [x] Raster launcher icons verified in Git tree: `public/icons/adichat-192.png` (192x192 PNG, 876 bytes) and `public/icons/adichat-512.png` (512x512 PNG, 2,460 bytes); SVG scalable icon also present. Manifest declares the 192px and 512px PNG icons plus SVG fallback.
- [x] Service worker `public/sw.js` registered only in production; offline fallback `public/offline.html`; app shell/static assets cached conservatively.
- [x] Service worker excludes `/api/`, `/auth/`, `/rest/`, `/storage/`, token/download query URLs and cross-origin resources. Private chats, Supabase data and signed attachments are not cached.
- [x] Global `PWAInstallPrompt` listens for Chrome's `beforeinstallprompt` and `appinstalled` events and presents an in-app Install button when the browser makes the prompt available.
- [x] Supabase migration `20261120220000_add_ai_assistant_role_scenario_behaviour` applied; `ai_assistants.role`, `scenario`, `behaviour` columns and length constraints verified in live schema. Existing `avatar_path` and legacy persona fields retained.
- [x] Assistant creation UI now has Name, Profile Photo, Role, Scenario, Behaviour, Custom Instructions, description, tone, language and starter prompts.
- [x] Assistant profile/edit UI supports the same persona fields and photo replacement/removal.
- [x] Assistant photos upload to the existing private `avatars` bucket under owner-scoped paths; 2 MB limit and JPG/PNG/WebP allowlist enforced; signed URLs are generated for display; base64 is not stored.
- [x] Provider persists assistant role/scenario/behaviour/photo path in Supabase and hydrates signed photo URLs. AI Pages Function now incorporates Role, Scenario, Behaviour, Tone, Language and Custom Instructions into the server-side system prompt.
- [x] AI responses use a fade-in + progressive typewriter reveal. It respects `prefers-reduced-motion`, handles Unicode code points and avoids revealing code blocks ahead of the animation.
- [x] AI chat has a file picker, file preview and remove action. Supported text formats: TXT, MD, CSV, JSON, LOG, XML, HTML, CSS, JS/JSX, TS/TSX, PY, SQL, SH, YAML/YML. Client and server enforce a 5 MB limit.
- [x] Files upload to existing private `chat-attachments` storage, are downloaded by the server using the signed-in user's JWT, UTF-8 validated, bounded to 20,000 extracted characters and passed to Workers AI as untrusted content. Files are never executed.
- [x] Supabase migration `20261120223000_add_assistant_message_attachments_and_replies` applied. New RPC `create_assistant_user_message_with_context` checks active account, assistant ownership, conversation membership, reply target, bucket/path/user ownership, MIME type and file size; inserts message and attachment metadata atomically.
- [x] AI chat messages expose an "Ask about this" reply/reference action; the quoted message preview can be removed before sending. The server verifies the referenced message belongs to the same conversation and is not deleted before including it in AI context.
- [x] Attachment metadata and signed private URLs are hydrated into app state; Media Viewer now opens/downloads the signed private file link instead of showing a fake success toast.
- [x] SQL rollback-only verification passed for attachment metadata persistence, message type `file`, reply reference, anon execute denied and authenticated execute granted. Test data was rolled back.
- [x] GitHub Actions CI passed for commit `68bbcaf16ef1f1a5d7b2aabef802a3d796d39325`: `npm run lint`, `npm test` (3 tests) and `npm run build`.
- [x] Existing Cloudflare Pages project `adichat` deployed commit `68bbcaf16ef1f1a5d7b2aabef802a3d796d39325` successfully. Project remains on `main`, subdomain and only configured domain remain `adichat.pages.dev`; production URL/domain unchanged.

### Still pending / limitations — do not mark complete
- [ ] Full visual icon inventory across every screen; current sizing pass covers shared defaults and major shared components, but all screen-specific explicit icon sizes still need review against Stitch.
- [ ] Full mobile responsive audit across all 35 supplied Stitch mobile screens; test very narrow widths, Android Chrome viewport, safe areas, modals, navigation and chat composer.
- [ ] Verify Chrome Android's actual install prompt and installed standalone launch on a physical device. Manifest requirements and source assets are present, but a physical device install has not been executed from this environment.
- [ ] File analysis currently supports UTF-8 text-based files listed above. PDF, DOCX, image OCR and scanned-document extraction are not yet supported; do not imply otherwise. Add only after confirming a Cloudflare-compatible parser and updating lockfiles/build tests.
- [ ] Run authenticated end-to-end tests for assistant creation/photo upload, AI response, text file upload/analysis, reply/reference and download. No password/token was requested or used; SQL rollback tests do not replace live user-session tests.
- [ ] Test unauthorized storage reads, cross-conversation attachment paths, oversized files, malformed UTF-8, unsupported extensions, deleted reply targets and inactive accounts through the live Pages Function.
- [ ] Confirm signed file download behavior in a real browser session; the app now creates signed URLs but browser download UX has not been manually smoke-tested.
- [ ] Review remaining Supabase Security Advisor warnings from the earlier audit (SECURITY DEFINER helper/RPC notices and RLS initplan notices); no RLS controls were disabled.
- [ ] Check mobile screenshots/light and dark theme after deployment; external live-site browser inspection is not available in this session.
- [ ] Consider document history/context: follow-up questions after the upload currently include the latest message and its current file content only; prior uploaded file contents are not automatically re-extracted for later turns.

### Latest continuation anchor
- Latest verified code commit before this plan update: `c1d2abf3c87b5808496a012241703204fb1e383b`.
- GitHub CI: passed for `c1d2abf3c87b5808496a012241703204fb1e383b` (TypeScript, 3 unit tests, Vite production build).
- Cloudflare Pages deployment `8f340ace-6747-4372-b398-d0042023fa6f`: build/deploy passed; existing production domain `https://adichat.pages.dev` unchanged.
- Live Supabase: assistant persona columns and both additive migrations are applied.
- Next work: continue with remaining responsive/icon audit, then authenticated end-to-end testing and PDF/DOCX support assessment. Keep working directly on `main`; do not ask the owner to perform technical steps.


## Latest verified maintenance update — 2026-11-20

### Owner-approved scope completed in code and deployed
- [x] Added an explicit Supabase auth-hydration readiness state. Protected user/admin routes wait for session restoration and profile hydration before redirect decisions; prevents the initial React render from treating a still-restoring session as signed out.
- [x] Supabase client retains the existing secure persistSession, autoRefreshToken, and URL callback settings. No localStorage-based custom credential/session storage was added.
- [x] AI chat header simplified to assistant identity and a single profile/settings action. Removed model/Thinking status clutter.
- [x] Removed all in-chat and footer Thinking Mode toggles/status. The assistant's High Thinking default remains configurable only from its Edit Assistant settings; the chat uses that saved preference.
- [x] Added natural conversational style guidance to the server-side persona prompt while preserving the assistant's configured Role, Scenario, Behaviour, Tone, Language and Custom Instructions. Safety boundaries and hidden-reasoning protection remain in place.
- [x] Improved Workers AI error diagnostics: logs now include a stable request ID, model ID, error name and bounded diagnostic message; client response includes the request ID without exposing internal provider details.
- [x] Previous model @cf/openai/gpt-oss-20b direct API smoke test succeeded before the model change; this is historical verification only.
- [x] GitHub Actions run 44793771866 passed: dependency install, TypeScript check, unit tests and production Vite build.
- [x] Existing Cloudflare Pages project adichat successfully deployed commit c1d2abf3c87b5808496a012241703204fb1e383b as deployment 8f340ace-6747-4372-b398-d0042023fa6f. Existing production domain and bindings remain unchanged.
- [x] Changed files: src/app/providers/AppStateProvider.tsx, src/App.tsx, src/pages/assistants/AIChatPage.tsx, functions/api/ai/chat.ts.

### Verification still required
- [ ] Physical browser session test: sign in, refresh repeatedly, confirm the same authenticated account remains active. CI verifies type/build, not real browser storage/session behavior.
- [ ] Authenticated end-to-end AI chat request through the deployed Pages Function. Direct model inference is verified, but no user JWT or password was requested, so the full authenticated application route was not exercised.
- [ ] Inspect new request-ID diagnostics if the owner still encounters a model error; the ID can be used to correlate Cloudflare runtime logs.
- [ ] Live visual check of the simplified chat header/footer on mobile and desktop; this session did not have an authenticated browser session.
- [ ] Do not mark all five user issues as physically device-tested until the above manual browser checks are completed.

### Latest continuation anchor
- Latest application code commits: 93472882df94ae9bb6149b54d3ef7d71877d05c1 (chat message actions and badge removal), e7b533308d87fe62d132944ac7b84e6fcad2becd (Roman Urdu AI prompt), and eb8620745dafef6700fca7517b77cea408a786e1 (strict Roman Urdu enforcement).
- Cloudflare deployment for the latest application code: 306ab9ae-2c81-45b3-87c6-3856ceed7ced — build/deploy success; the existing project and production domain remain unchanged.
- No Supabase migration or production database mutation was required for this UI/prompt scope.
- GitHub Actions status for these commits was not exposed by the connected status endpoint; Cloudflare build passed.

## Latest maintenance update — Roman Urdu and message actions (2026-11-20)

- [x] Server-side AI system prompt now requires all assistants to reply in Roman Urdu (Urdu in Latin script), regardless of the assistant profile's saved language. Character identity, role, scenario, behaviour, tone and custom instructions remain active.
- [x] Assistant message action row (Copy, Ask about this, Regenerate, reactions and feedback) is hidden by default and revealed by a 500 ms long press. Context-menu and keyboard context-menu gestures also reveal it.
- [x] Removed the per-message High Thinking Mode pill from assistant message bubbles. Thinking configuration and model inference behavior are unchanged.
- [x] Shared MessageBubble component applies the action behavior consistently wherever assistant messages are rendered, including AI assistant chats and group chats.
- [x] Updated application files: src/components/chat/MessageBubble.tsx and functions/api/ai/chat.ts.
- [x] Cloudflare Pages build/deploy passed for latest application code commit eb8620745dafef6700fca7517b77cea408a786e1 (deployment 306ab9ae-2c81-45b3-87c6-3856ceed7ced). Existing production project adichat and domain adichat.pages.dev retained.
- [ ] Verify long-press behavior on physical Android/iOS and desktop context-menu behavior in a signed-in browser.
- [ ] Verify actual assistant response language and persona behavior with a signed-in AI conversation; no user password or session token was requested.
- [ ] Confirm production alias after the latest documentation-triggered deployment.


## Latest maintenance update — Llama 3.3 70B chat model (2026-11-21)

- [x] Owner requested the Cloudflare Workers AI model `@cf/meta/llama-3.3-70b-instruct-fp8-fast` for AdiChat AI assistant chat.
- [x] `functions/api/ai/chat.ts`: server-side model allowlist/default updated to Llama 3.3 70B; removed the previous model-specific `reasoning_effort` argument, which is not part of this model's documented chat input.
- [x] `wrangler.jsonc`: `AI_MODEL_ID` updated to the same model ID. Existing `AI` binding, Pages project, and hosting remain unchanged.
- [x] Direct Cloudflare Workers AI API smoke test passed for the requested model; sample Roman Urdu prompt returned a valid Roman Urdu response.
- [ ] Run GitHub CI and verify the new Pages deployment build/deploy.
- [ ] Authenticated end-to-end AI chat test remains pending; no production user session was used in the direct model smoke test.
- [ ] The Llama 3.3 model does not expose the previous GPT-OSS `reasoning_effort` option. The existing Thinking Mode preference is retained as metadata/configuration only and does not change inference behavior with this model.
