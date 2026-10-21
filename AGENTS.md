# AGENTS.md — Nage Codebase Conventions

This file is the source of truth for AI agents and contributors working on this repo.
Read it fully before making any changes.

---

## Project overview

**Nage** is a browser-based design tool: infinite canvas, AI image generation via Gemini,
and cloud persistence via Supabase. Built with Next.js 16 (App Router) + TypeScript + Tailwind CSS 4.

---

## Folder structure

```
src/
├── app/                    Next.js App Router pages and API routes
│   ├── (auth)/             Auth pages (no sidebar layout)
│   ├── api/                Server-side API routes only
│   └── dashboard/
│       └── [projectId]/    Editor shell
├── components/
│   ├── ui/                 shadcn/ui primitives (auto-generated — do not edit)
│   ├── auth/               Auth forms
│   ├── dashboard/          Project grid and cards
│   └── editor/             Canvas + toolbar + panels
│       └── canvas/         <canvas> host and SVG overlay
├── lib/
│   ├── supabase/           client.ts, server.ts, admin.ts, queries.ts, types.ts
│   ├── ai/                 gemini.ts (server only), rateLimit.ts
│   ├── canvas/
│   │   ├── document/       types.ts, defaults.ts, selectors.ts
│   │   ├── commands/       Command interface, AddNode, DeleteNode, … history.ts
│   │   ├── renderer/       IRenderer interface + Canvas2DRenderer
│   │   └── tools/          SelectTool, RectTool, … (one file per tool)
│   └── hooks/              useEditor, useAutoSave, useShortcuts, useSignedUrl
└── __tests__/              Vitest tests
```

---

## Non-negotiable rules

1. **Strict TypeScript** — `strict: true` in `tsconfig.json`. Zero `any`.
   Use `unknown` + type guards or proper generics instead.

2. **No secrets in client code** — `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY`
   are server-only. They must never appear in files reachable by the browser.
   Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are public.

3. **All Supabase calls from client components use `src/lib/supabase/client.ts`.**
   Server components and route handlers use `src/lib/supabase/server.ts`.
   The service-role admin client (`admin.ts`) is used ONLY in route handlers.

4. **All canvas mutations go through the Command layer.**
   Never mutate `CanvasDocument` directly in a component. Always construct a `Command`
   and call `applyCommand(history, cmd)`. This ensures undo/redo and auto-save work.

5. **RLS is the security boundary.** Every table has RLS enabled.
   Never rely solely on application-layer checks. Schema lives in `supabase/migrations/`.

6. **60fps target.** The renderer only redraws dirty nodes. No `useState` inside the
   render loop. Use `requestAnimationFrame` for all animation.

7. **No global CSS overrides.** Use Tailwind utilities or the design tokens defined in
   `globals.css`. Never hard-code hex colors — use `text-text-primary`, `bg-bg-surface`,
   etc. (mapped from the Nage design tokens in `globals.css`).

8. **Test everything in `src/lib/canvas/`** — document model, commands, history, and
   rate-limit logic must have Vitest tests. `pnpm test` must pass before any PR.

9. **Keep `pnpm lint` and `pnpm build` green** at all times.

---

## Design system tokens

Defined in `src/app/globals.css` as CSS variables. Mapped to Tailwind via `@theme inline`.

| Tailwind class | CSS var | Value |
|---|---|---|
| `bg-bg-base` | `--nage-bg-base` | `#000000` |
| `bg-bg-surface` | `--nage-bg-surface` | `#0d0d0d` |
| `bg-bg-surface-2` | `--nage-bg-surface-2` | `#111111` |
| `bg-bg-surface-3` | `--nage-bg-surface-3` | `#1a1a1a` |
| `text-text-primary` | `--nage-text-primary` | `#ffffff` |
| `text-text-secondary` | `--nage-text-secondary` | `#a0a0a0` |
| `text-text-muted` | `--nage-text-muted` | `#888888` |
| `text-text-dim` | `--nage-text-dim` | `#555555` |
| `border-border` | `--nage-border` | `#222222` |
| `bg-accent` | `--nage-accent` | `#ffffff` |
| `text-accent-fg` | `--nage-accent-fg` | `#000000` |

Font: Inter 400/500/600. Logo only: `Gegola DEMO`.

---

## Adding a new canvas node type

1. Add the type to `src/lib/canvas/document/types.ts` (`CanvasNode` union).
2. Add a factory to `src/lib/canvas/document/defaults.ts`.
3. Add a render function to `src/lib/canvas/renderer/renderNode.ts`.
4. Add a Tool class to `src/lib/canvas/tools/`.
5. Register the tool in `useEditor.ts`.
6. Add tests.

---

## Adding a new Command

1. Create a class in `src/lib/canvas/commands/` implementing `Command`.
2. Both `execute` and `undo` must be pure — return a new `CanvasDocument`, never mutate.
3. Add tests for execute → undo → redo round-trip.

---

## API routes

All AI calls go through `/api/ai/generate/route.ts`. This file:
- Validates the session with the Supabase server client.
- Checks rate limits via the DB function.
- Calls Gemini via `src/lib/ai/gemini.ts`.
- Logs the result in `ai_generation_logs`.
- Never returns the service key or Gemini key in the response.

---

## Out of scope (do not implement yet)

- Comments, plugins, auto-layout, vector pen tool, version history
- Real-time collaboration (Yjs / Supabase Realtime) — reserved for phase 2
- Billing — reserved for phase 3

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
