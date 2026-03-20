# API Call Reduction Design

**Date:** 2026-03-19

## Problem

`DescriptionPanel` makes up to 5 direct client-side SWR calls to `https://api.open5e.com/v2` per browser session (race detail, class detail, subclass detail, background detail, spells). These bypass the server-side 24h Next.js fetch cache and reset on every page refresh. The goal is to reduce actual Open5e API calls.

## Current Call Inventory

| Call | Where | Cached? |
|------|-------|---------|
| `/species/?limit=100` | Server (page load) | ✓ 24h server cache |
| `/classes/?limit=200` | Server (page load) | ✓ 24h server cache |
| `/backgrounds/?limit=100` | Server (page load) | ✓ 24h server cache |
| `/species/<key>/` | Client SWR (DescriptionPanel) | ✗ resets each session |
| `/classes/<class_key>/` | Client SWR (DescriptionPanel) | ✗ resets each session |
| `/classes/<subclass_key>/` | Client SWR (DescriptionPanel) | ✗ resets each session |
| `/backgrounds/<key>/` | Client SWR (DescriptionPanel) | ✗ resets each session |
| `/spells/?limit=200&classes__key=<key>` | Client SWR (DescriptionPanel) | ✗ resets each session |
| `/classes/?limit=200` (subclasses) | Client → `/api/subclasses` → server | ✓ 24h server cache |

## Design

### 1. SWR Global Config Hardening

In `components/providers.tsx`, add `revalidateOnFocus: false` and `revalidateOnReconnect: false` to the global `SWRConfig`. This eliminates spurious refetches when the user switches browser tabs or their network reconnects.

### 2. Spells Proxy Route

Add `app/api/spells/route.ts` following the same pattern as the existing `app/api/subclasses/route.ts`. Accepts `?class=<key>`, calls `getSpellsByClass(key)` from `lib/open5e.ts`, and returns JSON. This gives spells the 24h server-side fetch cache.

`DescriptionPanel`'s spells SWR key changes from the direct Open5e URL to `/api/spells?class=<key>`.

**Data shape:** `getSpellsByClass` returns `Spell[]` (already unwrapped). The route returns `NextResponse.json(spells)` — a bare array. `SpellsTabContent`'s prop type and data access change from `SWRResponse<{ results: Spell[] }>` (reading `.data.results`) to `SWRResponse<Spell[]>` (reading `.data` directly). The spell count label and filter logic update accordingly.

**Error handling:** Follow the same silent-fail pattern as `/api/subclasses/route.ts` — catch upstream errors and return `NextResponse.json([])`. When the route returns `[]`, SWR sets `data: []` and `SpellsTabContent` renders "0 spells" with no error state shown. This is acceptable for a public SRD dataset that rarely fails.

### 3. Eliminate Detail SWR Calls via Prop Threading

Race, class, and background detail data is already fetched server-side at page load and passed to the client component as lists. Subclass data is fetched client-side by `OptionsPanel` for its dropdown. None of these need to be re-fetched individually.

**Changes:**

- **Lift subclasses SWR** out of `OptionsPanel` into the parent client components (`NewCharacterClient` in `app/characters/new/client.tsx`, `CharacterClient` in `app/characters/[id]/client.tsx`). Pass `subclasses: Subclass[]` and `loadingSubclasses: boolean` as props to `OptionsPanel`. The SWR key in the parent is `draft.class ? /api/subclasses?class=${draft.class} : null`, where `draft` is the parent's own state (updated via `onDraftChange`). When `draft.class` changes, SWR immediately clears `data` (default SWR behaviour — no `keepPreviousData`) and sets `isLoading: true`, so `subclasses` becomes `[]` and `loadingSubclasses` becomes `true` before any re-render can display the stale list. `OptionsPanel`'s existing disabled-while-loading behaviour remains correct.

  Also pass `loadingSubclasses: boolean` to `DescriptionPanel` so `SubclassTabContent` can show a loading skeleton while the class-filtered subclass list is in-flight. This handles the edit-page case where `draft.class` is pre-populated but the subclasses SWR has not yet resolved. `OptionsPanel` retains its own internal `draft` state for form field binding; only the `useSWR` hook for subclasses moves to the parent.

- **Thread list data into `DescriptionPanel`**: add `races: Race[]`, `classes: Class[]`, `backgrounds: Background[]`, `subclasses: Subclass[]` props. Remove the four individual SWR calls. Use `.find(item => item.key === draft.race)` (and equivalent) for local lookup. Remove the `import { API }` from `DescriptionPanel` and the `API` export from `tab-shared.tsx` as both become unused.

