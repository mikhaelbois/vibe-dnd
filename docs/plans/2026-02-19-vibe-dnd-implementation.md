# vibe-dnd Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a D&D 5e character reference app where users create characters by selecting race, class, subclass, and background, then browse full descriptions on a single split-panel page.

**Architecture:** Next.js 16.1 App Router scaffolded into the existing repo. Supabase handles auth (email/password) and a PostgreSQL `characters` table with RLS. Game data (races, classes, spells, etc.) is fetched from the Open5e API at runtime using Next.js `use cache`. The character builder is a single page: options panel on the left, tabbed description panel on the right.

**Tech Stack:** Next.js 16.1, TypeScript, Tailwind CSS, shadcn/ui, Supabase (`@supabase/ssr`), Open5e API, Vitest

---

### Task 1: Scaffold the Next.js project

**Files:**
- Modify: project root (via CLI — preserves existing `.git/` and `docs/`)

**Step 1: Initialize Next.js 16 in the existing directory**

```bash
cd /Users/mikhaelbois/www/vibe-dnd
npx create-next-app@16 . --typescript --tailwind --app --no-src-dir --import-alias "@/*"
```

When prompted about the non-empty directory, confirm yes. If it asks about the `docs/` folder, confirm to keep existing files.

Expected output ends with: `Success! Created vibe-dnd`

**Step 2: Install additional dependencies**

```bash
npm install @supabase/ssr @supabase/supabase-js
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @types/testing-library__jest-dom
```

**Step 3: Initialize shadcn/ui**

```bash
npx shadcn@latest init
```

When prompted: style → Default, base color → Slate, CSS variables → yes.

**Step 4: Add required shadcn/ui components**

```bash
npx shadcn@latest add button input label select tabs skeleton card sonner
```

**Step 5: Set up Vitest**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

Create `vitest.setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

Add to `package.json` scripts:

```json
"test": "vitest",
"test:run": "vitest run"
```

**Step 6: Verify the dev server starts**

```bash
npm run dev
```

Expected: server running at http://localhost:3000. Stop with Ctrl+C.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 16 project with Supabase and shadcn/ui"
```

---

### Task 2: Supabase project setup (manual steps)

**Files:** None (external setup)

**Step 1: Create a Supabase project**

Go to https://supabase.com, sign in, and create a new project. Wait for it to provision (~2 minutes).

**Step 2: Create the characters table**

In the Supabase dashboard, open the SQL Editor and run:

```sql
create table characters (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  name        text not null,
  race        text,
  class       text,
  subclass    text,
  background  text,
  level       integer default 1,
  created_at  timestamptz default now()
);

-- Enable RLS
alter table characters enable row level security;

-- Users can only see and modify their own characters
create policy "Users manage own characters"
  on characters
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

**Step 3: Get your API keys**

In Supabase dashboard: Settings → API. Copy:
- Project URL (looks like `https://xxxx.supabase.co`)
- `anon` public key

**Step 4: Create `.env.local`**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Add `.env.local` to `.gitignore` if not already there.

---

### Task 3: Supabase client utilities

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`

**Step 1: Create the browser client**

`lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Step 2: Create the server client**

`lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
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
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server component — cookie writes handled by middleware
          }
        },
      },
    }
  )
}
```

**Step 3: Commit**

```bash
git add lib/
git commit -m "feat: add Supabase client utilities"
```

---

### Task 4: Route protection with proxy.ts

**Files:**
- Create: `proxy.ts` (Next.js 16 replaces `middleware.ts`)

**Step 1: Read the Next.js 16 proxy.ts docs**

Before writing this file, check: https://nextjs.org/docs/app/guides/upgrading/version-16
and the Supabase Next.js guide for the current recommended session refresh pattern.

**Step 2: Create proxy.ts**

The pattern below follows the Supabase SSR session refresh approach. Adapt the exact `proxy` export syntax to match the Next.js 16 docs.

`proxy.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protect /characters routes
  if (!user && request.nextUrl.pathname.startsWith('/characters')) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth pages
  if (user && request.nextUrl.pathname.startsWith('/auth')) {
    const url = request.nextUrl.clone()
    url.pathname = '/characters'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/characters/:path*', '/auth/:path*'],
}
```

