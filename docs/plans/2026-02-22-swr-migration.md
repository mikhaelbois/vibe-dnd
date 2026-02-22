# SWR Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all manual `useEffect`+`fetch` data fetching in client components with `useSWR`, backed by a global `<SWRConfig>` provider with a shared JSON fetcher.

**Architecture:** A new `components/providers.tsx` (`'use client'`) wraps the app in `<SWRConfig>` with a shared fetcher. `DescriptionPanel`'s custom `useOpen5eData` hook is deleted and replaced with direct `useSWR` calls. `OptionsPanel`'s `useEffect`+fetch block is replaced with a single `useSWR` call.

**Tech Stack:** React 19, Next.js 16, SWR, Vitest, @testing-library/react, jsdom

---

### Task 1: Install swr

**Files:**
- Modify: `package.json` (via npm)

**Step 1: Install the package**

```bash
npm install swr
```

**Step 2: Verify it appears in package.json**

```bash
grep '"swr"' package.json
```

Expected: `"swr": "^2.x.x"` in `dependencies`.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add swr dependency"
```

---

### Task 2: Create `components/providers.tsx`

**Files:**
- Create: `components/providers.tsx`

**Step 1: Write the file**

```tsx
'use client'

import { SWRConfig } from 'swr'

function fetcher(url: string) {
  return fetch(url).then((r) => {
    if (!r.ok)
      throw new Error(`Fetch error: ${r.status}`)
    return r.json()
  })
}

export function Providers({ children }: { children: React.ReactNode }) {
  return <SWRConfig value={{ fetcher }}>{children}</SWRConfig>
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add components/providers.tsx
git commit -m "feat: add global SWRConfig provider"
```

---

### Task 3: Wire `<Providers>` into `app/layout.tsx`

**Files:**
- Modify: `app/layout.tsx`

**Step 1: Add the import and wrap children**

In `app/layout.tsx`, add the import:
```tsx
import { Providers } from '@/components/providers'
```

Then wrap `{children}` and `<Toaster />` together:
```tsx
<body className={`${geist.className} bg-slate-950 text-slate-100 min-h-screen`}>
  <Providers>
    {children}
    <Toaster />
  </Providers>
</body>
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: wrap app in SWRConfig provider"
```

---

### Task 4: Migrate `DescriptionPanel.tsx`

**Files:**
- Modify: `components/character/DescriptionPanel.tsx`
- Create: `components/character/DescriptionPanel.test.tsx`

**Step 1: Write the failing test**

Create `components/character/DescriptionPanel.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import useSWR from 'swr'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DescriptionPanel } from './DescriptionPanel'

vi.mock('swr', () => ({ default: vi.fn() }))

const mockUseSWR = vi.mocked(useSWR)

const emptyDraft = {
  name: '',
  race: '',
  class: '',
  subclass: '',
  background: '',
  level: 1,
}

beforeEach(() => {
  mockUseSWR.mockReturnValue({ data: undefined, isLoading: false, error: undefined } as ReturnType<typeof useSWR>)
})

describe('DescriptionPanel', () => {
  it('shows empty state when no race selected', () => {
    render(<DescriptionPanel draft={emptyDraft} />)
    expect(screen.getByText('Select a race to see details.')).toBeInTheDocument()
  })

  it('calls useSWR with species URL when race is selected', () => {
    render(<DescriptionPanel draft={{ ...emptyDraft, race: 'srd_elf' }} />)
    expect(mockUseSWR).toHaveBeenCalledWith('https://api.open5e.com/v2/species/srd_elf/')
  })

  it('calls useSWR with null when no race selected', () => {
    render(<DescriptionPanel draft={emptyDraft} />)
    expect(mockUseSWR).toHaveBeenCalledWith(null)
  })

  it('shows loading skeleton when race data is loading', () => {
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: true, error: undefined } as ReturnType<typeof useSWR>)
    render(<DescriptionPanel draft={{ ...emptyDraft, race: 'srd_elf' }} />)
    // Skeleton renders divs with animate-pulse; check the empty state is NOT shown
    expect(screen.queryByText('Select a race to see details.')).not.toBeInTheDocument()
  })
})
```

**Step 2: Run to confirm the test fails**

```bash
npx vitest run components/character/DescriptionPanel.test.tsx
```

Expected: FAIL — `useSWR` is never called (component currently uses `useOpen5eData`, not `useSWR`).

**Step 3: Implement the migration**

Replace the entire `components/character/DescriptionPanel.tsx` content:

```tsx
'use client'

