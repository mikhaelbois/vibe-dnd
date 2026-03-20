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

### 3. Eliminate Detail SWR Calls via Prop Threading

Race, class, and background detail data is already fetched server-side at page load and passed to the client component as lists. Subclass data is fetched client-side by `OptionsPanel` for its dropdown. None of these need to be re-fetched individually.

**Changes:**

- **Lift subclasses SWR** out of `OptionsPanel` into the parent client components (`NewCharacterClient`, `[id]/client.tsx`). Pass `subclasses: Subclass[]` and `loadingSubclasses: boolean` as props to `OptionsPanel`.

- **Thread list data into `DescriptionPanel`**: add `races: Race[]`, `classes: Class[]`, `backgrounds: Background[]`, `subclasses: Subclass[]` props. Remove the four individual SWR calls. Use `.find(item => item.key === draft.race)` (and equivalent) for local lookup.

- **Update parent client components** to pass these arrays to `DescriptionPanel` in addition to `OptionsPanel`.

### Result

| Call | After |
|------|-------|
| Race detail | Eliminated (local lookup from props) |
| Class detail | Eliminated (local lookup from props) |
| Subclass detail | Eliminated (local lookup from props) |
| Background detail | Eliminated (local lookup from props) |
| Spells | Proxied through `/api/spells` → 24h server cache |

Client-to-Open5e calls per session: **5 → 0**.

## Files Changed

| File | Change |
|------|--------|
| `components/providers.tsx` | Add `revalidateOnFocus: false`, `revalidateOnReconnect: false` |
| `app/api/spells/route.ts` | New — proxy to `getSpellsByClass` |
| `components/character/OptionsPanel.tsx` | Accept `subclasses`/`loadingSubclasses` as props (remove SWR) |
| `components/character/DescriptionPanel.tsx` | Accept list props; remove 4 SWR calls; update spells key |
| `app/characters/new/client.tsx` | Lift subclasses SWR; pass arrays to both panels |
| `app/characters/[id]/client.tsx` | Same as above |
| `components/character/OptionsPanel.test.tsx` | Update props in test mocks |
| `components/character/DescriptionPanel.test.tsx` | Update props in test mocks |

## Success Criteria

- No direct client-to-Open5e calls during a character builder session
- Spells load via `/api/spells` and benefit from 24h server cache
- `yarn check`, `yarn lint`, `yarn test:run` all pass
