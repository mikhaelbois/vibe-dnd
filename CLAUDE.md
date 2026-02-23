# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Node.js

Node 24 is required (pinned in `.nvmrc`). Use `yarn` directly — do not prepend `nvm use` or `source nvm` to commands. Yarn 4.12.0 is managed via corepack (no local binary in `.yarn/releases/`).

## Commands

```bash
yarn dev        # start dev server (Turbopack)
yarn build      # production build
yarn check      # TypeScript type-check (tsc --noEmit)
yarn lint       # ESLint
yarn test       # Vitest (watch mode)
yarn test:run   # Vitest (single run)
yarn gen:types  # regenerate lib/database.types.ts from live Supabase schema
```

Run a single test file:
```bash
yarn vitest run lib/open5e.test.ts
```

### Supabase type generation

`lib/database.types.ts` is auto-generated — do not edit it manually. Run once to link the CLI to the remote project (project ref is in the Supabase dashboard URL):

```bash
yarn supabase login
yarn supabase link --project-ref <ref>  # creates /supabase/ (gitignored)
```

After any schema change, regenerate with:

```bash
yarn gen:types
```

## Architecture

### Data flow: server → client split

Builder pages follow a strict two-file pattern:

- **`page.tsx`** — async server component; fetches Open5e data (with `next: { revalidate: 86400 }`), passes it as props to the client component
- **`client.tsx`** — `'use client'` component; owns all interactive state

Example: `app/characters/new/page.tsx` → `NewCharacterClient`.

### Subclasses are fetched client-side

Subclasses are **not** fetched at page render time. `components/character/OptionsPanel.tsx` fetches them on demand from `/api/subclasses?class=<slug>` (implemented in `app/api/subclasses/route.ts`) to avoid passing all subclasses server-side.

### Server actions

Mutations live in co-located `actions.ts` files (marked `'use server'`). They create a Supabase server client, validate the session, write to the DB, then call `redirect()` on success.

### Auth / middleware

`proxy.ts` (Next.js's `middleware.ts` equivalent) uses `supabase.auth.getClaims()` for local JWT validation (no network round-trip). It protects `/characters/*` and redirects authenticated users away from `/auth/*`.

Auth routes live at `app/auth/login/` and `app/auth/signup/` — the segment is `auth`, not `(auth)`.

### Supabase helpers

- `lib/supabase/server.ts` — server-side client (for server components and actions)
- `lib/supabase/client.ts` — browser-side client

### Open5e API wrapper (`lib/open5e.ts`)

Typed fetch helpers for the Open5e v2 REST API. All calls use Next.js fetch caching (`revalidate: 86400`). `getRaces()` filters out subspecies and `getClasses()` filters out subclasses in the wrapper (the API has no server-side filter for these).

### Types

`lib/database.types.ts` — auto-generated Supabase schema types (do not edit; regenerate with `yarn gen:types`).

`lib/types.ts` — `Character` is derived from the generated `Database` type; `CharacterDraft` is the builder form shape (all fields non-nullable strings, no `id`/`user_id`).

### UI components

`components/ui/` — shadcn/ui components (slate theme, Tailwind v4). `components/character/` — domain-specific panels (`OptionsPanel`, `DescriptionPanel`).

### ESLint

Type-aware rules (`no-floating-promises`, `no-misused-promises`, `await-thenable`, `consistent-type-imports`) are scoped to `**/*.ts`, `**/*.tsx`, `**/*.mts` only, so `eslint.config.mjs` itself is excluded from `tsconfig.json` parsing.
