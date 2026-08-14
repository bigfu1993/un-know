---
name: frontend-refactor-optimization
description: Frontend refactor optimization methodology for React/TypeScript code. Use when checking or improving redundant intermediate variables, one-hop aliases, unnecessary Boolean wrappers, low-value derived state, redundant props, prop forwarding noise, callback wrapper noise, JSX-only temporary values, and other small code-quality optimizations without changing behavior.
---

# Frontend Refactor Optimization

## Scope

Use this skill for frontend cleanup requests that ask to find or optimize redundant variables, low-value derived state, unnecessary aliases, or small readability/performance refactors. Keep the work behavior-preserving unless the user explicitly asks for a functional change.

## Method

1. Locate the owner first: page, component, hook, model, shared type, or tool.
2. Start with targeted scans, then inspect context manually. Do not delete a variable only because it is referenced once.
3. Classify each candidate before editing:
   - Remove: one-hop aliases such as `const next = value` when `value` is stable and no snapshot semantics are needed.
   - Remove: one-hop helper wrappers that only call another parser/formatter with a single field, only read one field, or only add a trivial fallback, when the wrapper has no independent business rule, reuse boundary, type narrowing, or expensive computation benefit.
   - Remove: `const hasX = Boolean(x)` or `const isX = !!x` when used once and direct truthiness is equally clear.
   - Remove: `const rawX = [...]` immediately followed by `const x = rawX.filter(...)`; replace with a compact helper or direct expression.
   - Remove: temporary validation/result variables used only by the next `if`, when inlining keeps the failure path obvious.
   - Keep: variables that name business rules, permissions, workflow states, or user-visible conditions.
   - Keep: variables used multiple times in JSX, dependency arrays, class names, or payload construction.
   - Keep: variables that avoid expensive recomputation, preserve a pre-mutation snapshot, narrow TypeScript types, or prevent stale closure mistakes.
4. Prefer direct data use over intermediate forwarding. If a child can consume a stable object, pass the object and let the child bind item callbacks locally.
5. Prefer a small local helper when the same filtering, type guard, normalization, or null compaction appears more than once in the same owner.
6. Extract cross-owner helpers only when the pattern is repeated across files and the abstraction has a clear name independent of the current UI.
7. Do not trade readable business names for dense inline expressions. A shorter diff is not automatically a better refactor.

## Props And Callback Optimization

1. Classify props by ownership before editing:
   - Keep props that represent business results, server actions, routing ownership, modal visibility ownership, global state mutation, or cross-module orchestration.
   - Keep `className`, `variant`, `children`, and slot props when they are intentional extension points for shared components, even if current usage is limited.
   - Remove props that only repeat the component's stable default value at every call site.
   - Remove props that only forward a pure toast, local label, local formatting, or field patch merge that the component can derive from its own item/draft/key context.
2. Move non-business callback wrappers into the component when the component already owns the required context:
   - List cards should receive the item and bind `onOpen(item)`, `onUse(item)`, `onDelete(item)`, or similar item callbacks internally.
   - Field components may receive `draft`, `field`, and a generic `onChange(field, value)` callback, then read the value and bind DOM events internally.
   - Dialogs that emit partial form patches may merge the patch internally and expose only the complete draft when the parent only stores that draft.
   - Pure confirmation or feedback components may default stable visual tone/labels instead of making every caller repeat them.
3. Do not move wrappers when doing so would make the child know about parent routing, conditional rendering, external modal state, React Query invalidation, API payload ownership, or business workflow sequencing.
4. Treat "used only once" as a weak signal. A prop can still be valid when it is a public shared-component extension point or when removing it would hardcode page-specific style into a generic component.
5. After removing or changing a prop, search component definitions, JSX call sites, auto-import declarations, and exported prop types. Keep type declarations aligned with the new component contract.

## Scan Patterns

Use `rg` first, then inspect candidates:

```powershell
rg -n "const (raw[A-Z]|has[A-Z]|is[A-Z]|can[A-Z]|show[A-Z]|should[A-Z]|current[A-Z]|selected[A-Z]|submitted[A-Z]|.+Summary|.+Config|.+Value)\s*=" frontend\apps\h5\src
rg -n "const .* = Boolean\(|const .* = !!|const .* = [A-Za-z0-9_?.]+;" frontend\apps\h5\src
rg -n "interface [A-Za-z0-9]+Props|type [A-Za-z0-9]+Props|function [A-Z][A-Za-z0-9]+\(" frontend\apps\h5\src\components frontend\apps\h5\src\pages
rg -n "on[A-Z][A-Za-z0-9]+=\{\(.*\) =>|[A-Za-z0-9]+=\"[^\"]+\"|[A-Za-z0-9]+=\{(true|false|0)\}" frontend\apps\h5\src
```

For wider audits, an AST pass may count references, JSX attributes, fixed literals, and arrow callback wrappers, but treat it as a candidate finder only. Single-use variables and single-use props often still encode useful domain meaning.

## Edit Rules

- Keep edits small and grouped by candidate type.
- Preserve behavior, error messages, async order, hook dependencies, and submitted payloads.
- When removing a snapshot alias in event handlers, verify the source value cannot change before all callbacks that use it.
- When inlining into hook dependencies, avoid introducing unstable object/function identities that make effects run more often.
- When replacing `raw -> filtered` pairs, use an explicit type guard helper if TypeScript narrowing would otherwise be lost.
- When changing prop contracts, update both the prop type/interface and every call site in the same change.
- When moving patch merge logic into a component, preserve the parent-visible final draft shape and do not change validation timing.
- Do not update product documentation for pure refactors that do not change behavior.

## Validation

After H5 changes, run:

```powershell
cd frontend/apps
npm.cmd run typecheck:h5
npm.cmd run lint:h5
```

Also run `git diff --check`. For UI-affecting refactors, reuse the local H5 service and confirm the affected page can load.
