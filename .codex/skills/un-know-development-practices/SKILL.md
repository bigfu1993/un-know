---
name: un-know-development-practices
description: Frontend and backend development workflow for the un-know project. Use when working in D:\code\un-know on H5 React code, shared client packages, Java Spring Boot backend code, PostgreSQL/Flyway migrations, product document updates, API integration, validation, refactoring, comments, or code quality improvements.
---

# un-know Development Practices

## Start Here

1. Read `AGENTS.md` before making changes; it is the project-level source of truth.
2. Keep product behavior synchronized with `docs/产品需求文档.md` whenever features, states, APIs, UI entries, validation, or copy changes.
3. Prefer real API/database implementation. For product features, complete database migration, backend API, shared domain type, api-client, hooks, H5 usage, and PRD update together; do not leave half frontend or half backend work unless the user explicitly scopes the change.
4. Preserve user changes. Read files before editing and keep refactors scoped to the requested business area.

## Choose References

- For H5 React, shared client packages, UI states, routing, hooks, or styling, read `references/frontend.md`.
- For Java Spring Boot, API design, JDBC/Flyway, comments, service boundaries, or backend validation, read `references/backend.md`.
- For full-stack changes, read both references and verify the API contract from backend response model through `client/packages/domain`, `api-client`, hooks, and H5 usage.

## Required Workflow

1. Locate the current module owner: page/component/hook for H5, controller/application/model/migration for backend.
2. Before writing new logic, inspect existing modules, components, hooks, shared types, and tools for reusable behavior. Keep business-specific reusable helpers in the owning module/component, and move business-agnostic pure helpers into `client/apps/h5/src/tools`.
3. Keep `client/apps/h5/src/App.tsx` as the root coordinator only: login/session, routing, global data loading, and cross-business dialog composition. Move single-business models, dialogs, cards, and workflow components into the matching page module such as `pages/Delegation` or `pages/Tutor`.
4. Keep page-private components flat under `pages/<Module>/components/*.tsx`; do not create nested component folders inside `pages`.
5. Keep every page module style entry in `pages/<Module>/index.less`, imported by `index.tsx`. Page-private component styles should live in that page stylesheet instead of global `styles.less`.
6. Update code and comments together. Java uses JavaDoc; TypeScript/React uses TSDoc/JSDoc for exported or business-heavy units.
7. Keep domain states centralized. Avoid scattering Chinese status strings across frontend and backend.
8. H5 reusable types live in `client/apps/h5/src/types` and are exposed through auto-import/global declarations; remove explicit type imports when a type is globally provided.
9. Validate after changes:
   - H5: `cd client && npm run typecheck:h5 && npm run lint:h5`
   - Backend: `cd server && mvn -q -DskipTests compile`
   - Runtime when APIs or data changed: health check and at least one targeted real-interface flow.
10. If backend behavior changed and a running server needs refresh, restart it unless the user explicitly asks not to.

## Completion Standard

Finish with the changed behavior, files touched at a high level, verification results, and any known warnings or blocked checks. Keep the response concise and in Chinese.
