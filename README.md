# AdiChat

Modern real-time messaging and personal AI assistant workspace built with React, TypeScript, Vite, Tailwind CSS, Express, Supabase-ready data contracts, and Cloudflare Workers AI integration boundaries.

## Key Capabilities

- **35 Complete Screens & Routes**: Public onboarding/auth, 1-to-1 chats, voice notes & attachments overlay, contact info, shared media & viewer, global search, multi-member groups with inline `@Assistant` mentions, custom AI Assistants Hub, Light/Dark/System themes, Developer Intro, and a 9-screen RBAC-protected Admin Console.
- **Thinking Mode (Server-Side Gemini 4 Hydrogen)**: Complex reasoning queries inside AI Assistants use `gemini-4-hydrogen` with `ThinkingLevel.HIGH` via `/api/ai/chat` (`server.ts`), keeping API credentials strictly server-side.
- **Supabase-Ready Schema & RLS**: Canonical PostgreSQL schema, storage buckets, RLS policies, and one-time Super Admin bootstrap steps for Adeel Bhatti live in `supabase/schema.sql` and `supabase/bootstrap_super_admin.md`.
- **Cloudflare Workers AI Boundary**: `workers/ai-worker.ts` provides the `env.AI` Worker handler with Supabase JWT validation and configurable `AI_MODEL_ID` (pending owner selection).

## Environment Variables

Copy `.env.example` to `.env` for local development. Never commit `.env` files or service-role secrets.

| Variable | Scope | Description |
| --- | --- | --- |
| `GEMINI_API_KEY` | Server-only | Required for `/api/ai/chat` (`gemini-4-hydrogen` Thinking Mode) |
| `VITE_SUPABASE_URL` | Client (public) | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Client (public) | Supabase anon key |
| `SUPABASE_URL` | Worker / Server | Supabase project URL for token verification |
| `SUPABASE_SERVICE_ROLE_KEY` | Worker / Server | Server-side privileged key (never expose to client) |
| `AI_MODEL_ID` | Worker / Server | Pending owner selection for Cloudflare Workers AI |

## Scripts

- `npm run dev` — Starts Express + Vite middleware server on port 3000
- `npm run build` — Production Vite bundle into `dist/`
- `npm start` — Serves production `dist/` and `/api/*` via Node
- `npm run lint` — TypeScript typecheck (`tsc --noEmit`)
- `npm test` — Runs `node:test` unit tests (`src/utils/core.test.ts`)
