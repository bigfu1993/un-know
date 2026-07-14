# Frontend Reference

## Scope

Applies to `client/apps/h5`, `client/packages/domain`, `client/packages/api-client`, and `client/packages/hooks`. H5 is the current primary debugging target unless the user explicitly asks for Taro miniapp or admin.

## React/H5 Rules

- Keep pages in `client/apps/h5/src/pages/<Module>/index.tsx`; each page imports `index.less`. Page-private components live as flat files under `pages/<Module>/components/*.tsx`, and their styles live in the page `index.less`.
- Shared display units outside `pages` keep the existing `components/<Component>/index.tsx` folder convention with adjacent style file when needed.
- Keep flow orchestration in pages and generic display in components. Components should not read global state unless that state is explicitly app-wide and provided by the root store/context.
- Let components own interaction details that do not change external business state: toast-only feedback, button event wrapping, default prop values, and temporary form drafts. Emit final data or item-level callbacks upward.
- Use slots for pure container components. If a component only provides layout, grouping, tabs, or shell behavior, pass the inner content through `children` or named slots instead of forwarding the child component's business props.
- Remove no-op shells. If a wrapper does not own reusable semantics, local state, or a meaningful layout contract, merge it into the real owner or convert it to a slot-based container.
- Prefer stable component defaults over repetitive props. Callers should not pass values that are already the component default.
- For list preview cards, pass the whole item when available and let the component bind `onUse(item)`, `onEdit(item)`, or `onDelete(item)` internally instead of wrapping callbacks in every `.map`.
- Keep reusable pure functions in `client/apps/h5/src/tools/*.ts`.
- Call hooks close to the component that actually consumes the state, data, or action. Do not call a hook in a parent only to pass its result through child layers.
- Provide global data and state from the root Provider/Context, then let descendants read it through the project store/context hooks instead of prop drilling global objects.
- Keep shared/global hooks in `client/apps/h5/src/hooks`; keep page or business-module local hooks in `pages/<Module>/hooks/*.ts` instead of next to the page component file.
- Before adding a new branch of UI or business logic, scan nearby pages/components/hooks/tools for a reusable unit. Extract repeated business helpers to the owning module and non-business helpers to `tools`.
- Keep `App.tsx` lean. Business-specific dialogs and derived models should live under the matching page module; use `App.tsx` only to wire global state, routing, and cross-module workflows.
- Run full-H5 or repo-wide cleanups in batches. Each batch should declare scope, make a focused change, run the relevant validation commands, then continue to the next batch.
- Treat component collection folders as transitional. Before deleting them, search the exported component names, JSX usage, generated declarations, and auto-import configuration; split exports first if they are still used.
- Keep authenticated user/session data in the global store/context; avoid prop drilling the whole user object.
- Keep API types in `client/packages/domain`. Update `api-client` and hooks together when backend contracts change.
- For operation results, use the project toast/message component instead of alert or ad hoc inline state. When the toast is globally registered as a singleton, call it through direct API imports such as `showMessage`/`hideMessage` instead of adding a component-local hook wrapper.
- For fixed-header/fixed-footer screens with a scrollable body, keep header, body, and footer as sibling regions under the same layout owner. If a footer button submits a form outside its DOM subtree, connect them with a stable `form` id and the button `form` attribute instead of nesting the footer inside the form.
- Put required and high-priority form fields before optional supplements. Optional or expandable supplements should be grouped into a coherent panel/card that owns its header, action, and expanded content.

## Styling

- Use existing mobile H5 layout language: compact cards, 8px radius, bottom navigation, floating avatar/quick actions.
- Tailwind utilities carry layout, spacing, text size, color, width and height where already used. Keep background, border, positioning and grid-template rules in Less/CSS per project convention.
- Component-specific Less belongs beside the shared component in `components/<Component>/index.less`; page-specific styles belong in `pages/<Module>/index.less`; avoid adding new component selectors to global `styles.less`.
- Do not hide layout issues with oversized containers. Lists that are meant to scroll should have stable container height and internal scroll.
- Keep field row height stable inside the same form group. Inline text or icon actions are preferred inside input rows when a full button would increase the input height or misalign sibling fields.

## Data And State

- H5 must consume real backend workflow state for business flows. Button visibility, status text, role permissions, current/default records, application/confirmation/cancel/completion steps, and other workflow decisions must come from backend responses or be immediately backed by a real API action.
- Do not implement business flow progression with H5-only state, local cache, mock data, toast-only actions, or temporary frontend flags. If an existing flow is local-only, convert it to backend API + database first, then adjust components.
- Security, identity, credential, permission, and workflow-validity checks must be backed by real APIs and server state. Browser-side hashes, caches, and drafts may improve input UX, but they are not the source of truth.
- Prefer server state through React Query hooks. Do not create local fake business state for real flows.
- When a backend state has a UI-only display label, compute it in a small helper and document the boundary.
- For permission-specific behavior, make permission checks explicit and keep labels consistent with `docs/产品需求文档.md`.

## Validation

Run `npm run typecheck:h5` and `npm run lint:h5` from `client`. Existing `MessageToast` Fast Refresh warnings may be reported as known warnings unless the task is about that component.
