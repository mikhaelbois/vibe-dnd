# vibe-dnd Design Doc

**Date:** 2026-02-19
**Status:** Approved

## Overview

A D&D 5e character reference app. Users sign up, create characters by selecting race, class, subclass, and background, then view full descriptions of their feats, skills, and spells — all on a single page with live-updating content.

## Architecture

**Stack:**
- Next.js 16.1 (App Router, Turbopack, React Compiler)
- TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (PostgreSQL + auth)
- Open5e API (free SRD data — classes, races, spells, feats, backgrounds)

**Routes:**
```
/                      Landing page / sign-in prompt
/auth/login            Login
/auth/signup           Signup
/characters            Character list dashboard
/characters/new        Create a new character
/characters/[id]       View / edit a character
```

**Auth:** Supabase session-based auth via cookies. `proxy.ts` (Next.js 16) protects `/characters/*` — unauthenticated users are redirected to `/auth/login`.

## Database Schema

Single table in Supabase PostgreSQL:

```sql
characters (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  name        text not null,
  race        text,         -- Open5e slug, e.g. "elf"
  class       text,         -- Open5e slug, e.g. "wizard"
  subclass    text,         -- Open5e slug, e.g. "school-of-evocation"
  background  text,         -- Open5e slug, e.g. "sage"
  level       integer default 1,
  created_at  timestamptz default now()
)
```

Row Level Security: users can only read and write rows where `user_id = auth.uid()`.

Open5e slugs are stored as identifiers — descriptions are fetched from the API at display time, keeping the database free of duplicated game data.

## Character Builder UI

`/characters/new` and `/characters/[id]` share the same single-page layout:

```
┌─────────────────────┬──────────────────────────────────────┐
│  Character Options  │  Description Panel                   │
│                     │                                      │
│  Name: [______]     │  [Tabs: Race | Class | Subclass |    │
│                     │   Background | Spells | Features]    │
│  Race: [dropdown]   │                                      │
│  Class: [dropdown]  │  Full descriptions from Open5e       │
│  Subclass: [drop]   │  update in real-time as selections   │
│  Background: [drop] │  change.                             │
│  Level: [1–20]      │                                      │
│                     │                                      │
│  [Save Character]   │                                      │
└─────────────────────┴──────────────────────────────────────┘
```

- Left panel: all character selections (name, race, class, subclass, background, level)
- Right panel: tabbed descriptions that update live as selections change
- Tabs: Race, Class, Subclass, Background, Spells, Features
- Mobile: panels stack vertically (options on top, descriptions below)
- Subclass dropdown is populated based on the selected class

## Data Fetching

- Dropdown lists (races, classes, backgrounds) are fetched in Server Components on page load and cached by Next.js
- Description panel content is fetched client-side when a selection changes
- `use cache` directive used on Open5e fetch wrappers for reuse across requests
- Loading states: shadcn/ui `Skeleton` components fill the description panel while data loads

## Error Handling

- Open5e unavailable: description panel shows "Could not load content" — selection is preserved and can still be saved
- Supabase save error: toast notification via shadcn/ui `Sonner`
- Auth errors: redirect to `/auth/login` via `proxy.ts`

## Out of Scope (for now)

- Character notes, HP tracking, or full character sheet math
- OAuth / social login (email/password only to start)
- Multiple game systems
