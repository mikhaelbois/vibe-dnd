# Type-Aware Linting Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable type-aware ESLint rules (`no-floating-promises`, `no-misused-promises`, `await-thenable`, `consistent-type-imports`) and fix the two violations they surface.

**Architecture:** Add a single config block to `eslint.config.mjs` that passes `parserOptions.project: true` to activate TypeScript's type checker, then add the four rules as errors. Fix the two pre-existing violations in `OptionsPanel.tsx`.

**Tech Stack:** ESLint 9 flat config, `@typescript-eslint/eslint-plugin` (already installed via `eslint-config-next`), Next.js 16, TypeScript 5.

---

### Task 1: Add type-aware config block to `eslint.config.mjs`

**Files:**
- Modify: `eslint.config.mjs`

**Step 1: Open the file**

Current contents of `eslint.config.mjs` (18 lines):

```js
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
```

**Step 2: Add the type-aware config block**

Replace the file with:

```js
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Type-aware rules — require parserOptions.project so TypeScript's type
  // checker is available to the linter.
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
]);

export default eslintConfig;
```

**Step 3: Run lint to confirm the two expected violations appear (and no others)**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && npx eslint components/character/OptionsPanel.tsx`

Expected output — exactly two new errors, no others:
```
  56:5  error  Promises must be awaited …  @typescript-eslint/no-floating-promises
 163:17 error  Promise-returning function provided to attribute where a void return was expected  @typescript-eslint/no-misused-promises
```

**Step 4: Commit the config change**

```bash
git add eslint.config.mjs
git commit -m "feat(lint): enable type-aware ESLint rules"
```

---

### Task 2: Fix `no-floating-promises` in `OptionsPanel.tsx`

**Files:**
- Modify: `components/character/OptionsPanel.tsx:56`

**Background:** `fetch(...).then(...).then(...).finally(...)` returns a Promise. ESLint requires it to be awaited, returned, or explicitly discarded with `void`. Since this is inside a `useEffect` callback (which must be synchronous), `void` is the correct fix.

**Step 1: Locate the violation**

`components/character/OptionsPanel.tsx` lines 55–59:

```ts
    setLoadingSubclasses(true)
    fetch(`/api/subclasses?class=${draft.class}`)
      .then((r) => r.json())
      .then((data) => setSubclasses(data))
      .finally(() => setLoadingSubclasses(false))
```

**Step 2: Prefix the fetch chain with `void`**

Change lines 56–59 to:

```ts
    setLoadingSubclasses(true)
    void fetch(`/api/subclasses?class=${draft.class}`)
      .then((r) => r.json())
      .then((data: unknown) => setSubclasses(data as typeof subclasses))
      .finally(() => setLoadingSubclasses(false))
```

Note: `r.json()` returns `Promise<unknown>` so the `.then` callback parameter needs a type. Cast to the existing `subclasses` state type to keep it consistent.

**Step 3: Run lint on the file to confirm only one error remains**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && npx eslint components/character/OptionsPanel.tsx`

Expected: only the `no-misused-promises` error on line 163 remains.

**Step 4: Commit**

```bash
git add components/character/OptionsPanel.tsx
git commit -m "fix(lint): void fetch chain to satisfy no-floating-promises"
```

---

### Task 3: Fix `no-misused-promises` in `OptionsPanel.tsx`

**Files:**
- Modify: `components/character/OptionsPanel.tsx:163`

**Background:** The `onClick` prop of a button expects `() => void`. Passing `() => onSave(draft)` makes the arrow function return `Promise<void>`, which ESLint flags. Fix: wrap in a sync handler that discards the return value with `void`.

**Step 1: Locate the violation**

`components/character/OptionsPanel.tsx` lines 160–164:

```tsx
      <Button
        className="mt-auto"
        disabled={!draft.name || saving}
        onClick={() => onSave(draft)}
      >
```

**Step 2: Wrap with a void handler**

Change the `onClick` prop:

```tsx
      <Button
        className="mt-auto"
        disabled={!draft.name || saving}
        onClick={() => { void onSave(draft) }}
      >
```

**Step 3: Run lint on the file — expect zero errors**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && npx eslint components/character/OptionsPanel.tsx`

Expected: no errors or warnings (excluding any pre-existing `react-hooks/set-state-in-effect` warnings which are out of scope).

**Step 4: Run full lint to confirm no regressions**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && npx eslint app/ components/ lib/ proxy.ts`

Expected: zero new errors. The `react-hooks/set-state-in-effect` errors in `DescriptionPanel.tsx` and `OptionsPanel.tsx` were pre-existing and are out of scope for this task.

**Step 5: Commit**

```bash
git add components/character/OptionsPanel.tsx
git commit -m "fix(lint): void async handler to satisfy no-misused-promises"
```
