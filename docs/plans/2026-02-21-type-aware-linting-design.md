# Type-Aware Linting Design

**Date:** 2026-02-21
**Status:** Approved

## Problem

The current `eslint.config.mjs` extends `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`, which only enables syntax-based TypeScript rules. Without `parserOptions.project`, the most valuable `@typescript-eslint` rules — those that use the TypeScript compiler's type information — are unavailable. This leaves async bugs (unawaited promises, async void callbacks) undetected at lint time.

## Approach

Surgical addition of type-aware linting. Enable `parserOptions.project: true` and add four targeted rules as errors. Do not adopt the full `recommendedTypeChecked` preset to avoid noise.

## Changes

### `eslint.config.mjs`

Add a config block with:

- `languageOptions.parserOptions.project: true` — loads `tsconfig.json` for type information
- `@typescript-eslint/no-floating-promises: error` — catches unawaited async calls
- `@typescript-eslint/no-misused-promises: error` — prevents async functions in void-callback positions
- `@typescript-eslint/await-thenable: error` — catches `await` on non-Promise values
- `@typescript-eslint/consistent-type-imports: error` — enforces `import type` for type-only imports (required by `isolatedModules: true`)

### `components/character/OptionsPanel.tsx`

Two violations to fix:

- **Line 56** (`no-floating-promises`): `fetch(...)` inside `useEffect` is not awaited or `void`-prefixed. Fix: prefix with `void` or convert the callback to `async`.
- **Line 163** (`no-misused-promises`): An async function is passed directly to an event handler expecting `void`. Fix: wrap in a sync handler that calls the async function.

## Out of Scope

- `@typescript-eslint/no-unsafe-*` rules (require broader codebase changes)
- Full `recommendedTypeChecked` preset
- Other ESLint gaps identified in analysis (accessibility severity, `no-console`, etc.)
