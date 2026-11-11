# Changelog

All notable changes to the LifeAdmin project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-11-11

### Added
- **Mobile Native Tasks Feature**: Replaced the tasks placeholder in `mobile/src/app/tasks.tsx` with a dedicated Tasks feature module (`mobile/src/features/tasks/` and `mobile/src/tests/tasks.test.ts`) featuring List and Board views, priority and status filtering, search, sorting, summary metrics, optimistic completion, and detail/create/edit modal sheets.

### Changed
- **Mobile UI/UX Polish & Visual Parity**:
  - Updated `mobile/src/constants/typography.ts` (`editorialItalic`), `mobile/src/components/app-tabs.tsx`, `mobile/src/components/themed-text.tsx`, and shared UI primitives (`ModalSheet`, `Button`, `StatCard`, `FilterBar`, `SegmentedControl`, `Card`) with `getButtonForegroundColor`, `createShadow`, `tabular-nums`, sticky modal footers, Android `KeyboardAvoidingView` `behavior="height"`, and improved touch targets.
  - Standardized Ocean Teal light/dark contrast, theme/urgency color tokens, typography hierarchy, modal flows, empty/loading states, and Android ergonomics across Dashboard, Tasks, Bills (Grid/List toggle), Calendar, Appointments, Documents Vault (distinct `processing`/`failed`/`completed` states and `en-IN` INR formatting), Reminders (timeline urgency styling, recurrence labels, and exact-alarm permission handling), AI Assistant (`SegmentedControl`, chat bubbles, `ActionConfirmationModal`, `GoalPlannerView`, `ResponsibilityDetectorView`), LifeBuddy (`LifeBuddyWidget`, `CompanionSanctuaryModal`), More, Settings, Auth, and Onboarding screens.

## [1.1.0] - 2026-11-10

### Added
- **Mobile Companion System Integration (Phase 3.1)**:
  - Ensured 1:1 fidelity with canonical companions: *Aura*, *Mossy*, *Nori*, and *Zephyr* across web and mobile.
  - Implemented backend user companion schema persistence in `server/src/models/User.ts`, updating `/api/users/settings`, `/api/users/companion`, and auth session payloads (`/me`, `/login`, `/register`, `/guest`).
  - Added shared `GrowthStage` and `CompanionState` interfaces in `shared/types.ts`.
  - Built mobile `LifeBuddyWidget` featuring live companion avatar, level badge, species & stage, growth progress bar, and daily encouragement quote.
  - Integrated `LifeBuddyWidget` into mobile dashboard (`mobile/src/app/index.tsx`).
  - Created native `CompanionSanctuaryModal` for companion inspection, adoption, inline name customization, and guilt-free philosophy display.
  - Connected `LifeBuddy Companions` item in mobile `MoreScreen` (`mobile/src/app/more.tsx`) to open the sanctuary modal.
  - Synchronized web `localStorage` and mobile `SecureStore` with the shared backend so changes on either client reflect seamlessly across platforms.
  - Added unit test suite `mobile/src/tests/companion.test.ts` verifying companion identities, attributes, positive reinforcement invariants, and growth stage calculations.

## [1.0.0] - 2026-11-05

### Added
- **Core Guidelines & Documentation**:
  - `AGENTS.md`: Persistent agent rules, tech stack constraints, and development instructions.
  - `docs/UI_UX_SPEC.md`: Screen-by-screen UX specifications, layout behaviors, and quiet motion philosophy.
  - `docs/DESIGN_SYSTEM.md`: Complete Ocean Teal-Blue tokens, DM Serif Display typography, 4px scale, and components.
  - `docs/FRONTEND_IMPLEMENTATION_PLAN.md`: Implementation stages checklist and tracking.
  - `docs/EXISTING_ARCHITECTURE.md`: Monorepo structure, API routing, auth flow, and technical audit.
  - `docs/DATABASE_SCHEMA.md`: Existing MongoDB models documentation.
- **Ocean Teal Design System & Primitives**:
  - Imported **DM Serif Display** for editorial headings and **Inter** for UI controls.
  - Configured Ocean Teal-Blue palette (`#087E83` light, `#35B8B2` dark) with earthen neutrals (`#F5F7F5`, `#101C20`).
  - Added reusable UI primitives in `client/src/components/ui/` (`Button`, `Card`, `Badge`, `Input`, `Modal`, `EmptyState`, `UrgencyTag`).
  - Quiet Motion animation system (`animate-fade-in`, `animate-scale-in`, `animate-companion-breathe`, `animate-slide-in-right`).
- **Adaptive Navigation**:
  - Desktop collapsible sidebar (`client/src/components/Sidebar.tsx`) from 256px to 80px.
  - Fixed mobile bottom navigation bar (`client/src/components/MobileBottomNav.tsx`) with center quick-create floating action button and "More" drawer.
  - Mobile top header with logo, theme toggle, and profile shortcut.
- **Guided Onboarding Experience**:
  - 6-step guided walkthrough (`client/src/components/onboarding/OnboardingModal.tsx`): Welcome, Preferences, Categories, LifeBuddy Adoption, Dashboard Preset, Complete Setup.
- **Editorial & Customizable Dashboard**:
  - Editorial greeting ("Good morning, [Name]. Let's make today a little more organised.").
  - Ambient status overview cards (Overdue, Due Soon, Upcoming, Reminders).
  - High-priority Needs Attention widget with color-coded urgency indicators.
  - Customization drawer: reorder widgets, toggle visibility, and apply presets (Balanced, Focus, Finance).
