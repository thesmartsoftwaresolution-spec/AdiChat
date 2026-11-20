# AdiChat Master Plan & Continuation Rules

> **Purpose:** This is the durable hand-off file for future ChatGPT sessions. Read this file and the six project specification documents before doing further work. Continue from the latest verified GitHub `main`, Supabase production database, and existing Cloudflare deployment. Do not rely on chat history as the source of truth.

**Last updated:** 2026-11-20  
**Last verified main commit before this plan update:** `3b7fba9f2acac36568ffd3010534d3a7a0e9bea5`  
**Last verified Cloudflare deployment:** `a94f0dce-ac89-4227-a20f-59fcfb5b6836` — build/deploy success; production alias unchanged.  
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
- Current AI model configured: `@cf/openai/gpt-oss-20b` via binding `AI`; configured model is a Cloudflare-hosted Workers AI model, not an OpenAI API integration.
- Never expose service-role credentials; server-side AI route uses user JWT and public publishable key with database permission checks.

## 4. Current production and implementation snapshot

### Cloudflare / AI

- [x] Existing Cloudflare Pages project `adichat` retained.
- [x] Production URL remains `https://adichat.pages.dev`.
- [x] Production AI binding `AI` configured.
- [x] Model ID `@cf/openai/gpt-oss-20b` configured.
- [x] Server-side `functions/api/ai/chat.ts` deployed; origin, JWT, active profile, assistant visibility, conversation membership, quota, and persistence checks implemented.
- [x] Wrangler Pages configuration committed.
- [x] Latest deployment previously verified successful at immutable URL `https://6c461022.adichat.pages.dev`, commit `828ad0c16a90c990856261180364741af62118d4`. **Re-check current deployment after later commits.**
- [ ] Authenticated AI chat end-to-end test with a verified user and real assistant.
- [ ] Re-check latest deployment build and production smoke test after auth fixes.

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
- [x] AI assistant conversation and quota/persistence RPCs are present.
- [x] Foreign-key indexes were added.
- [ ] Reconcile canonical `supabase/schema.sql` fully against all applied migrations.
- [ ] Review remaining Supabase Security Advisor findings (last known: 18 SECURITY DEFINER warnings).
- [ ] Review remaining Performance Advisor RLS initplan findings (last known: 24).
- [ ] Review `public.rls_auto_enable()` trigger function and `bootstrap_state` access controls.
- [ ] Verify all relevant RLS policies, storage policies, realtime publication tables, and functions against the approved schema.
- [ ] Test real authenticated flows and record evidence.

### Existing account and Super Admin bootstrap

**Intended first Super Admin:** Adeel Bhatti  
**Email:** `thesmartsoftwaresolution@gmail.com`  
**Auth user UUID:** present in Supabase Auth; retrieve afresh from Supabase when needed and do not hardcode into public docs.

- [x] Exact Auth account found.
- [x] Matching profile found: `Adeel Bhatti`; profile status is `active`.
- [x] Existing role is currently `user`.
- [x] `bootstrap_state` currently has no consumed row.
- [x] Root cause of current login failure identified: Auth user is not email-confirmed (`email_confirmed_at IS NULL`, `confirmed_at IS NULL`).
- [x] Login currently swallowed the useful Supabase auth error and displayed generic invalid credentials.
- [x] Login UI updated to explain unverified email and offer a resend-confirmation action.
- [x] Sign-up UI updated to show a confirmation-required state instead of navigating to protected chats when Supabase returns no session.
- [x] Bootstrap instructions corrected to use the intended email and explicitly forbid manually bypassing email verification.
- [x] Supabase Auth confirms `email_confirmed_at IS NOT NULL` (confirmed at `2026-11-20 15:32:56 UTC`).
- [x] One-time Super Admin bootstrap completed for this exact Auth user; role `super_admin` added, audit log written, and `bootstrap_state` consumed at `2026-11-20 15:36:01 UTC`.
- [x] Database verification confirms both `user` and `super_admin` roles; an authenticated-role SQL test can read this user's own role rows.
- [ ] Owner login end-to-end browser test after the profile privilege fix; never request or store the password.

**Security rule:** Do not manually set `auth.users.email_confirmed_at`, do not disable confirmation requirements, and do not grant `super_admin` while the email is unverified. The owner explicitly requested this account, but verification is the required proof of mailbox ownership.

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
- [x] Verified authenticated role can SELECT its own `user_roles`, including `super_admin`.
- [x] Under an authenticated-role test context for this exact user, database helpers return `is_admin() = true` and `is_super_admin() = true`.
- [x] Auth UI and database fixes are committed on `main`; Cloudflare builds for auth UI commits passed. The latest schema sync commit (`1408ef324dbdfa59c43c7fda46e733530ce83506`) completed build and deployment successfully.
- [x] Latest Cloudflare production deployment for commit `4c2967264dac30d4a7f2edb5a7afc9b3e07a4151` finished successfully; production alias/domain unchanged.
- [ ] Owner login/session/admin browser test (password is private and must never be requested).

## 5. Overall product completion checklist

Track each capability against PRD/TRD/App Flow/Backend Schema and Stitch references. Existing screen components alone do not prove backend functionality.

### Authentication and identity
- [ ] Sign-up, confirmation email, resend confirmation, login, logout, password recovery/reset.
- [ ] Session restore and expiration behavior.
- [ ] Profile hydration and active/suspended/banned enforcement.
- [ ] Role hydration and server/database-enforced admin permissions.
- [ ] Super Admin one-time bootstrap and admin route authorization.

### Direct messaging
- [ ] Hydrate direct conversations, memberships, messages, and receipts from Supabase on session restore (current provider hydration is not yet comprehensive).
- [ ] Create/find direct conversations safely.
- [ ] Persist and retrieve messages (current `sendMessage` path is still local-state only).
- [ ] Delivery/read receipts and unread counts.
- [ ] Realtime subscriptions limited to authorized conversations.
- [ ] Reactions, blocks, reports, search, shared media, and disappearing messages.

### Groups
- [ ] Hydrate group conversations, group metadata, memberships, and group-assistant mappings from Supabase.
- [ ] Create groups and persist metadata; audit existing `createGroup` branch and make it consistently DB-backed.
- [ ] Add/remove members with server-side authorization.
- [ ] Group owner/admin/member permissions.
- [ ] Only-admins-send enforcement in UI and database/backend.
- [ ] Group metadata editing, mute, mentions, reports, and audit events.
- [ ] Group AI assistant membership and response modes.

### Media and storage
- [ ] Validate upload type, size, and ownership.
- [ ] Private bucket access and signed URLs where appropriate.
- [ ] Image/file/voice uploads and downloads.
- [ ] Attachment metadata and cleanup lifecycle.
- [ ] Test storage policies and upsert permissions.

### AI assistants
- [x] Cloudflare Workers AI server-side integration deployed.
- [x] Assistant conversation and message RPC foundation.
- [ ] Persist create/update/delete assistant operations safely.
- [ ] Assistant visibility/ownership and prompt isolation.
- [ ] Fast/Thinking modes and response persistence.
- [ ] Quota enforcement, usage reporting, failure/timeout behavior.
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
