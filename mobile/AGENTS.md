This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

# AGENTS.md — Persistent Development Instructions for LifeAdmin

## 1. Core Operating Principles

- **Always inspect existing code before modifying it**: Never guess file paths, component APIs, route handlers, or database schemas. Review existing code thoroughly.
- **Read product specifications first**: Consult `product.md`, `customer.md`, `docs/UI_UX_SPEC.md`, and `docs/DESIGN_SYSTEM.md` prior to designing or altering features.
- **Preserve the existing technology stack**:
  - **Frontend**: React 19, TypeScript, Vite, Tailwind CSS 4, React Router, Lucide React, Axios, React Hot Toast.
  - **Backend**: Node.js, Express, TypeScript, MongoDB, Mongoose, JWT authentication.
  - **Shared**: TypeScript interfaces in `/shared`.
  - **Strict Prohibition**: Do not migrate or introduce Next.js, Supabase, Firebase, Prisma, or foreign backend services without explicit user approval.
- **Strict TypeScript Typing**: No unnecessary `any`. Keep frontend and backend models synchronized with `/shared/types.ts`.
- **Reusable Component Architecture**: Prioritize composing reusable, accessible UI components with consistent styling tokens.

## 2. Minimal, Complete Changes (Ponytail-inspired)

- **Smallest complete change**: Before editing, identify every place the change must reach (callers, tests, fixtures, config, exports/routes). Prefer the smallest working diff that fully solves the task.
- **Reuse before adding**: Use existing helpers, components, patterns, platform features, and installed dependencies in the way surrounding code does. Do not add dependencies for work achievable with a few lines or existing code.
- **No speculative complexity**: Skip unrequested features, options, abstractions, wrappers, boilerplate, or "for later" code. Keep values in the platform/native form where practical. Deletion beats addition when behavior is preserved.
- **Finish the change**: Update broken callers, tests, fixtures, and affected wiring. Bug fixes should address the root cause in shared code after checking callers. Moved/merged code keeps its validation and error handling.
- **Checks for non-trivial logic**: New non-trivial logic (branches, loops, parsers, money/security logic, or new scripts/apps) needs a small test or assert-based self-check when feasible. Trivial changes do not.
- **Non-negotiable (never cut for minimalism)**: Security, validation at trust boundaries, error handling that prevents data loss, accessibility, reliability, required tests/verification for the change, and anything the user explicitly asked for. Minimal code must not weaken these.

## 3. Design System & UX Standards

- **Follow `docs/DESIGN_SYSTEM.md` faithfully** (source of truth for tokens):
  - Light theme: Ocean Teal palette as defined in the design system (background/surface/primary/text/borders).
  - Dark theme: Deep Ocean Blue + Teal palette as defined in the design system (`#183B4A` bg, `#143440` sidebar, `#204B5A` cards, `#285968` elevated, `#55BDB5` accent, `#F1F7F7`/`#C5DDDE`/`#A7C5C8` text, `#355966` borders) — validate contrast and adjust minimally for accessibility if needed.
  - Typography: **DM Serif Display** for editorial headings, **Inter** for body text and UI controls.
  - Philosophy: Editorial + Modern Productivity SaaS (calm personal workspace, not generic admin templates).
- **Follow `docs/UI_UX_SPEC.md`**: Respect interaction patterns, quiet motion durations (120–350ms), accessibility (WCAG 2.1 AA), responsive layouts (mobile, tablet, desktop).
- **Adaptive Navigation**: Collapsible sidebar on desktop, compact drawer on tablet, bottom navigation bar on mobile viewports.

## 4. Product Rules & Integrity

- **Completely Free Product**: LifeAdmin serves everyone with zero subscription paywalls. No active pricing gates or tier locks.
- **LifeBuddy Companions**: Original stylized 3D virtual companions with positive reinforcement growth mechanics. Never punish inactivity. Companions never get sick or disappear.
- **Calendar vs. Appointments**: Keep them distinct. Appointments manages specific appointment records; Calendar aggregates all dated items (events, tasks, bills, appointments).
- **Never delete existing functionality**: Improve, refine, and integrate rather than dropping existing capabilities.
- **Document Expiry & Bill Currencies**: Default display currency is ₹ (INR), currency-aware.

## 5. Security & Environment Protection

- **Never expose environment secrets**: Never print, log, or commit `.env` files or API keys.
- **Preserve `.env` and authentication**: Maintain JWT authentication and existing backend routes.
- **Access control**: Maintain secure document and upload access checks.

## 6. Verification & Workflow

- **Test before declaring complete**:
  - Frontend: `npm run client:build`
  - Backend: `npm run server:build`
  - Verify interaction, responsive layouts, theme switching, and error handling.
- **Update documentation**: Keep `docs/CHANGELOG.md` and related documentation up-to-date with architectural and feature changes.

## 7. Knowledge Graph (Graphify)

- Project Graphify rules live in `.agents/rules/graphify.md` and workflow in `.agents/workflows/graphify.md` (Antigravity/project agents). Follow them.
- When `graphify-out/graph.json` exists, prefer `graphify query/path/explain` (or MCP equivalents) for codebase/architecture questions before broad file reads. Read `graphify-out/GRAPH_REPORT.md` only when scoped queries are insufficient.
- After modifying code files in a session, run `graphify update .` to keep the graph current (AST-only, no API cost) when Graphify is in use.

## 5. Ponytail — Simplicity and Maintainability

Follow the installed Ponytail skill and its official instructions whenever available.

Otherwise, apply these principles:

- Prefer the simplest correct, maintainable implementation.
- Reuse existing utilities and established project conventions.
- Avoid unnecessary abstractions, duplicate code, dependencies, and excessive comments.
- Avoid speculative generalization and premature optimization.
- Keep changes focused on the requested task.
- Preserve error handling, input validation, accessibility, and security protections.
- Add focused tests for meaningful business logic.
- Explain important trade-offs and unverified behavior honestly.

Do not sacrifice correctness, security, or maintainability merely to reduce code length.

Use dedicated Ponytail commands only when the installed integration supports them.

## 6. Knowledge Graph (Graphify)

- Project Graphify rules live in `.agents/rules/graphify.md` and workflow in `.agents/workflows/graphify.md` (Antigravity/project agents). Follow them.
- When `graphify-out/graph.json` exists, prefer `graphify query/path/explain` (or MCP equivalents) for codebase/architecture questions before broad file reads. Read `graphify-out/GRAPH_REPORT.md` only when scoped queries are insufficient.
- After modifying code files in a session, run `graphify update .` to keep the graph current (AST-only, no API cost) when Graphify is in use.

## 7. Design System & Impeccable Rules

- `DESIGN.md` is the single source of truth for LifeAdmin's visual design system.
- Follow its colors, typography, spacing, shapes, component styling, and design principles.
- Use Impeccable skills when designing, implementing, or reviewing UI.
- Before making visual changes, inspect the existing implementation and preserve established design patterns.
- Do not introduce arbitrary colors, fonts, shadows, gradients, border radii, or spacing values.
- Maintain the "Editorial Sanctuary" visual direction.
- Preserve visual consistency between the web and mobile applications.
- For mobile, adapt interaction patterns to native conventions without changing the underlying visual identity.
- Never simplify or redesign existing screens without explicit approval.
- Prioritize accessibility, readability, responsive layouts, and consistent touch targets.