- **LifeBuddy Virtual Companion Sanctuary**:
  - Original starter collection in `client/src/lib/companions.ts`:
    - *Aura* (The Celestial Luminary)
    - *Mossy* (The Verdant Sprout)
    - *Nori* (The Tide Hopper)
    - *Zephyr* (The Cloudling)
  - Dedicated sanctuary page (`/lifebuddy`) with companion adoption, custom naming, and lore inspector.
  - Soft 3D clay aesthetic SVG illustrations with quiet idle breathing animations (`CompanionAvatar.tsx`).
  - Guilt-free growth mechanics driven by positive task completion and bill settlements.
- **Floating AI Assistant**:
  - Persistent floating trigger bubble with slide-out drawer on all screens (`FloatingAIAssistant.tsx`).
  - Suggested prompts, live conversational interface, and full `/ai` workspace linkage with demo mode support.
- **Main Modules Polish**:
  - **Tasks**: Dual List and Kanban Board views, status toggling, category and priority filters, inline create/edit.
  - **Bills & Payments**: Financial summary cards in ₹ (INR), status filters (Pending, Overdue, Paid), recurrence badges.
  - **Calendar**: Unified aggregated schedule connecting tasks, bills, appointments, reminders, and manual events.
  - **Appointments**: Dedicated appointment records management, venue/contact details, distinct from calendar.
  - **Documents**: Document vault with AI metadata extraction (provider, dates, amounts in INR) and entity conversion.
  - **Reminders**: Timeline alerts, active/completed filters, and quick acknowledge actions.
  - **Settings**: Profile management, theme selection (Light, Dark, System), category manager, and full JSON data backup export.
- **Explore LifeAdmin as Guest / Demo Mode**:
  - Instant guest access via "Explore LifeAdmin as Guest" button on the login screen.
  - Ephemeral user creation (`POST /api/auth/guest`) and 2-hour JWT token using standard authentication architecture.
  - Rich sample data seeding (`server/src/utils/demoSeed.ts`) for all 7 modules: tasks, bills (₹), appointments, reminders, calendar events, documents, and LifeBuddy (Level 3 'Bloom' Aura).
  - Complete data isolation scoped to temporary user accounts with zero impact on real users.
  - Sticky Guest Demo notice banner (`AppLayout.tsx`) with "Save Your LifeAdmin" link and one-click "Exit Demo" action.
  - Automatic cleanup route (`DELETE /api/auth/guest`) purging ephemeral demo records from all MongoDB collections upon exit.
- **Ocean Teal Colour Refinement**:
  - Re-calibrated the dark theme from near-black/forest teal (`#101C20`) to a fresh, brighter coastal ocean teal palette: background `#285D63`, card surface `#34747A`, elevated surfaces `#459198`, primary accent `#69BDB7`, crisp white headings `#FFFFFF`, and clear seafoam secondary text `#D1E8E5`.
  - Refined light theme tokens: fresh coastal background `#E7F3F1`, soft teal `#D3EAE7`, crisp ocean ink main text `#183B3D`, secondary text `#587477`, primary brand `#168F91`, and subtle borders `#D0E2DF`.
  - Harmonized functional urgency colors for overdue, urgent, and due-soon badges to contrast cleanly on both light and dark teal surfaces.
  - Updated companion aura palette and calendar event seeds to match the coastal turquoise identity.
- **Visual Quality Audit & Dashboard Refinement**:
  - **Fixed Theme Contrast**: Resolved root-cause dark mode invisibility issue where surface tokens were inadvertently inverted into near-black colors under `.dark`. Redefined semantic dark tokens (`--color-surface-100` through `400` as bright, high-contrast text and `700` through `900` as dark surfaces/borders).
  - **Elevated Light Theme Contrast**: Re-calibrated light text tokens (`--color-surface-400`, `--color-surface-500`, `--text-muted`) to ensure all secondary and caption text achieves WCAG AA compliant contrast (> 4.5:1) against light surfaces.
  - **Replaced Transparent Opacity Overrides**: Replaced washed-out `dark:border-surface-400/30` with solid `dark:border-surface-700` (`#304346`) across all cards, panels, and sidebars.
  - **Metric Numbers Prominence**: Replaced serif digits with bold tabular sans-serif digits for prominent, modern visual hierarchy.
  - **Polished Sidebar**: Enhanced LifeAdmin workspace brand header, active route pill styling with glowing Ocean Teal accents, and clear user profile badges.
  - **Refined Guest Demo Banner**: Replaced intrusive heavy orange gradient with a sophisticated amber-accented notice bar seamlessly integrated with the app header.
  - **Instant Theme Switching & System Preference Listener**: Added `localStorage` theme caching and OS `prefers-color-scheme` event listeners to prevent initial white flash and guarantee persistent user theme selection.

### Changed
- Reconciled outdated requirements in `product.md`, `customer.md`, `LifeAdmin_Antigravity_Spec.md`, and `README.md`:
  - Deprecated paid subscription tiers in favor of a 100% Free Product for everyone.
  - Replaced indigo color scheme with Ocean Teal-Blue branding.
  - Eliminated mock subscription upsells in `SettingsPage.tsx` and replaced them with the LifeAdmin Universal Access Promise.
