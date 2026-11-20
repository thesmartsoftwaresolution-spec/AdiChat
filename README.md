# AdiChat

Modern real-time messaging and personal AI assistant workspace built with React, TypeScript, Vite, Tailwind CSS, Supabase, and Cloudflare Workers AI.

## Key Capabilities

- **35 Complete Screens & Routes**: Public onboarding/auth, 1-to-1 chats, voice notes & attachments overlay, contact info, shared media & viewer, global search, multi-member groups with inline `@Assistant` mentions, custom AI Assistants Hub, Light/Dark/System themes, Developer Intro, and a 9-screen RBAC-protected Admin Console.
- **AI Assistants**: AI assistant chat runs server-side through Cloudflare Workers AI using `@cf/meta/llama-3.3-70b-instruct-fp8-fast`; the model is never called directly from browser code.
- **Supabase-Ready Schema & RLS**: Canonical PostgreSQL schema, storage buckets, RLS policies, and one-time Super Admin bootstrap steps for Adeel Bhatti live in `supabase/schema.sql` and `supabase/bootstrap_super_admin.md`.
- **Secure AI API**: `functions/api/ai/chat.ts` validates the Supabase user session, assistant access, conversation membership, quota, and message persistence before returning AI responses.

## Environment Variables

Copy `.env.example` to `.env` for local development. Never commit `.env` files or service-role secrets.

| Variable | Scope | Description |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Client (public) | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Client (public) | Supabase anon key |
| `SUPABASE_URL` | Worker / Server | Supabase project URL for token verification |
| `SUPABASE_SERVICE_ROLE_KEY` | Worker / Server | Server-side privileged key (never expose to client) |
| `AI_MODEL_ID` | Cloudflare Pages Function | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` (configured in `wrangler.jsonc`) |

## Scripts

- `npm run dev` — Starts Express + Vite middleware server on port 3000
- `npm run build` — Production Vite bundle into `dist/`
- `npm start` — Serves production `dist/` and `/api/*` via Node
- `npm run lint` — TypeScript typecheck (`tsc --noEmit`)
- `npm test` — Runs `node:test` unit tests (`src/utils/core.test.ts`)