- **Update tab content components**: `RaceTabContent`, `ClassTabContent`, and `BackgroundTabContent` currently accept `SWRResponse<T>` props. After the refactor, their prop interfaces change to accept the resolved data value (e.g., `race: Race | undefined`, `hasRace: boolean` unchanged) instead of `SWRResponse<Race>`. Remove their loading/error state rendering.

  `SubclassTabContent` additionally receives `loadingSubclasses: boolean`. Render priority:
  1. If `loadingSubclasses` is `true` → render `<LoadingSkeleton />` (suppress all other states)
  2. Else if `!hasSubclass` → render `<EmptyState message="Select a subclass to see details." />`
  3. Else if `subclass` is `undefined` → render `<EmptyState message="Select a subclass to see details." />`
  4. Else → render subclass name/description

  This ensures the loading skeleton correctly covers the edit-page in-flight window (where `draft.subclass` is set but `subclass` is still `undefined`).

  `LoadingSkeleton` and `ErrorState` are **retained in `tab-shared.tsx`** because `SpellsTabContent` still imports them. Only the `API` constant export is removed from `tab-shared.tsx`. `SubclassTabContent` removes its `ErrorState` import (no longer used after the SWR prop is removed).

  The spells SWR call remains in `DescriptionPanel` (it is not lifted). `DescriptionPanel` retains `import useSWR from 'swr'`; only the `import { API }` is removed.

- **Update parent client components** to pass these arrays to `DescriptionPanel` in addition to `OptionsPanel`.

### Result

| Call | After |
|------|-------|
| Race detail | Eliminated (local lookup from props) |
| Class detail | Eliminated (local lookup from props) |
| Subclass detail | Eliminated (local lookup from props) |
| Background detail | Eliminated (local lookup from props) |
| Spells | Proxied through `/api/spells` → 24h server cache |

Direct client-to-Open5e calls per session: **5 → 0**. (The client still makes one SWR call to `/api/spells` and one to `/api/subclasses`, but these are proxied through the server and never touch Open5e directly after the 24h cache is warm.)

## Files Changed

| File | Change |
|------|--------|
| `components/providers.tsx` | Add `revalidateOnFocus: false`, `revalidateOnReconnect: false` |
| `app/api/spells/route.ts` | New — proxy to `getSpellsByClass`, returns `Spell[]` |
| `components/character/tab-shared.tsx` | Remove `API` export; retain `LoadingSkeleton`, `ErrorState`, `EmptyState` |
| `components/character/OptionsPanel.tsx` | Accept `subclasses: Subclass[]` / `loadingSubclasses: boolean` as props; remove `useSWR` import |
| `components/character/DescriptionPanel.tsx` | Accept `races`, `classes`, `backgrounds`, `subclasses`, `loadingSubclasses` props; remove 4 SWR calls; update spells SWR key to `/api/spells?class=<key>`; remove `API` import; retain `useSWR` import |
| `components/character/RaceTabContent.tsx` | `race: SWRResponse<Race>` → `race: Race \| undefined`; remove loading/error rendering |
| `components/character/ClassTabContent.tsx` | Same pattern as RaceTabContent |
| `components/character/SubclassTabContent.tsx` | Same pattern as RaceTabContent; add `loadingSubclasses: boolean` prop; implement render priority (skeleton → empty → content); remove `ErrorState` import |
| `components/character/BackgroundTabContent.tsx` | Same pattern as RaceTabContent |
| `components/character/SpellsTabContent.tsx` | `spells: SWRResponse<{ results: Spell[] }>` → `SWRResponse<Spell[]>`; read `.data` directly |
| `app/characters/new/client.tsx` | Lift subclasses SWR; pass `races`, `classes`, `backgrounds`, `subclasses`, `loadingSubclasses` to both panels |
| `app/characters/[id]/client.tsx` | Same as above |
| `components/character/OptionsPanel.test.tsx` | Remove SWR mock + all SWR-assertion tests; pass `subclasses`/`loadingSubclasses` as props in remaining tests |
| `components/character/DescriptionPanel.test.tsx` | Remove SWR-assertion tests for eliminated calls; replace with prop-based rendering tests. Update (not delete) spell filter tests: change mocked key to `/api/spells?class=<key>` and `spellData` fixture from `{ results: Spell[] }` to `Spell[]`. Add `races`, `classes`, `backgrounds`, `subclasses`, `loadingSubclasses` to all test renders. |

## Success Criteria

- No direct client-to-Open5e calls during a character builder session
- Spells load via `/api/spells` and benefit from 24h server cache
- On the edit page, the subclass tab shows a loading skeleton while the subclasses SWR is in-flight, then displays the saved subclass name/description once resolved
- `yarn check`, `yarn lint`, `yarn test:run` all pass