import type { Background, Class, Race, Spell, Subclass } from '@/lib/open5e'
import type { CharacterDraft } from '@/lib/types'
import useSWR from 'swr'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface DescriptionPanelProps {
  draft: CharacterDraft
}

function DescSection({ label, value }: { label: string, value?: string }) {
  if (!value)
    return null
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

const API = 'https://api.open5e.com/v2'

export function DescriptionPanel({ draft }: DescriptionPanelProps) {
  const race = useSWR<Race>(draft.race ? `${API}/species/${draft.race}/` : null)
  const cls = useSWR<Class>(draft.class ? `${API}/classes/${draft.class}/` : null)
  const subclass = useSWR<Subclass>(draft.subclass ? `${API}/classes/${draft.subclass}/` : null)
  const background = useSWR<Background>(draft.background ? `${API}/backgrounds/${draft.background}/` : null)
  const spells = useSWR<{ results: Spell[] }>(
    draft.class ? `${API}/spells/?limit=200&classes__key=${draft.class}` : null
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
            {race.isLoading && <LoadingSkeleton />}
            {race.error && <ErrorState />}
            {race.data && (
              <>
                <h2 className="text-lg font-bold mb-3">{race.data.name}</h2>
                <DescSection label="Description" value={race.data.desc} />
                {race.data.traits?.map(t => (
                  <DescSection key={t.name} label={t.name} value={t.desc} />
                ))}
              </>
            )}
          </TabsContent>

          <TabsContent value="class">
            {!draft.class && <EmptyState message="Select a class to see details." />}
            {cls.isLoading && <LoadingSkeleton />}
            {cls.error && <ErrorState />}
            {cls.data && (
              <>
                <h2 className="text-lg font-bold mb-3">{cls.data.name}</h2>
                <DescSection label="Description" value={cls.data.desc} />
                <DescSection label="Hit Die" value={cls.data.hit_dice} />
                <DescSection
                  label="Saving Throws"
                  value={cls.data.saving_throws?.map(s => s.name).join(', ')}
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="subclass">
            {!draft.subclass && <EmptyState message="Select a subclass to see details." />}
            {subclass.isLoading && <LoadingSkeleton />}
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
            {background.isLoading && <LoadingSkeleton />}
            {background.error && <ErrorState />}
            {background.data && (
              <>
                <h2 className="text-lg font-bold mb-3">{background.data.name}</h2>
                <DescSection label="Description" value={background.data.desc} />
                {background.data.benefits?.map(b => (
                  <DescSection key={b.name} label={b.name} value={b.desc} />
                ))}
              </>
            )}
          </TabsContent>

          <TabsContent value="spells">
            {!draft.class && <EmptyState message="Select a class to see spells." />}
            {spells.isLoading && <LoadingSkeleton />}
            {spells.error && <ErrorState />}
            {spells.data && (
              <div className="space-y-4">
                <p className="text-sm text-slate-400">
                  {spells.data.results.length}
                  {' '}
                  spells
                </p>
                {spells.data.results.map(spell => (
                  <div key={spell.key} className="border-b border-slate-800 pb-3">
                    <div className="flex items-baseline justify-between mb-1">
                      <h3 className="font-semibold text-slate-200">{spell.name}</h3>
                      <span className="text-xs text-slate-500">
                        {spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`}
                        {' '}
                        ·
                        {spell.school.name}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-1">
                      {spell.casting_time}
                      {' '}
                      ·
                      {spell.range_text}
                      {' '}
                      ·
                      {spell.duration}
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

**Step 4: Run tests to confirm they pass**

```bash
npx vitest run components/character/DescriptionPanel.test.tsx
```

Expected: all 4 tests PASS.

**Step 5: Commit**

```bash
git add components/character/DescriptionPanel.tsx components/character/DescriptionPanel.test.tsx
git commit -m "feat: migrate DescriptionPanel to useSWR"
```

---

### Task 5: Migrate `OptionsPanel.tsx`

**Files:**
- Modify: `components/character/OptionsPanel.tsx`
- Create: `components/character/OptionsPanel.test.tsx`

**Step 1: Write the failing test**

Create `components/character/OptionsPanel.test.tsx`:

```tsx
import type { Background, Class, Race } from '@/lib/open5e'
import { render, screen } from '@testing-library/react'
import useSWR from 'swr'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OptionsPanel } from './OptionsPanel'

vi.mock('swr', () => ({ default: vi.fn() }))

const mockUseSWR = vi.mocked(useSWR)

const races: Race[] = [{ key: 'srd_elf', name: 'Elf', desc: '' }]
const classes: Class[] = [{ key: 'srd_wizard', name: 'Wizard', desc: '', hit_dice: 'd6', saving_throws: [], subclasses: [] }]
const backgrounds: Background[] = [{ key: 'srd_acolyte', name: 'Acolyte', desc: '', benefits: [] }]

const defaultProps = {
  races,
  classes,
  backgrounds,
  onDraftChange: vi.fn(),
  onSave: vi.fn(),
}

beforeEach(() => {
  mockUseSWR.mockReturnValue({ data: undefined, isLoading: false, error: undefined } as ReturnType<typeof useSWR>)
})

describe('OptionsPanel', () => {
  it('calls useSWR with null when no class is selected', () => {
    render(<OptionsPanel {...defaultProps} />)
    expect(mockUseSWR).toHaveBeenCalledWith(null)
  })

  it('calls useSWR with subclasses URL when class is selected', () => {
    render(<OptionsPanel {...defaultProps} initialDraft={{ class: 'srd_wizard' }} />)
    expect(mockUseSWR).toHaveBeenCalledWith('/api/subclasses?class=srd_wizard')
  })

  it('shows Loading… placeholder when subclasses are loading', () => {
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: true, error: undefined } as ReturnType<typeof useSWR>)
    render(<OptionsPanel {...defaultProps} initialDraft={{ class: 'srd_wizard' }} />)
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })
})
```

**Step 2: Run to confirm the test fails**

```bash
npx vitest run components/character/OptionsPanel.test.tsx
```

Expected: FAIL — `useSWR` is never called (component uses `useEffect`+fetch).

**Step 3: Implement the migration**

In `components/character/OptionsPanel.tsx`:

1. Replace the imports block — remove `useState, useEffect`, add `useSWR`:
```tsx
import { useState } from 'react'
import useSWR from 'swr'
```

2. Remove these lines from the component body:
```tsx
const [subclasses, setSubclasses] = useState<Subclass[]>([])
const [loadingSubclasses, setLoadingSubclasses] = useState(false)

// Fetch subclasses when class changes
useEffect(() => {
  if (!draft.class)
    return
  setLoadingSubclasses(true)
  void fetch(`/api/subclasses?class=${draft.class}`)
    .then(r => r.json())
    .then((data: unknown) => setSubclasses(data as typeof subclasses))
    .finally(() => setLoadingSubclasses(false))
  return () => setSubclasses([])
}, [draft.class])
```

3. Add this line in their place:
```tsx
const { data: subclasses = [], isLoading: loadingSubclasses } = useSWR<Subclass[]>(
  draft.class ? `/api/subclasses?class=${draft.class}` : null
)
```

No changes needed in the JSX — `loadingSubclasses` variable name is preserved, so `disabled={!draft.class || loadingSubclasses}` and `placeholder={loadingSubclasses ? 'Loading…' : 'Select subclass'}` still work.

**Step 4: Run tests to confirm they pass**

```bash
npx vitest run components/character/OptionsPanel.test.tsx
```

Expected: all 3 tests PASS.

**Step 5: Commit**

```bash
git add components/character/OptionsPanel.tsx components/character/OptionsPanel.test.tsx
git commit -m "feat: migrate OptionsPanel subclass fetch to useSWR"
```

---

### Task 6: Final verification

**Step 1: Run all tests**

```bash
npm run test:run
```

Expected: all tests PASS (open5e tests + new component tests).

**Step 2: Run lint**

```bash
npm run lint
```

Expected: no errors.

**Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 4: Commit any fixes, or note clean**

If all three pass with no changes needed, note it's clean. Otherwise fix and commit.