> **Note:** Next.js 16 changed `middleware.ts` to `proxy.ts`. If the above export name or config format differs from what the docs show, update accordingly.

**Step 3: Verify the app still starts**

```bash
npm run dev
```

No errors expected. Stop with Ctrl+C.

**Step 4: Commit**

```bash
git add proxy.ts
git commit -m "feat: add route protection with proxy.ts"
```

---

### Task 5: Open5e API client

**Files:**
- Create: `lib/open5e.ts`
- Create: `lib/open5e.test.ts`

**Step 1: Write failing tests first**

`lib/open5e.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getRaces, getClasses, getSubclassesByClass, getBackgrounds, getSpellsByClass } from './open5e'

const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockClear()
})

describe('getRaces', () => {
  it('returns a list of races with slug and name', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          { slug: 'elf', name: 'Elf', desc: 'An elf.' },
          { slug: 'human', name: 'Human', desc: 'A human.' },
        ],
      }),
    })

    const races = await getRaces()
    expect(races).toHaveLength(2)
    expect(races[0]).toMatchObject({ slug: 'elf', name: 'Elf' })
  })

  it('throws when the API returns a non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    await expect(getRaces()).rejects.toThrow('Open5e error: 500')
  })
})

describe('getSubclassesByClass', () => {
  it('filters subclasses by class slug', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          { slug: 'school-of-evocation', name: 'School of Evocation', desc: '...', class: { slug: 'wizard' } },
          { slug: 'school-of-illusion', name: 'School of Illusion', desc: '...', class: { slug: 'wizard' } },
        ],
      }),
    })

    const subclasses = await getSubclassesByClass('wizard')
    expect(subclasses).toHaveLength(2)
    expect(subclasses[0].slug).toBe('school-of-evocation')
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npm run test:run lib/open5e.test.ts
```

Expected: FAIL — `Cannot find module './open5e'`

**Step 3: Implement the Open5e client**

`lib/open5e.ts`:

```typescript
const BASE_URL = 'https://api.open5e.com/v1'

async function open5eFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    next: { revalidate: 86400 }, // cache for 24 hours
  })
  if (!res.ok) throw new Error(`Open5e error: ${res.status}`)
  return res.json()
}

interface Open5eList<T> {
  results: T[]
}

export interface Race {
  slug: string
  name: string
  desc: string
  asi_desc?: string
  age?: string
  size?: string
  speed?: Record<string, number>
  languages?: string
  vision?: string
  traits?: string
}

export interface Class {
  slug: string
  name: string
  desc: string
  hit_die: number
  prof_armor?: string
  prof_weapons?: string
  prof_tools?: string
  prof_saving_throws?: string
  prof_skills?: string
  spellcasting_ability?: string
}

export interface Subclass {
  slug: string
  name: string
  desc: string
  class: { slug: string; name: string }
}

export interface Background {
  slug: string
  name: string
  desc: string
  skill_proficiencies?: string
  tool_proficiencies?: string
  languages?: string
  equipment?: string
  feature?: string
  feature_desc?: string
}

export interface Spell {
  slug: string
  name: string
  desc: string
  higher_level?: string
  range: string
  components: string
  material?: string
  ritual: boolean
  duration: string
  concentration: boolean
  casting_time: string
  level: string
  level_int: number
  school: string
  dnd_class: string
}

export async function getRaces(): Promise<Race[]> {
  const data = await open5eFetch<Open5eList<Race>>('/races/?limit=100')
  return data.results
}

export async function getRace(slug: string): Promise<Race> {
  return open5eFetch<Race>(`/races/${slug}/`)
}

export async function getClasses(): Promise<Class[]> {
  const data = await open5eFetch<Open5eList<Class>>('/classes/?limit=100')
  return data.results
}

export async function getClass(slug: string): Promise<Class> {
  return open5eFetch<Class>(`/classes/${slug}/`)
}

export async function getSubclassesByClass(classSlug: string): Promise<Subclass[]> {
  const data = await open5eFetch<Open5eList<Subclass>>(
    `/subclasses/?limit=100&class=${classSlug}`
  )
  return data.results
}

export async function getSubclass(slug: string): Promise<Subclass> {
  return open5eFetch<Subclass>(`/subclasses/${slug}/`)
}

export async function getBackgrounds(): Promise<Background[]> {
  const data = await open5eFetch<Open5eList<Background>>('/backgrounds/?limit=100')
  return data.results
}

export async function getBackground(slug: string): Promise<Background> {
  return open5eFetch<Background>(`/backgrounds/${slug}/`)
}

export async function getSpellsByClass(classSlug: string, levelInt?: number): Promise<Spell[]> {
  const levelFilter = levelInt !== undefined ? `&level_int=${levelInt}` : ''
  const data = await open5eFetch<Open5eList<Spell>>(
    `/spells/?limit=200&dnd_class=${classSlug}${levelFilter}`
  )
  return data.results
}
```

