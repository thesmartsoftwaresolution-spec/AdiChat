# AdiChat --- Google AI Studio Implementation Plan

**Version:** 1.0 \| **Date:** 20 November 2026\
**Execution mode:** One complete build pass from the six project
documents and approved Stitch ZIP; no user-facing phase-by-phase
prompts.

## 1. Mission

Build AdiChat as a complete React + TypeScript + Vite application by
using the approved Stitch ZIP as the exact UI source. Implement the
screens, navigation, responsive behavior, Supabase-ready data/services,
and Cloudflare Workers AI integration boundary described in the six
project documents.

Do not invent a new design. Do not stop after generating static mockups.
Build the actual app structure, functional screens, typed services,
validation, loading/error/empty states and security-aware route
handling.

## 2. Mandatory source hierarchy

When requirements appear to conflict, follow this order: 1. User's
explicit confirmations in the conversation: - Actual Stitch ZIP is the
approved UI baseline. - AI provider is Cloudflare Workers AI. - Super
Admin bootstrap is required for Adeel Bhatti. - No additional Prompt 1
requirements currently. 2. The actual screen HTML and matching
screenshot in the approved Stitch ZIP. 3. These six project documents,
which define behavior, routes, architecture and data contract. 4.
`00_Stitch_UI_Prompts.md` for original screen intent where the exported
design does not contradict it.

The pure-white/pure-black palette in the original prompt is superseded
by the actual ZIP. Do not apply it globally.

## 3. Build order (internal execution sequence)

### Step 1 --- Inspect and map Stitch source

-   Inventory all 140 HTML variants and screenshots.
-   Map every screen slug to its mobile/desktop and light/dark versions.
-   Inspect source HTML/CSS and identify repeated visual patterns.
-   Extract the real colors, typography, spacing, radii, shadows and
    component styles into a canonical token file.
-   Reconcile conflicting DESIGN.md token/prose values by checking
    actual screen source and screenshot.
-   Preserve the original image crops, proportions, iconography and
    visual hierarchy.

### Step 2 --- Create the Vite application foundation

-   Configure React + TypeScript + Vite and npm lockfile.
-   Add router, typed Supabase client, auth provider, theme provider and
    app-level error boundaries.
-   Create `tokens.css` and local styles from actual Stitch values.
-   Remove production dependence on Tailwind CDN; use local CSS/Tailwind
    build tooling if desired.
-   Replace inline HTML handlers with typed React callbacks.
-   Set up responsive layouts for public, authenticated chat and admin
    shells.

### Step 3 --- Extract reusable components

Implement visually faithful shared components: - Buttons, inputs, cards,
chips, tabs, dialogs, toasts, skeletons and empty/error states. -
User/assistant avatars, AI badge and presence indicators. - Message
bubbles, delivery ticks, typing indicator, composer, attachment picker
and voice recorder. - Mobile bottom navigation, desktop icon rail, chat
list, conversation pane, info panel. - Admin sidebar, top bar, stat
cards, filters, tables, bulk action bar and detail panels.

Reuse only where the source visuals are equivalent. Do not normalize
different screens into a new appearance.

### Step 4 --- Implement all 35 screens and routes

Use the exact route mapping in `03_App_Flow.md` and screen-to-route
table in `04_UI_UX_Design_Brief.md`. - Public auth and developer
intro. - Chats, direct messaging, contact info, attachments, media
viewer and search. - Group creation, conversation, info and member
management. - AI assistant hub, create/profile/chat and group
assignment. - Profile/settings. - All nine Admin screens.

Each page must have realistic loading, empty, success, validation and
error states where relevant. Use local fixtures only as temporary
development data; keep fixtures clearly separated and remove them from
production flows.

### Step 5 --- Implement Supabase-ready data layer

-   Create typed services matching the exact table/column names in
    `05_Backend_Schema.md`.
-   Implement auth, profiles, user settings, conversations, memberships,
    messages, receipts, attachments, groups, assistants, reports,
    announcements and admin services.
-   Subscribe to Realtime only for authorized conversations.
-   Implement pagination and reconnect handling.
-   Keep user role/status checks explicit.
-   Never treat UI route guards as a replacement for RLS.

The Supabase project/database is created later through the owner's
ChatGPT + Supabase workflow. During AI Studio build, create the frontend
integration and SQL/schema artifacts if requested, but do not claim that
a live database has been provisioned.

### Step 6 --- Implement Cloudflare Workers AI integration boundary

-   Build an application-owned Worker/Pages Function endpoint for AI
    requests.
-   Validate the Supabase user session and conversation/assistant
    authorization.
-   Load assistant instructions server-side and apply input/output/usage
    limits.
-   Invoke Workers AI via the Cloudflare `env.AI` binding.
-   Keep exact model ID configurable and marked pending until the owner
    selects/validates one.
-   Stream responses only if the chosen model/runtime supports the
    required streaming path; otherwise return a compatible response
    without breaking UI.
-   Persist messages and usage safely.
-   Never expose Worker secrets, Supabase service-role keys or
    privileged credentials in frontend code.
-   Do not substitute OpenAI or Gemini.

### Step 7 --- Implement admin and bootstrap-safe behavior

-   Protect every `/admin/*` route and admin service call.
-   Create user status, group, assistant, report, developer profile, app
    settings, announcement and audit-log interfaces.
-   Admin mutations must use trusted operations and create audit logs.
-   Provide a one-time bootstrap implementation/instructions for the
    existing Adeel Bhatti Auth user. Do not build public signup role
    selection.
-   Ensure bootstrap is disabled after successful use.

