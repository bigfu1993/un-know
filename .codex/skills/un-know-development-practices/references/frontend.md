# Frontend Reference

## Scope

Applies to `client/apps/h5`, `client/packages/domain`, `client/packages/api-client`, and `client/packages/hooks`. H5 is the current primary debugging target unless the user explicitly asks for Taro miniapp or admin.

## React/H5 Rules

- Keep pages in `client/apps/h5/src/pages/<Module>/index.tsx`; each page imports `index.less`. Page-private components live as flat files under `pages/<Module>/components/*.tsx`, and their styles live in the page `index.less`.
- Shared display units outside `pages` keep the existing `components/<Component>/index.tsx` folder convention with adjacent style file when needed.
- Keep business orchestration in pages and generic display in components. Components receive data by props and should not read global user state directly.
- Keep reusable pure functions in `client/apps/h5/src/tools/*.ts`.
- Before adding a new branch of UI or business logic, scan nearby pages/components/hooks/tools for a reusable unit. Extract repeated business helpers to the owning module and non-business helpers to `tools`.
- Keep `App.tsx` lean. Business-specific dialogs and derived models should live under the matching page module; use `App.tsx` only to wire global state, routing, and cross-module workflows.
- Keep login user data in `client/apps/h5/src/store/global.ts`; avoid prop drilling of the whole user object.
- Keep API types in `client/packages/domain`. Update `api-client` and hooks together when backend contracts change.
- For operation results, use the project toast/message component instead of alert or ad hoc inline state.

## Styling

- Use existing mobile H5 layout language: compact cards, 8px radius, bottom navigation, floating avatar/quick actions.
- Tailwind utilities carry layout, spacing, text size, color, width and height where already used. Keep background, border, positioning and grid-template rules in Less/CSS per project convention.
- Do not hide layout issues with oversized containers. Lists that are meant to scroll should have stable container height and internal scroll.

## Data And State

- Prefer server state through React Query hooks. Do not create local fake business state for real flows.
- When a backend state has a UI-only display label, compute it in a small helper and document the boundary.
- For role-specific behavior, make role checks explicit and keep labels consistent with `docs/产品需求文档.md`.

## Validation

Run `npm run typecheck:h5` and `npm run lint:h5` from `client`. Existing `MessageToast` Fast Refresh warnings may be reported as known warnings unless the task is about that component.
