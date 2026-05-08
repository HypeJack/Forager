# JOURNAL.md — Forager Engineering Journal

> This journal tracks key architectural decisions, sprint progress, and learnings
> throughout the development of Forager.

---

## Entry 001: Project Scaffolding and Sprint 0 Initialization
**Date**: 2026-05-06  
**Author**: Engineering  
**Sprint**: 0

### What was done
- Scaffolded the monorepo structure: `apps/web`, `packages/agents`, `packages/db`, `packages/shared`, `supabase/`, `evals/`, `design-tokens/`.
- Initialized root configuration: `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `.npmrc`.
- Created `@forager/shared` with strict TypeScript types for tenants, grants, users, agent runs, and citations.
- Created `@forager/db` with typed Supabase client and tenant-isolated query functions.
- Created `@forager/agents` with Scout v1 agent (Zod-validated I/O, provenance-carrying outputs, stub LLM integration).
- Built `apps/web` with Vite + React 19, "Editorial / Trust" design system (Source Serif 4 + Inter), and landing page shell.
- Compiled `design-tokens/tokens.json` into CSS custom properties and a Tailwind preset.
- Wrote 5 SQL migrations: tenants, users, grants, agent_runs, RLS policies.
- Seeded "Sunrise Community Health" demo tenant with realistic FQHC data (3 users, 5 grants at various stages, 1 scored match with citations, 1 completed agent run).
- Set up Promptfoo eval framework with the `01-clear-match` test case.

### Key decisions
1. **Multi-tenant from day one**: Every table has `tenant_id` + RLS policies. No retrofitting.
2. **Source-only workspace packages**: `@forager/shared` and `@forager/db` export TypeScript source directly — no build step required during development.
3. **Provenance-first agent design**: `Citation` type is shared across the entire system. Agent outputs carry `sources` arrays.
4. **Dual token system**: CSS custom properties for runtime theming + Tailwind preset for utility classes. Both reference the same `tokens.json`.
5. **Scout v1 architecture**: Discover → Score pipeline with Zod validation on both ends. Stubs ready for LLM integration in Sprint 2.

### What's next (Sprint 1)
- [x] `pnpm install` and validate the workspace resolves correctly
- [ ] `supabase init` + apply migrations locally
- [ ] Connect Scout agent to LLM provider (OpenAI or Anthropic)
- [x] Build the grant pipeline dashboard UI
- [ ] Run first eval suite and establish baseline metrics

---

## Entry 002: Grant Pipeline Dashboard — Sprint 1
**Date**: 2026-05-07  
**Author**: Engineering  
**Sprint**: 1

### What was done
- Built the full Grant Pipeline Dashboard with 5 new components:
  - `Sidebar` — Collapsible sidebar with tenant context (Sunrise Community), nav, and user avatar
  - `DashboardHeader` — Sticky header with title, search/notification buttons, and "Run Scout" CTA
  - `PipelineView` — Kanban board with 6 pipeline columns (Discovered → Awarded), grant cards with match scores, urgency indicators, and deadline formatting
  - `GrantDetailPanel` — Slide-over panel with key details, Scout Analysis (score circle, rationale), and Evidence citations with source attribution
  - `AgentActivityFeed` — Timeline UI showing agent runs with status icons, token counts, duration, and confidence scores
- Created `data/demo.ts` mirroring `supabase/seed.sql` for local frontend development
- Replaced landing page with the full dashboard layout (sidebar + main content + detail panel)
- Complete CSS design system for all dashboard components
- Verified all views render correctly in the browser

### Key decisions
1. **Demo data pattern**: Frontend mirrors the seed SQL exactly — when Supabase is connected, `data/demo.ts` is swapped for live queries with no component changes needed.
2. **Slide-over pattern for detail view**: Grant detail opens as a right-panel overlay rather than a new route — keeps pipeline context visible and feels faster.
3. **Evidence-first UI**: The Scout Analysis section prominently displays cited evidence with source attribution, reinforcing the provenance-first architecture.
4. **Urgency indicators**: Grant cards get colored left borders and red deadline text when approaching expiry (≤7 days = urgent, ≤30 days = soon).

### What's next (Sprint 2)
- [ ] Connect `supabase init` and wire live data
- [ ] Connect Scout agent to LLM provider
- [ ] Add drag-and-drop to pipeline columns
- [ ] Build auth flow (login/signup with Supabase Auth)
- [ ] Run first eval suite

---

## Entry 003: Architectural Reset — Data Layer + Vault
**Date**: 2026-05-08  
**Author**: Engineering  
**Sprint**: 0 (reset) + 1

### Context
Previous sprint built UI components prematurely with mock data (`data/demo.ts`). This violates the strict architectural requirement of no hardcoded TypeScript arrays for database entities. Executed a full reset to establish the proper data foundation.

### Corrections applied
1. **Inngest → top-level**: Moved from `packages/agents/src/inngest/` to `inngest/` at monorepo root
2. **Soft deletes**: Added `deleted_at TIMESTAMPTZ` to `vault_documents` and `vault_chunks`
3. **Design tokens**: Created `packages/design-tokens/` with `build.mjs` → `tokens.css` + `tokens.tailwind.js`
4. **Auth**: Implemented Supabase magic link flow (login page, useAuth hook, auth utilities)

### What was done
- Preserved 5 UI components in `components/drafts/` for future reuse
- Deleted `data/demo.ts` (no mock data rule enforced)
- Created `packages/design-tokens/` with build script compiling `tokens.json` → CSS + Tailwind preset
- Reconfigured `apps/web/` with TanStack Router, shadcn/ui (wired to Forager tokens), and auth
- Created `inngest/` at monorepo root with vault document processing worker (parse → chunk → embed → store)
- Added 3 new SQL migrations: pgvector extension, org_profiles table, vault tables (with soft deletes + VECTOR(1536))
- Rewrote `seed.sql` with org profile + 5 vault documents + 11 representative chunks + 5 grants
- Built 3 new pages: LoginPage (magic link), OrgProfilePage (Supabase CRUD), VaultPage (upload + list + soft delete)
- Created AppShell with auth-gated sidebar navigation

### Architecture
```
TanStack Router → /login (public)
                → / (auth-gated → AppShell)
                     → OrgProfilePage (reads/writes org_profiles)
                     → VaultPage (reads/writes vault_documents, uploads to Supabase Storage)

Inngest → vault/document.uploaded → processVaultDocument
          Steps: fetch → download → parse → chunk → embed → store → update status
```

### What's next (Sprint 2)
- [ ] Wire OpenAI embeddings in Inngest worker
- [ ] Build similarity search function in Supabase
- [ ] Connect Scout agent to vault for RAG-powered matching
- [ ] Reintegrate pipeline dashboard (from drafts/) with live Supabase data