**Step 4: Run tests to verify they pass**

```bash
npm run test:run lib/open5e.test.ts
```

Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add lib/open5e.ts lib/open5e.test.ts
git commit -m "feat: add Open5e API client with tests"
```

---

### Task 6: Shared type definitions

**Files:**
- Create: `lib/types.ts`

**Step 1: Write the Character type**

`lib/types.ts`:

```typescript
export interface Character {
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

// Shape used in the builder form (no id/user_id)
export interface CharacterDraft {
  name: string
  race: string
  class: string
  subclass: string
  background: string
  level: number
}
```

**Step 2: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add shared type definitions"
```

---

### Task 7: Auth pages

**Files:**
- Create: `app/(auth)/layout.tsx`
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/signup/page.tsx`
- Create: `app/(auth)/actions.ts`

**Step 1: Create auth layout**

`app/(auth)/layout.tsx`:

```typescript
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-sm">
        {children}
      </div>
    </div>
  )
}
```

**Step 2: Create server actions for auth**

`app/(auth)/actions.ts`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })
  if (error) return { error: error.message }
  redirect('/characters')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })
  if (error) return { error: error.message }
  redirect('/characters')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}
```

**Step 3: Create login page**

`app/(auth)/login/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { login } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await login(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-100 text-2xl">Sign in</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-300">Email</Label>
            <Input id="email" name="email" type="email" required className="bg-slate-800 border-slate-700 text-slate-100" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-300">Password</Label>
            <Input id="password" name="password" type="password" required className="bg-slate-800 border-slate-700 text-slate-100" />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-400">
          No account?{' '}
          <Link href="/auth/signup" className="text-slate-200 underline">Sign up</Link>
        </p>
      </CardContent>
    </Card>
  )
}
```

**Step 4: Create signup page**

`app/(auth)/signup/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { signup } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await signup(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-100 text-2xl">Create account</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-300">Email</Label>
            <Input id="email" name="email" type="email" required className="bg-slate-800 border-slate-700 text-slate-100" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-300">Password</Label>
            <Input id="password" name="password" type="password" required minLength={6} className="bg-slate-800 border-slate-700 text-slate-100" />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-slate-200 underline">Sign in</Link>
        </p>
      </CardContent>
    </Card>
  )
}
```

**Step 5: Commit**

```bash
git add app/\(auth\)/
git commit -m "feat: add auth pages (login, signup, server actions)"
```

---

### Task 8: Landing page and root layout

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`

**Step 1: Update root layout**

`app/layout.tsx`:

```typescript
import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'vibe-dnd',
  description: 'D&D 5e character reference',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${geist.className} bg-slate-950 text-slate-100 min-h-screen`}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
```

**Step 2: Update landing page**

`app/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) redirect('/characters')

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-5xl font-bold text-slate-100">vibe-dnd</h1>
      <p className="text-slate-400 text-lg">Your D&D 5e character reference</p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/auth/login">Sign in</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/auth/signup">Create account</Link>
        </Button>
      </div>
    </main>
  )
}
```

**Step 3: Verify pages render**

```bash
npm run dev
```

Visit http://localhost:3000 — landing page should show. Visit http://localhost:3000/auth/login — login form should show.

**Step 4: Commit**

