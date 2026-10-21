# Nage

A browser-based design tool — infinite canvas, AI image generation via Gemini, cloud persistence via Supabase.

---

## Prerequisites

- Node.js 20+
- pnpm 12+
- A [Supabase](https://supabase.com) project
- A [Google AI Studio](https://aistudio.google.com) API key (Gemini)

---

## Local setup

```bash
git clone <repo>
cd nage
pnpm install
cp .env.example .env.local
# fill in your values (see below)
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment variables

Copy `.env.example` → `.env.local` and populate:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API (**server-only**) |
| `GEMINI_API_KEY` | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) (**server-only**) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` locally; your Vercel URL in production |

> **Security:** `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` must never have a `NEXT_PUBLIC_` prefix. They are used only inside Next.js API route handlers.

---

## Supabase setup

### 1. Create a project

Go to [app.supabase.com](https://app.supabase.com), create a new project, and note your **Project URL** and **API keys**.

### 2. Run migrations

Install the [Supabase CLI](https://supabase.com/docs/guides/cli) and link your project:

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

This runs all files in `supabase/migrations/` in order:

| File | Purpose |
|---|---|
| `0001_schema.sql` | Core tables (profiles, projects, documents, AI logs) + RLS |
| `0002_storage.sql` | Private storage buckets (project-assets, exports) |
| `0003_rate_limits.sql` | Per-user rate-limit table + DB functions |

### 3. Generate TypeScript types (after migrations)

```bash
supabase gen types typescript --project-id <your-project-ref> \
  > src/lib/supabase/types.ts
```

### 4. Enable Google OAuth

1. In Supabase Dashboard → **Authentication → Providers → Google**, toggle **Enable**.
2. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   - Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
3. Paste the **Client ID** and **Client Secret** into Supabase.

### 5. Add redirect URLs

In Supabase Dashboard → **Authentication → URL Configuration**:

- **Site URL:** `http://localhost:3000` (dev) or `https://yourdomain.vercel.app` (prod)
- **Redirect URLs** (add all of these):
  - `http://localhost:3000/api/auth/callback`
  - `https://yourdomain.vercel.app/api/auth/callback`

### 6. Enable email confirmation (recommended)

In Supabase Dashboard → **Authentication → Email** → enable **Confirm email**.

---

## Scripts

```bash
pnpm dev           # start dev server on :3000
pnpm build         # production build
pnpm start         # serve production build
pnpm lint          # ESLint (0 warnings)
pnpm test          # Vitest (unit tests)
pnpm test:watch    # Vitest watch mode
pnpm test:coverage # coverage report
pnpm type-check    # tsc --noEmit
```

---

## Deploying to Vercel

1. Push to GitHub and import the repo in [vercel.com](https://vercel.com).
2. Add all env vars from `.env.example` in the Vercel project settings.
3. Add the Vercel preview URL(s) to Supabase → **Redirect URLs**.
4. Deploy — Vercel auto-detects Next.js.

---

## Architecture overview

See [`AGENTS.md`](./AGENTS.md) for the full folder structure, conventions, and rules for AI agents.

Key modules:

```
src/lib/canvas/document/   Canvas data model + factory functions
src/lib/canvas/commands/   Command pattern (undo/redo)
src/lib/canvas/renderer/   IRenderer interface + Canvas2D implementation
src/lib/supabase/          Browser, server, and admin Supabase clients
src/lib/ai/                Gemini wrapper (server-only)
```

---

## Feature roadmap

| # | Feature | Status |
|---|---|---|
| 1 | Auth (email + Google) | ✅ Done |
| 2 | Dashboard (project CRUD) | 🔜 Next |
| 3 | Infinite canvas (pan/zoom) | — |
| 4 | Drawing tools | — |
| 5 | Editing (select, move, resize, rotate) | — |
| 6 | Properties panel | — |
| 7 | Layers panel | — |
| 8 | Undo/redo | — |
| 9 | Keyboard shortcuts | — |
| 10 | Auto-save | — |
| 11 | Image upload | — |
| 12 | AI image generation | — |
| 13 | Export (PNG/SVG) | — |
| 14 | Real-time collaboration (Yjs) | Later |
| 15 | Billing | Later |