### Step 8 --- QA and visual matching

-   Compare each implemented route with the corresponding Stitch
    screenshot at mobile and desktop sizes in both themes.
-   Verify no unintended palette drift, spacing changes, missing screen
    or wrong responsive layout.
-   Test auth, direct chat, groups, assistant chat, media upload/access,
    search and admin permissions.
-   Test RLS assumptions in Supabase once connected.
-   Test Worker AI authorization, model unavailable, quota exceeded,
    timeout and malformed input.
-   Test route refresh and direct URL entry.

## 4. Required screen checklist

Implement all 35 Stitch screens: 1. Welcome / Landing 2. Sign Up 3.
Login 4. Forgot Password 5. Reset Password 6. Chats List (Home) 7. Chat
Conversation (1-to-1) 8. New Chat / Find Users 9. Attachment Picker &
Voice Note 10. Contact Info 11. New Group - Select Members 12. New
Group - Group Details 13. Group Chat Conversation 14. Group Info &
Members 15. Add Members to Group 16. AI Assistants Hub 17. Create AI
Assistant 18. AI Assistant Profile & Settings 19. AI Chat Conversation
20. Add Assistant to Group 21. My Profile 22. Settings 23. Media Viewer
24. Shared Media & Files 25. Global Search 26. Developer Intro 27.
Admin - Dashboard 28. Admin - Users 29. Admin - User Detail 30. Admin -
Groups 31. Admin - AI Assistants 32. Admin - Reports & Moderation 33.
Admin - Developer Profile 34. Admin - App Settings 35. Admin -
Announcements & Logs

Each screen has mobile/desktop and light/dark coverage as supplied.
Attachment Picker & Voice Note may be implemented as an overlay in chat.

## 5. Code and integration contracts

-   Use exact table and column names from `05_Backend_Schema.md`.
-   Keep routes consistent with `03_App_Flow.md`.
-   Keep design tokens and component appearance consistent with
    `04_UI_UX_Design_Brief.md`.
-   Keep AI provider Cloudflare Workers AI.
-   The exact Workers AI model ID is a pending owner choice; do not
    hardcode an unverified model.
-   Use environment variables for Supabase public client config; keep
    secrets server-side.
-   Do not add Vercel configuration or deployment instructions.
-   Do not commit `.env` files, service-role keys, Worker secrets or
    bootstrap secrets.

## 6. Required repository/build configuration

-   `package.json` includes `build` script: `vite build`.

-   `npm run build` succeeds.

-   Vite output directory is `dist`.

-   Commit `package-lock.json`.

-   Remove `bun.lock` and `bun.lockb`.

-   Root `.npmrc` contains:

    ``` ini
    legacy-peer-deps=true
    ```

-   Add `public/_redirects`:

    ``` text
    /* /index.html 200
    ```

    or equivalent Cloudflare SPA fallback.

-   Pin a Cloudflare-compatible Node version.

-   Document every required Vite variable and Worker binding/secret.

-   GitHub workflow uses `main` as the deployment branch.

## 7. Pass 1 acceptance checklist

Pass 1 is complete only when: - The project boots and builds as a
React + TypeScript app. - All 35 routes/screens exist. - All 140 Stitch
variants have been inspected and their visual patterns are represented
in responsive implementation. - Navigation is wired, including
back/overlay flows. - Auth and core Supabase services are integrated or
clearly typed and ready for the later Supabase project connection. - AI
requests use the Cloudflare Workers AI server-side boundary, not direct
browser inference. - Admin routes and operations are permission-aware. -
No secrets are exposed. - Loading, empty, error and confirmation states
exist. - A first QA report lists complete, incomplete and blocked items.

## 8. Pass 2 acceptance checklist

When the owner supplies the same six files and same approved UI ZIP
again, compare the generated application against the requirements and
archive. Complete missing or incorrect work without destructive
rewrites: - Re-check every screen and route. - Compare layout,
typography, colors, spacing, component sizes and responsive behavior
against the Stitch ZIP. - Fix any design drift by restoring the ZIP's
source behavior. - Verify schema/table/column names against the backend
schema. - Verify auth and role checks, RLS assumptions, storage access
and Workers AI boundary. - Verify build configuration, npm lockfile,
`.npmrc`, SPA fallback and Cloudflare deployment settings. - Preserve
existing correct work and avoid deleting/renaming files without need. -
Produce a final change report and test report.

## 9. Final deliverables expected from AI Studio

1.  Complete React + TypeScript + Vite source.
2.  Reusable component and page architecture.
3.  All 35 screen routes implemented.
4.  Actual Stitch visual design faithfully ported.
5.  Supabase client/services and schema-compatible types.
6.  Cloudflare Worker/Pages Function integration boundary for Workers
    AI.
7.  Auth, loading, empty, error and validation states.
8.  Admin console with guarded operations.
9.  `.npmrc`, `package-lock.json`, `public/_redirects`, and build
    scripts.
10. `.env.example` containing placeholders only (no secrets).
11. Setup/readme documentation.
12. Change report, test report, unresolved decisions and deployment
    variable list.

## 10. Known pending decisions / blockers

-   Exact Cloudflare Workers AI model ID and model capabilities.
-   Production file-size/type and voice-duration limits.
-   AI quotas and maximum assistant count.
-   Production CORS origin/domain.
-   Final Supabase project URL/public key, supplied only after the
    Supabase project exists.
-   Final Cloudflare Worker bindings and secrets.
-   Any source-vs-requirement mismatch discovered during functional
    implementation must be reported rather than silently resolved.