```bash
git add app/layout.tsx app/page.tsx app/globals.css
git commit -m "feat: add landing page and root layout"
```

---

### Task 9: Characters list page

**Files:**
- Create: `app/characters/layout.tsx`
- Create: `app/characters/page.tsx`
- Create: `app/characters/actions.ts`

**Step 1: Create characters layout (nav bar)**

`app/characters/layout.tsx`:

```typescript
import { logout } from '@/app/(auth)/actions'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function CharactersLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b border-slate-800 px-6 py-3 flex items-center justify-between">
        <Link href="/characters" className="font-semibold text-slate-100">vibe-dnd</Link>
        <form action={logout}>
          <Button variant="ghost" size="sm" type="submit" className="text-slate-400">
            Sign out
          </Button>
        </form>
      </nav>
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  )
}
```

**Step 2: Create delete character action**

`app/characters/actions.ts`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deleteCharacter(id: string) {
  const supabase = await createClient()
  await supabase.from('characters').delete().eq('id', id)
  revalidatePath('/characters')
}
```

**Step 3: Create characters list page**

`app/characters/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { deleteCharacter } from './actions'
import Link from 'next/link'
import type { Character } from '@/lib/types'

export default async function CharactersPage() {
  const supabase = await createClient()
  const { data: characters } = await supabase
    .from('characters')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Your characters</h1>
        <Button asChild>
          <Link href="/characters/new">New character</Link>
        </Button>
      </div>

      {characters?.length === 0 && (
        <p className="text-slate-400 text-center py-12">
          No characters yet.{' '}
          <Link href="/characters/new" className="underline text-slate-200">Create one.</Link>
        </p>
      )}

      <div className="grid gap-3">
        {(characters as Character[])?.map((c) => (
          <Card key={c.id} className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-slate-100">
                  <Link href={`/characters/${c.id}`} className="hover:underline">
                    {c.name}
                  </Link>
                </CardTitle>
                <form action={deleteCharacter.bind(null, c.id)}>
                  <Button variant="ghost" size="sm" className="text-slate-500 hover:text-red-400" type="submit">
                    Delete
                  </Button>
                </form>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400 capitalize">
                Level {c.level} {c.class ?? '—'} · {c.race ?? '—'}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

**Step 4: Verify the page renders**

Sign up, then visit http://localhost:3000/characters. Should show empty state and "New character" button.

**Step 5: Commit**

```bash
git add app/characters/
git commit -m "feat: add characters list page with delete action"
```

---

### Task 10: Character builder — OptionsPanel component

**Files:**
- Create: `components/character/OptionsPanel.tsx`

This is a client component that manages all the character selections.

`components/character/OptionsPanel.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Race, Class, Subclass, Background } from '@/lib/open5e'
import type { CharacterDraft } from '@/lib/types'

interface OptionsPanelProps {
  races: Race[]
  classes: Class[]
  backgrounds: Background[]
  initialDraft?: Partial<CharacterDraft>
  onDraftChange: (draft: CharacterDraft) => void
  onSave: (draft: CharacterDraft) => Promise<void>
  saving?: boolean
}

const LEVELS = Array.from({ length: 20 }, (_, i) => i + 1)

export function OptionsPanel({
  races,
  classes,
  backgrounds,
  initialDraft,
  onDraftChange,
  onSave,
  saving,
}: OptionsPanelProps) {
  const [draft, setDraft] = useState<CharacterDraft>({
    name: initialDraft?.name ?? '',
    race: initialDraft?.race ?? '',
    class: initialDraft?.class ?? '',
    subclass: initialDraft?.subclass ?? '',
    background: initialDraft?.background ?? '',
    level: initialDraft?.level ?? 1,
  })
  const [subclasses, setSubclasses] = useState<Subclass[]>([])
  const [loadingSubclasses, setLoadingSubclasses] = useState(false)

  // Fetch subclasses when class changes
  useEffect(() => {
    if (!draft.class) {
      setSubclasses([])
      return
    }
    setLoadingSubclasses(true)
    fetch(`/api/subclasses?class=${draft.class}`)
      .then((r) => r.json())
      .then((data) => setSubclasses(data))
      .finally(() => setLoadingSubclasses(false))
  }, [draft.class])

  function update(field: keyof CharacterDraft, value: string | number) {
    const next = { ...draft, [field]: value }
    if (field === 'class') next.subclass = '' // reset subclass on class change
    setDraft(next)
    onDraftChange(next)
  }

  return (
    <div className="flex flex-col gap-5 p-6 border-r border-slate-800 min-w-[260px] max-w-[300px]">
      <h2 className="font-semibold text-slate-200">Character</h2>

      <div className="space-y-1.5">
        <Label className="text-slate-400 text-xs uppercase tracking-wide">Name</Label>
        <Input
          value={draft.name}
          onChange={(e) => update('name', e.target.value)}
          placeholder="Character name"
          className="bg-slate-800 border-slate-700"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-slate-400 text-xs uppercase tracking-wide">Race</Label>
        <Select value={draft.race} onValueChange={(v) => update('race', v)}>
          <SelectTrigger className="bg-slate-800 border-slate-700">
            <SelectValue placeholder="Select race" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {races.map((r) => (
              <SelectItem key={r.slug} value={r.slug}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-slate-400 text-xs uppercase tracking-wide">Class</Label>
        <Select value={draft.class} onValueChange={(v) => update('class', v)}>
          <SelectTrigger className="bg-slate-800 border-slate-700">
            <SelectValue placeholder="Select class" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {classes.map((c) => (
              <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-slate-400 text-xs uppercase tracking-wide">Subclass</Label>
        <Select
          value={draft.subclass}
          onValueChange={(v) => update('subclass', v)}
          disabled={!draft.class || loadingSubclasses}
        >
          <SelectTrigger className="bg-slate-800 border-slate-700">
            <SelectValue placeholder={loadingSubclasses ? 'Loading…' : 'Select subclass'} />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {subclasses.map((s) => (
              <SelectItem key={s.slug} value={s.slug}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-slate-400 text-xs uppercase tracking-wide">Background</Label>
        <Select value={draft.background} onValueChange={(v) => update('background', v)}>
          <SelectTrigger className="bg-slate-800 border-slate-700">
            <SelectValue placeholder="Select background" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {backgrounds.map((b) => (
              <SelectItem key={b.slug} value={b.slug}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-slate-400 text-xs uppercase tracking-wide">Level</Label>
        <Select
          value={String(draft.level)}
          onValueChange={(v) => update('level', parseInt(v))}
        >
          <SelectTrigger className="bg-slate-800 border-slate-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {LEVELS.map((l) => (
              <SelectItem key={l} value={String(l)}>Level {l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        className="mt-auto"
        disabled={!draft.name || saving}
        onClick={() => onSave(draft)}
      >
        {saving ? 'Saving…' : 'Save character'}
      </Button>
    </div>
  )
}
```

**Step 1: Commit**

```bash
git add components/character/OptionsPanel.tsx
git commit -m "feat: add OptionsPanel component"
```

---

### Task 11: Subclasses API route

The OptionsPanel fetches subclasses from `/api/subclasses?class=<slug>`. Create this route so subclass fetching works client-side.

**Files:**
- Create: `app/api/subclasses/route.ts`

`app/api/subclasses/route.ts`:

```typescript
import { getSubclassesByClass } from '@/lib/open5e'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const classSlug = searchParams.get('class')
  if (!classSlug) return NextResponse.json([])
  const subclasses = await getSubclassesByClass(classSlug)
  return NextResponse.json(subclasses)
}
```

**Step 1: Commit**

```bash
git add app/api/subclasses/route.ts
git commit -m "feat: add subclasses API route"
```

---

### Task 12: Character builder — DescriptionPanel component

**Files:**
- Create: `components/character/DescriptionPanel.tsx`

`components/character/DescriptionPanel.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import type { Race, Class, Subclass, Background, Spell } from '@/lib/open5e'
import type { CharacterDraft } from '@/lib/types'

interface DescriptionPanelProps {
  draft: CharacterDraft
}

function useOpen5eData<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!url) { setData(null); return }
    setLoading(true)
    setError(false)
    fetch(url)
      .then((r) => { if (!r.ok) throw new Error(); return r.json() })
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [url])

  return { data, loading, error }
}

function DescSection({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-1">{label}</h3>
      <p className="text-sm text-slate-400 whitespace-pre-line">{value}</p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-5 w-1/3 bg-slate-800" />
      <Skeleton className="h-4 w-full bg-slate-800" />
      <Skeleton className="h-4 w-5/6 bg-slate-800" />
      <Skeleton className="h-4 w-4/6 bg-slate-800" />
    </div>
  )
}

function ErrorState() {
  return <p className="text-sm text-slate-500 p-4">Could not load content.</p>
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-sm text-slate-500 p-4">{message}</p>
}

const API = 'https://api.open5e.com/v1'

export function DescriptionPanel({ draft }: DescriptionPanelProps) {
  const race = useOpen5eData<Race>(draft.race ? `${API}/races/${draft.race}/` : null)
  const cls = useOpen5eData<Class>(draft.class ? `${API}/classes/${draft.class}/` : null)
  const subclass = useOpen5eData<Subclass>(draft.subclass ? `${API}/subclasses/${draft.subclass}/` : null)
  const background = useOpen5eData<Background>(draft.background ? `${API}/backgrounds/${draft.background}/` : null)
  const spells = useOpen5eData<{ results: Spell[] }>(
    draft.class ? `${API}/spells/?limit=200&dnd_class=${draft.class}` : null
  )

  return (
    <div className="flex-1 overflow-auto">
      <Tabs defaultValue="race" className="h-full flex flex-col">
        <TabsList className="mx-4 mt-4 bg-slate-800">
          <TabsTrigger value="race">Race</TabsTrigger>
          <TabsTrigger value="class">Class</TabsTrigger>
          <TabsTrigger value="subclass">Subclass</TabsTrigger>
          <TabsTrigger value="background">Background</TabsTrigger>
          <TabsTrigger value="spells">Spells</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-auto p-4">
          <TabsContent value="race">
            {!draft.race && <EmptyState message="Select a race to see details." />}
            {race.loading && <LoadingSkeleton />}
            {race.error && <ErrorState />}
            {race.data && (
              <>
                <h2 className="text-lg font-bold mb-3">{race.data.name}</h2>
                <DescSection label="Description" value={race.data.desc} />
                <DescSection label="Age" value={race.data.age} />
                <DescSection label="Size" value={race.data.size} />
                <DescSection label="Languages" value={race.data.languages} />
                <DescSection label="Traits" value={race.data.traits} />
              </>
            )}
          </TabsContent>

          <TabsContent value="class">
            {!draft.class && <EmptyState message="Select a class to see details." />}
            {cls.loading && <LoadingSkeleton />}
            {cls.error && <ErrorState />}
            {cls.data && (
              <>
                <h2 className="text-lg font-bold mb-3">{cls.data.name}</h2>
                <DescSection label="Description" value={cls.data.desc} />
                <DescSection label="Hit Die" value={`d${cls.data.hit_die}`} />
                <DescSection label="Saving Throws" value={cls.data.prof_saving_throws} />
                <DescSection label="Armor Proficiencies" value={cls.data.prof_armor} />
                <DescSection label="Weapon Proficiencies" value={cls.data.prof_weapons} />
                <DescSection label="Spellcasting Ability" value={cls.data.spellcasting_ability} />
              </>
            )}
          </TabsContent>

          <TabsContent value="subclass">
            {!draft.subclass && <EmptyState message="Select a subclass to see details." />}
            {subclass.loading && <LoadingSkeleton />}
            {subclass.error && <ErrorState />}
            {subclass.data && (
              <>
                <h2 className="text-lg font-bold mb-3">{subclass.data.name}</h2>
                <DescSection label="Description" value={subclass.data.desc} />
              </>
            )}
          </TabsContent>

          <TabsContent value="background">
            {!draft.background && <EmptyState message="Select a background to see details." />}
            {background.loading && <LoadingSkeleton />}
            {background.error && <ErrorState />}
            {background.data && (
              <>
                <h2 className="text-lg font-bold mb-3">{background.data.name}</h2>
                <DescSection label="Description" value={background.data.desc} />
                <DescSection label="Skill Proficiencies" value={background.data.skill_proficiencies} />
                <DescSection label="Tool Proficiencies" value={background.data.tool_proficiencies} />
                <DescSection label="Equipment" value={background.data.equipment} />
                <DescSection label="Feature" value={background.data.feature} />
                <DescSection label="" value={background.data.feature_desc} />
              </>
            )}
          </TabsContent>

          <TabsContent value="spells">
            {!draft.class && <EmptyState message="Select a class to see spells." />}
            {spells.loading && <LoadingSkeleton />}
            {spells.error && <ErrorState />}
            {spells.data && (
              <div className="space-y-4">
                <p className="text-sm text-slate-400">{spells.data.results.length} spells</p>
                {spells.data.results.map((spell) => (
                  <div key={spell.slug} className="border-b border-slate-800 pb-3">
                    <div className="flex items-baseline justify-between mb-1">
                      <h3 className="font-semibold text-slate-200">{spell.name}</h3>
                      <span className="text-xs text-slate-500">
                        {spell.level === '0' ? 'Cantrip' : `Level ${spell.level_int}`} · {spell.school}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-1">
                      {spell.casting_time} · {spell.range} · {spell.duration}
                      {spell.concentration ? ' · Concentration' : ''}
                    </p>
                    <p className="text-sm text-slate-400 line-clamp-3">{spell.desc}</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
```

**Step 1: Commit**

```bash
git add components/character/DescriptionPanel.tsx
git commit -m "feat: add DescriptionPanel component with tabs"
```

---

### Task 13: New character page

**Files:**
- Create: `app/characters/new/page.tsx`
- Create: `app/characters/new/actions.ts`

**Step 1: Create save action**

`app/characters/new/actions.ts`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { CharacterDraft } from '@/lib/types'

export async function saveNewCharacter(draft: CharacterDraft) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('characters')
    .insert({
      user_id: user.id,
      name: draft.name,
      race: draft.race || null,
      class: draft.class || null,
      subclass: draft.subclass || null,
      background: draft.background || null,
      level: draft.level,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  redirect(`/characters/${data.id}`)
}
```

**Step 2: Create new character page**

`app/characters/new/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { use } from 'react'
import { OptionsPanel } from '@/components/character/OptionsPanel'
import { DescriptionPanel } from '@/components/character/DescriptionPanel'
import { saveNewCharacter } from './actions'
import { toast } from 'sonner'
import type { CharacterDraft } from '@/lib/types'
import type { Race, Class, Background } from '@/lib/open5e'

// Data is fetched server-side and passed as props via a parent Server Component
// See Step 3 below — we use a pattern of a thin client wrapper around server-fetched data.

interface NewCharacterClientProps {
  races: Race[]
  classes: Class[]
  backgrounds: Background[]
}

export function NewCharacterClient({ races, classes, backgrounds }: NewCharacterClientProps) {
  const [draft, setDraft] = useState<CharacterDraft>({
    name: '', race: '', class: '', subclass: '', background: '', level: 1,
  })
  const [saving, setSaving] = useState(false)

  async function handleSave(d: CharacterDraft) {
    setSaving(true)
    const result = await saveNewCharacter(d)
    if (result?.error) {
      toast.error(result.error)
      setSaving(false)
    }
    // On success, server action redirects — no need to setSaving(false)
  }

  return (
    <div className="flex h-[calc(100vh-57px)] overflow-hidden">
      <OptionsPanel
        races={races}
        classes={classes}
        backgrounds={backgrounds}
        onDraftChange={setDraft}
        onSave={handleSave}
        saving={saving}
      />
      <DescriptionPanel draft={draft} />
    </div>
  )
}
```

**Step 3: Create the Server Component page wrapper**

Replace the contents of `app/characters/new/page.tsx` with the full file combining server and client:

```typescript
import { getRaces, getClasses, getBackgrounds } from '@/lib/open5e'
import { NewCharacterClient } from './client'

export default async function NewCharacterPage() {
  const [races, classes, backgrounds] = await Promise.all([
    getRaces(),
    getClasses(),
    getBackgrounds(),
  ])

  return <NewCharacterClient races={races} classes={classes} backgrounds={backgrounds} />
}
```

And save the client component to `app/characters/new/client.tsx` (move the `NewCharacterClient` export there).

> **Note:** Keep the Server Component in `page.tsx` and the Client Component in `client.tsx` in the same directory. This is the standard Next.js App Router pattern for server-fetched, client-rendered pages.

**Step 4: Verify creating a character works**

```bash
npm run dev
```

Visit http://localhost:3000/characters/new. Select options, click Save — should redirect to `/characters/<id>`.

**Step 5: Commit**

```bash
git add app/characters/new/
git commit -m "feat: add new character page with save action"
```

---

### Task 14: Character view/edit page

**Files:**
- Create: `app/characters/[id]/page.tsx`
- Create: `app/characters/[id]/client.tsx`
- Create: `app/characters/[id]/actions.ts`

**Step 1: Create update action**

`app/characters/[id]/actions.ts`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { CharacterDraft } from '@/lib/types'

export async function updateCharacter(id: string, draft: CharacterDraft) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('characters')
    .update({
      name: draft.name,
      race: draft.race || null,
      class: draft.class || null,
      subclass: draft.subclass || null,
      background: draft.background || null,
      level: draft.level,
    })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/characters/${id}`)
  return { success: true }
}
```

**Step 2: Create the client component**

`app/characters/[id]/client.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { OptionsPanel } from '@/components/character/OptionsPanel'
import { DescriptionPanel } from '@/components/character/DescriptionPanel'
import { updateCharacter } from './actions'
import { toast } from 'sonner'
import type { CharacterDraft, Character } from '@/lib/types'
import type { Race, Class, Background } from '@/lib/open5e'

interface CharacterClientProps {
  character: Character
  races: Race[]
  classes: Class[]
  backgrounds: Background[]
}

export function CharacterClient({ character, races, classes, backgrounds }: CharacterClientProps) {
  const [draft, setDraft] = useState<CharacterDraft>({
    name: character.name,
    race: character.race ?? '',
    class: character.class ?? '',
    subclass: character.subclass ?? '',
    background: character.background ?? '',
    level: character.level,
  })
  const [saving, setSaving] = useState(false)

  async function handleSave(d: CharacterDraft) {
    setSaving(true)
    const result = await updateCharacter(character.id, d)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Character saved.')
    }
    setSaving(false)
  }

  return (
    <div className="flex h-[calc(100vh-57px)] overflow-hidden">
      <OptionsPanel
        races={races}
        classes={classes}
        backgrounds={backgrounds}
        initialDraft={draft}
        onDraftChange={setDraft}
        onSave={handleSave}
        saving={saving}
      />
      <DescriptionPanel draft={draft} />
    </div>
  )
}
```

**Step 3: Create the Server Component page**

`app/characters/[id]/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { getRaces, getClasses, getBackgrounds } from '@/lib/open5e'
import { notFound } from 'next/navigation'
import { CharacterClient } from './client'
import type { Character } from '@/lib/types'

export default async function CharacterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [supabase, races, classes, backgrounds] = await Promise.all([
    createClient(),
    getRaces(),
    getClasses(),
    getBackgrounds(),
  ])

  const { data: character } = await supabase
    .from('characters')
    .select('*')
    .eq('id', id)
    .single()

  if (!character) notFound()

  return (
    <CharacterClient
      character={character as Character}
      races={races}
      classes={classes}
      backgrounds={backgrounds}
    />
  )
}
```

**Step 4: Verify editing works**

Visit http://localhost:3000/characters, click a character, change a selection, click Save — toast should confirm save.

**Step 5: Run all tests one final time**

```bash
npm run test:run
```

Expected: all tests pass.

**Step 6: Commit**

```bash
git add app/characters/\[id\]/
git commit -m "feat: add character view and edit page"
```

---

### Done

The full app is now implemented:

- Auth: sign up, log in, log out
- Characters list with delete
- Single-page character builder: options panel + tabbed description panel
- New character creation and existing character editing
- Open5e data for races, classes, subclasses, backgrounds, spells

Run `npm run dev` and visit http://localhost:3000 to use it.
