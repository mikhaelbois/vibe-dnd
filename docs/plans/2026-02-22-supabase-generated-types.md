# Supabase Generated Types Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the hand-written `Character` interface with types auto-generated from the live Supabase schema, eliminating all `any`-typed Supabase queries.

**Architecture:** Install the `supabase` npm package as a dev dependency, run `supabase gen types typescript --linked` to produce `lib/database.types.ts`, thread the `Database` generic through both Supabase clients, and derive `Character` from the generated type. The generated file is committed so CI never needs Supabase credentials.

**Tech Stack:** Supabase CLI (`supabase` npm package), `@supabase/ssr`, TypeScript

---

### Task 1: Install Supabase CLI and update package.json / .gitignore

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`

**Step 1: Install the Supabase CLI as a dev dependency**

```bash
yarn add -D supabase
```

Expected: resolves and links the `supabase` binary under `node_modules/.bin/supabase`.

**Step 2: Add `gen:types` script to `package.json`**

In the `"scripts"` block, add after `"check"`:

```json
"gen:types": "supabase gen types typescript --linked > lib/database.types.ts"
```

**Step 3: Add `.supabase/` to `.gitignore`**

In `.gitignore`, after the `# misc` block, add:

```
# supabase local CLI config
.supabase/
```

**Step 4: Verify**

```bash
yarn supabase --version
```

Expected: prints the Supabase CLI version (e.g. `2.x.x`).

**Step 5: Commit**

```bash
git add package.json yarn.lock .gitignore
git commit -m "chore: add supabase CLI dev dep and gen:types script"
```

---

### Task 2: Link to the remote Supabase project (manual one-time setup)

> **Note:** This task requires browser access and your Supabase project reference ID (visible in the dashboard URL: `supabase.com/dashboard/project/<ref>`). This step creates `.supabase/config.toml` locally — that file is gitignored and never committed.

**Step 1: Log in to Supabase**

```bash
yarn supabase login
```

Expected: opens a browser tab, you authenticate, CLI prints "Logged in as <email>".

**Step 2: Link the project**

```bash
yarn supabase link --project-ref <your-project-ref>
```

Expected: CLI prints "Finished supabase link." and creates `.supabase/config.toml`.

**Step 3: Verify the link**

```bash
yarn supabase status
```

Expected: prints project details without errors.

---

### Task 3: Generate `lib/database.types.ts`

**Files:**
- Create: `lib/database.types.ts`

**Step 1: Generate the types**

```bash
yarn gen:types
```

Expected: creates `lib/database.types.ts`. The file contains a `Database` type with a `public.Tables.characters` entry. Open the file and verify it contains `Row`, `Insert`, and `Update` shapes for the `characters` table, matching this schema:

```
Row: {
  id: string
  user_id: string
  name: string
  race: string | null
  class: string | null
  subclass: string | null
  background: string | null
  level: number
  created_at: string
}
```

**Step 2: Add a do-not-edit header**

Open `lib/database.types.ts` and prepend this comment (the CLI will not add it automatically):

```ts
// This file is auto-generated. Do not edit manually.
// Re-generate with: yarn gen:types
```

**Step 3: Commit**

```bash
git add lib/database.types.ts
git commit -m "chore: add Supabase generated database types"
```

---

### Task 4: Derive `Character` from the generated type in `lib/types.ts`

**Files:**
- Modify: `lib/types.ts`

There are no behavior changes here — only the source of truth for `Character` changes. `CharacterDraft` stays hand-written because it represents form state (all fields non-nullable strings), not the DB row shape.

**Step 1: Replace the hand-written `Character` interface**

Replace the entire contents of `lib/types.ts` with:

```ts
import type { Database } from './database.types'

// Character matches the DB row exactly — derived from the generated schema.
export type Character = Database['public']['Tables']['characters']['Row']

// CharacterDraft is form state (no id/user_id, all fields non-nullable strings).
export interface CharacterDraft {
  name: string
  race: string
  class: string
  subclass: string
  background: string
  level: number
}
```

**Step 2: Verify the type shape**

Run type-check — it should pass with no new errors:

```bash
yarn check
```

Expected: exits 0.

**Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "refactor: derive Character type from Supabase generated schema"
```

---

### Task 5: Thread the `Database` generic through Supabase clients

**Files:**
- Modify: `lib/supabase/server.ts`
- Modify: `lib/supabase/client.ts`

**Step 1: Update `lib/supabase/server.ts`**

Add the `Database` import and generic:

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '../database.types'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          }
          catch {
            // Server component — cookie writes handled by proxy
          }
        },
      },
    },
  )
}
```

**Step 2: Update `lib/supabase/client.ts`**

Add the `Database` import and generic:

```ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '../database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
```

**Step 3: Verify**

```bash
yarn check
```

Expected: exits 0. At this point Supabase queries on the `characters` table return typed results.

**Step 4: Commit**

```bash
git add lib/supabase/server.ts lib/supabase/client.ts
git commit -m "refactor: thread Database generic through Supabase clients"
```

---

### Task 6: Remove manual type assertions in `app/characters/[id]/page.tsx`

**Files:**
- Modify: `app/characters/[id]/page.tsx`

With the typed client, `.from('characters').select('*').single()` now returns `{ data: Character | null, error: ... }` automatically — the manual cast is no longer needed.

**Step 1: Remove the manual cast**

Replace:

```ts
  const { data: character } = (await supabase
    .from('characters')
    .select('*')
    .eq('id', id)
    .single()) as { data: Character | null, error: unknown }
```

With:

```ts
  const { data: character } = await supabase
    .from('characters')
    .select('*')
    .eq('id', id)
    .single()
```

**Step 2: Check `Character` import is still used**

The `Character` import at the top of the file (`import type { Character } from '@/lib/types'`) is no longer needed for the cast. Remove it if `character` is no longer explicitly typed as `Character` anywhere in the file. TypeScript will infer the type from the query.

**Step 3: Verify**

```bash
yarn check && yarn lint
```

Expected: both exit 0 with no `ts/no-unsafe-assignment` errors.

**Step 4: Commit**

```bash
git add app/characters/[id]/page.tsx
git commit -m "refactor: remove manual Supabase type assertion in character page"
```

---

### Task 7: Update CLAUDE.md and push

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Add `gen:types` to the Commands section in `CLAUDE.md`**

In the Commands block, add after `yarn check`:

```bash
yarn gen:types  # regenerate lib/database.types.ts from live Supabase schema
```

And add a setup note after the Commands section:

```markdown
### Supabase type generation

Run once to link the CLI to the remote project (requires your project ref from the Supabase dashboard):

\`\`\`bash
yarn supabase login
yarn supabase link --project-ref <ref>
\`\`\`

After any schema change, regenerate types with:

\`\`\`bash
yarn gen:types
\`\`\`
```

**Step 2: Final verification**

```bash
yarn check && yarn lint && yarn test:run
```

Expected: all pass.

**Step 3: Commit and push**

```bash
git add CLAUDE.md
git commit -m "docs: document supabase gen:types setup in CLAUDE.md"
git push
```
