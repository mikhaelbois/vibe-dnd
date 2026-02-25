# Spell Filter Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a text input to the Spells tab that filters the spell list by name in real time.

**Architecture:** A single `useState<string>` for the filter query lives inside `DescriptionPanel`. A `useEffect` resets it to `''` when `draft.class` changes. The existing SWR-fetched spell list is filtered client-side — no new API calls. A shadcn `<Input>` renders above the list when spell data is loaded.

**Tech Stack:** React `useState`/`useEffect`, shadcn `<Input>`, Vitest + Testing Library

---

### Task 1: Write failing tests for spell filter

**Files:**
- Modify: `components/character/DescriptionPanel.test.tsx`

**Context:** The existing tests mock `useSWR` and render `DescriptionPanel`. The component currently has 5 `useSWR` calls in order: race, cls, subclass, background, spells. To test the Spells tab, click the "Spells" tab trigger first (Radix hides inactive tab content).

**Step 1: Read the existing test file to understand the mock pattern**

```bash
cat components/character/DescriptionPanel.test.tsx
```

**Step 2: Add the spell filter tests**

Append these three `it` blocks inside the existing `describe` block in `components/character/DescriptionPanel.test.tsx`:

```tsx
it('shows filter input and spell count when spells are loaded', () => {
  vi.mocked(useSWR)
    .mockReturnValueOnce({ data: null, isLoading: false, error: undefined } as ReturnType<typeof useSWR>)
    .mockReturnValueOnce({ data: null, isLoading: false, error: undefined } as ReturnType<typeof useSWR>)
    .mockReturnValueOnce({ data: null, isLoading: false, error: undefined } as ReturnType<typeof useSWR>)
    .mockReturnValueOnce({ data: null, isLoading: false, error: undefined } as ReturnType<typeof useSWR>)
    .mockReturnValueOnce({
      data: {
        results: [
          { key: 'fireball', name: 'Fireball', level: 3, school: { name: 'Evocation' }, casting_time: '1 action', range_text: '150 feet', duration: 'Instantaneous', concentration: false, desc: 'A bright streak flashes.' },
          { key: 'magic-missile', name: 'Magic Missile', level: 1, school: { name: 'Evocation' }, casting_time: '1 action', range_text: '120 feet', duration: 'Instantaneous', concentration: false, desc: 'You create three darts.' },
        ],
      },
      isLoading: false,
      error: undefined,
    } as ReturnType<typeof useSWR>)

  render(<DescriptionPanel draft={{ name: 'Test', race: '', class: 'srd_wizard', subclass: '', background: '', level: 1 }} />)
  fireEvent.click(screen.getByRole('tab', { name: 'Spells' }))

  expect(screen.getByPlaceholderText('Filter spells…')).toBeInTheDocument()
  expect(screen.getByText('2 spells')).toBeInTheDocument()
  expect(screen.getByText('Fireball')).toBeInTheDocument()
  expect(screen.getByText('Magic Missile')).toBeInTheDocument()
})

it('filters spells by name and updates count', () => {
  vi.mocked(useSWR)
    .mockReturnValueOnce({ data: null, isLoading: false, error: undefined } as ReturnType<typeof useSWR>)
    .mockReturnValueOnce({ data: null, isLoading: false, error: undefined } as ReturnType<typeof useSWR>)
    .mockReturnValueOnce({ data: null, isLoading: false, error: undefined } as ReturnType<typeof useSWR>)
    .mockReturnValueOnce({ data: null, isLoading: false, error: undefined } as ReturnType<typeof useSWR>)
    .mockReturnValueOnce({
      data: {
        results: [
          { key: 'fireball', name: 'Fireball', level: 3, school: { name: 'Evocation' }, casting_time: '1 action', range_text: '150 feet', duration: 'Instantaneous', concentration: false, desc: 'A bright streak flashes.' },
          { key: 'magic-missile', name: 'Magic Missile', level: 1, school: { name: 'Evocation' }, casting_time: '1 action', range_text: '120 feet', duration: 'Instantaneous', concentration: false, desc: 'You create three darts.' },
        ],
      },
      isLoading: false,
      error: undefined,
    } as ReturnType<typeof useSWR>)

  render(<DescriptionPanel draft={{ name: 'Test', race: '', class: 'srd_wizard', subclass: '', background: '', level: 1 }} />)
  fireEvent.click(screen.getByRole('tab', { name: 'Spells' }))

  fireEvent.change(screen.getByPlaceholderText('Filter spells…'), { target: { value: 'fire' } })

  expect(screen.getByText('Fireball')).toBeInTheDocument()
  expect(screen.queryByText('Magic Missile')).not.toBeInTheDocument()
  expect(screen.getByText('1 of 2 spells')).toBeInTheDocument()
})

it('resets filter when class changes', () => {
  vi.mocked(useSWR)
    .mockReturnValue({
      data: {
        results: [
          { key: 'fireball', name: 'Fireball', level: 3, school: { name: 'Evocation' }, casting_time: '1 action', range_text: '150 feet', duration: 'Instantaneous', concentration: false, desc: 'A bright streak flashes.' },
        ],
      },
      isLoading: false,
      error: undefined,
    } as ReturnType<typeof useSWR>)

  const { rerender } = render(
    <DescriptionPanel draft={{ name: 'Test', race: '', class: 'srd_wizard', subclass: '', background: '', level: 1 }} />,
  )
  fireEvent.click(screen.getByRole('tab', { name: 'Spells' }))

  const input = screen.getByPlaceholderText('Filter spells…')
  fireEvent.change(input, { target: { value: 'fire' } })
  expect(input).toHaveValue('fire')

  rerender(
    <DescriptionPanel draft={{ name: 'Test', race: '', class: 'srd_cleric', subclass: '', background: '', level: 1 }} />,
  )
  expect(input).toHaveValue('')
})
```

