---
name: un-know-development-practices
description: Methodology and validation workflow for the un-know project. Use when working in D:\code\un-know on H5 React code, shared client packages, Java Spring Boot backend code, PostgreSQL/Flyway migrations, product documentation, API integration, refactoring, comments, or code quality improvements.
---

# un-know Development Practices

## Start Here

1. Read `AGENTS.md` before making changes; it is the project-level source of truth.
2. Keep product behavior synchronized with `docs/产品需求文档.md` whenever features, states, APIs, UI entries, validation, or copy changes.
3. Keep this skill business-agnostic. Do not add role names, feature names, one-off page rules, endpoint paths, or concrete product decisions here; put those details in PRD or module docs.
4. Preserve user changes. Read files before editing and keep refactors scoped to the requested area.

## Core Method

1. Locate ownership first: page/component/hook for H5, controller/application/model/migration for backend, shared domain/api-client/hooks for contracts.
2. Inspect existing modules, components, hooks, shared types, and tools before adding logic. Reuse or extract instead of duplicating.
3. For real business behavior, trace the backend/database source of truth first. Workflow state, permissions, operation visibility, current/default records, and status transitions must be represented by database state and API contracts before H5 consumes them.
4. Do not implement business flow progression with H5-only local state, local cache, mock data, toast-only actions, or temporary frontend flags. If a flow is local-only, convert it to backend API + database first, then polish the UI.
5. Keep data contracts aligned end to end: migration/model/service/API response, shared domain, api-client, hooks, H5 usage, and product documentation.
6. Keep state and hooks close to the real consumer. Do not call a hook in a parent only to pass its result through child layers.
7. Let global data flow through Provider/Context/store. Descendants should read global state through store/context hooks instead of prop drilling global objects.
8. Keep components narrow. Local feedback, button event wrapping, default props, and temporary drafts belong inside the owning component/page. Emit final data or business result callbacks upward.
9. Prefer slots for pure containers. Layout, grouping, and tab-switching components should use `children` or named slots for content instead of forwarding child business props; keep their props limited to their own layout, switching, and display configuration.
10. Keep roots and pages lean: root wires application-level providers, session, routing, global data, and cross-module composition; pages orchestrate feature flow; components own display and local interaction.
11. Keep styles and types by ownership: page styles in `pages/<Module>/index.less`, shared component styles beside the component, H5 reusable types in `client/apps/h5/src/types`, pure reusable utilities in `client/apps/h5/src/tools`.
12. Run broad refactors in batches. Each batch declares scope, classifies issues, makes focused edits, validates, then moves to the next batch.
13. Before deleting or splitting exports, search explicit imports, JSX usage, generated declarations, and auto-import configuration.

## Choose References

- For H5 React, shared client packages, UI states, routing, hooks, or styling, read `references/frontend.md`.
- For Java Spring Boot, API design, JDBC/Flyway, comments, service boundaries, or backend validation, read `references/backend.md`.
- For full-stack changes, read both references and verify the API contract from backend response model through `client/packages/domain`, `api-client`, hooks, and H5 usage.

## Required Workflow

1. Apply the Core Method before editing.
2. Update code and comments together. Java uses JavaDoc; TypeScript/React uses TSDoc/JSDoc for exported or behavior-heavy units.
3. Keep stable domain states centralized. Avoid scattering display strings or backend states across frontend and backend.
4. H5 reusable types live in `client/apps/h5/src/types` and are exposed through auto-import/global declarations; remove explicit type imports when a type is globally provided.
5. Validate after changes:
   - H5: `cd client && npm run typecheck:h5 && npm run lint:h5`
   - Backend: `cd server && mvn -q -DskipTests compile`
   - Runtime when APIs or data changed: health check and at least one targeted real-interface flow.
6. If backend behavior changed and a running server needs refresh, restart it unless the user explicitly asks not to.

## Completion Standard

Finish with the changed behavior, files touched at a high level, verification results, and any known warnings or blocked checks. Keep the response concise and in Chinese.
