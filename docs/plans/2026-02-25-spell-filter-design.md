# Spell Filter Design

**Date:** 2026-02-25

## Problem

The Spells tab in `DescriptionPanel` renders up to 200 spells with no way to search. Finding a specific spell requires scrolling through the entire list.

## Design

Add a text input inside the Spells tab that filters the already-fetched spell list client-side.

### State

A single `useState<string>` for the filter query lives inside `DescriptionPanel`. It resets to `''` when `draft.class` changes (via `useEffect` watching `draft.class`).

### Filtering

Client-side only — spells are already in memory via SWR. Filter `spells.data.results` by `spell.name.toLowerCase().includes(query.toLowerCase())`. No debounce needed (≤200 items).

### UI

- shadcn `<Input>` with `placeholder="Filter spells…"` above the spell list, inside the Spells `TabsContent`
- Count label updates to reflect filtered results: `"12 of 47 spells"` when filtered, `"47 spells"` when unfiltered
- Input only renders when `spells.data` is present (not during loading/error/empty states)

### No API changes

The filter operates on cached SWR data. No new fetch parameters or `lib/open5e.ts` changes needed.

## Success Criteria

- Typing in the input filters the visible spell list in real time
- Count reflects filtered results
- Filter clears when the class selection changes
- `yarn check`, `yarn lint`, `yarn test:run` all pass