Also add `fireEvent` and `screen` imports if not already present — check the existing imports at the top of the file. The import line should be:

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
```

**Step 3: Run the new tests to confirm they fail**

```bash
yarn vitest run components/character/DescriptionPanel.test.tsx
```

Expected: the 3 new tests FAIL (filter input not found, count text not found, etc.). The existing 4 tests should still pass.

---

### Task 2: Implement the spell filter in DescriptionPanel

**Files:**
- Modify: `components/character/DescriptionPanel.tsx`

**Step 1: Add `useState`, `useEffect`, and `Input` imports**

At the top of `components/character/DescriptionPanel.tsx`, the imports currently are:

```tsx
'use client'

import type { Background, Class, Race, Spell, Subclass } from '@/lib/open5e'
import type { CharacterDraft } from '@/lib/types'
import useSWR from 'swr'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
```

Replace with:

```tsx
'use client'

import type { Background, Class, Race, Spell, Subclass } from '@/lib/open5e'
import type { CharacterDraft } from '@/lib/types'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
```

**Step 2: Add filter state and reset effect inside `DescriptionPanel`**

Inside the `DescriptionPanel` function, right after the five `useSWR` calls (after line 52), add:

```tsx
  const [spellFilter, setSpellFilter] = useState('')

  useEffect(() => {
    setSpellFilter('')
  }, [draft.class])

  const filteredSpells = spells.data
    ? spells.data.results.filter(s =>
        s.name.toLowerCase().includes(spellFilter.toLowerCase()),
      )
    : []
```

**Step 3: Replace the Spells `TabsContent` body**

Find the existing Spells tab content:

```tsx
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
```

Replace with:

```tsx
          <TabsContent value="spells">
            {!draft.class && <EmptyState message="Select a class to see spells." />}
            {spells.isLoading && <LoadingSkeleton />}
            {spells.error && <ErrorState />}
            {spells.data && (
              <div className="space-y-4">
                <Input
                  placeholder="Filter spells…"
                  value={spellFilter}
                  onChange={e => setSpellFilter(e.target.value)}
                  className="bg-slate-800 border-slate-700"
                />
                <p className="text-sm text-slate-400">
                  {spellFilter
                    ? `${filteredSpells.length} of ${spells.data.results.length} spells`
                    : `${spells.data.results.length} spells`}
                </p>
                {filteredSpells.map(spell => (
```

Also update the closing of the `.map()` — it currently closes with `spells.data.results.map(spell => (` so change the map reference to `filteredSpells.map(spell => (` (already done in the replacement above).

**Step 4: Run the tests**

```bash
yarn vitest run components/character/DescriptionPanel.test.tsx
```

Expected: all 7 tests pass (4 existing + 3 new).

**Step 5: Run full verification**

```bash
yarn check && yarn lint && yarn test:run
```

Expected: all pass.

**Step 6: Commit and push**

```bash
git add components/character/DescriptionPanel.tsx components/character/DescriptionPanel.test.tsx
git commit -m "feat: add spell name filter to Spells tab"
git push
```
