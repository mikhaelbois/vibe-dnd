# SWR Migration Design

**Date:** 2026-02-22

## Problem

`DescriptionPanel.tsx` and `OptionsPanel.tsx` manage client-side data fetching manually via `useEffect` + `fetch`, with hand-rolled `data`/`loading`/`error` state. This duplicates what SWR provides out of the box, and misses benefits like request deduplication and cross-component caching.

## Approach

Replace all direct `fetch` usage with `useSWR`, backed by a global `<SWRConfig>` provider with a shared JSON fetcher.

## Architecture

### New file: `components/providers.tsx`

A `'use client'` component that wraps children with `<SWRConfig>`:

```tsx
'use client'
import { SWRConfig } from 'swr'

function fetcher(url: string) {
  return fetch(url).then((r) => {
    if (!r.ok)
      throw new Error()
    return r.json()
  })
}

export function Providers({ children }: { children: React.ReactNode }) {
  return <SWRConfig value={{ fetcher }}>{children}</SWRConfig>
}
```

### `app/layout.tsx`

Wrap `{children}` with `<Providers>`.

### `components/character/DescriptionPanel.tsx`

- Delete the `useOpen5eData<T>` custom hook entirely.
- Replace each call with `useSWR<T>(url | null)`.
- `null` key → SWR skips the fetch (native behaviour, replaces the `if (!url) return` guard).
- Rename `loading` → `isLoading` in JSX to match SWR's returned shape.

### `components/character/OptionsPanel.tsx`

- Remove `loadingSubclasses` state and the `useEffect`+fetch block.
- Replace with `useSWR<Subclass[]>(draft.class ? \`/api/subclasses?class=${draft.class}\` : null)`.
- Update JSX references from `loadingSubclasses` to `isLoading`.

## What changes

| File | Change |
|------|--------|
| `package.json` | Add `swr` dependency |
| `components/providers.tsx` | **New** — global SWRConfig with shared fetcher |
| `app/layout.tsx` | Wrap children with `<Providers>` |
| `components/character/DescriptionPanel.tsx` | Delete custom hook, use `useSWR` |
| `components/character/OptionsPanel.tsx` | Replace useEffect+fetch with `useSWR` |

## What SWR adds

- Request deduplication (same URL requested twice → one network call)
- Cross-component cache (both panels hitting the same URL share a response)
- Automatic revalidation on focus/reconnect

## Out of scope

- Server-side data fetching (`page.tsx` files use Next.js `fetch` with `revalidate` — leave as-is)
- SWR mutations / optimistic updates
- Custom `SWRConfig` options beyond the shared fetcher
