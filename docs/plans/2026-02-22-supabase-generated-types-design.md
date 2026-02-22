# Supabase Generated Types — Design

**Date:** 2026-02-22

## Problem

The Supabase clients (`createServerClient`, `createBrowserClient`) are instantiated without a `Database` generic type. All queries return `any`, requiring manual type assertions like `as { data: Character | null }` and causing `ts/no-unsafe-assignment` lint errors. The hand-written `Character` interface in `lib/types.ts` can silently drift from the real schema.

## Approach

Use the Supabase CLI (`supabase` npm package) to generate `lib/database.types.ts` from the live schema via `supabase gen types typescript --linked`. The file is committed so CI never needs Supabase credentials.

## Design

### 1. Install Supabase CLI

Add as a dev dependency:

```bash
yarn add -D supabase
```

### 2. One-time local setup

Each developer runs once:

```bash
yarn supabase login           # browser-based OAuth
yarn supabase link --project-ref <ref>  # writes to .supabase/config.toml
```

`.supabase/` is gitignored — no credentials in the repo.

### 3. `gen:types` script

Add to `package.json`:

```json
"gen:types": "supabase gen types typescript --linked > lib/database.types.ts"
```

Re-run after any schema change. The generated file is committed.

### 4. `lib/database.types.ts`

Generated file with a do-not-edit header. Contains the full Supabase `Database` type matching the `characters` table schema.

### 5. `lib/types.ts`

Derive `Character` from the generated type instead of hand-writing it:

```ts
import type { Database } from './database.types'

export type Character = Database['public']['Tables']['characters']['Row']

// CharacterDraft is form state (not DB state) — kept as-is
export interface CharacterDraft {
  name: string
  race: string
  class: string
  subclass: string
  background: string
  level: number
}
```

### 6. Supabase clients

Thread the `Database` generic through both clients:

```ts
// lib/supabase/server.ts
import type { Database } from '../database.types'
createServerClient<Database>(url, key, { cookies })

// lib/supabase/client.ts
import type { Database } from '../database.types'
createBrowserClient<Database>(url, key)
```

### 7. `app/characters/[id]/page.tsx`

Remove the manual type assertion — the typed client handles it:

```ts
// Before
const { data: character } = (await supabase
  .from('characters').select('*').eq('id', id).single()) as { data: Character | null, error: unknown }

// After
const { data: character } = await supabase
  .from('characters').select('*').eq('id', id).single()
```

### 8. `.gitignore`

Add `.supabase/` to ignore the local CLI config.

### 9. `CLAUDE.md`

Document the `gen:types` script and one-time setup steps.

## Success Criteria

- `yarn check` passes with no `ts/no-unsafe-assignment` errors from Supabase queries
- `yarn lint` passes with no type assertion lint errors on Supabase queries
- `yarn gen:types` regenerates `lib/database.types.ts` from the live schema
- No manual `as Character` casts needed anywhere in the codebase
