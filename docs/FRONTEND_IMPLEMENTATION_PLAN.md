# LifeAdmin — Frontend Implementation Plan

## Overview
This document outlines the phased plan to transform LifeAdmin's existing UI/UX into an editorial, modern productivity platform with an Ocean Teal design system, adaptive navigation, customisable dashboard, LifeBuddy virtual companions, and floating AI assistant.

---

## Stage Progress Checklist

- [x] **Stage 0: Repository Audit & Documentation**
  - [x] Inspect existing frontend, backend, shared models, and specifications
  - [x] Generate persistent development instructions (`AGENTS.md`)
  - [x] Author comprehensive UI/UX spec (`docs/UI_UX_SPEC.md`)
  - [x] Author design system spec (`docs/DESIGN_SYSTEM.md`)
  - [x] Author existing architecture documentation (`docs/EXISTING_ARCHITECTURE.md`)
  - [x] Author database schema documentation (`docs/DATABASE_SCHEMA.md`)
  - [x] Update product specifications (`product.md`, `customer.md`, `LifeAdmin_Antigravity_Spec.md`, `README.md`)
  - [x] Initialize changelog (`docs/CHANGELOG.md`)

- [x] **Stage 1: Design System & Application Shell**
  - [x] Implement Ocean Teal semantic CSS tokens & Google Fonts (DM Serif Display, Inter) in `client/src/index.css`
  - [x] Build core reusable UI primitives (Card, Button, Badge, Modal, Input, EmptyState, UrgencyTag)
  - [x] Redesign `Sidebar.tsx` with collapsible states and new primary navigation
  - [x] Implement adaptive navigation (desktop collapsible sidebar, tablet compact drawer, mobile bottom navigation bar)
  - [x] Update `AppLayout.tsx` with persistent Floating AI Assistant trigger and quick-action menu

- [x] **Stage 2: Authentication & Guided Onboarding**
  - [x] Redesign `LoginPage.tsx` with editorial typography and high-clarity form controls
  - [x] Redesign `RegisterPage.tsx` with clean onboarding transition
  - [x] Create 6-step guided onboarding flow (`client/src/components/onboarding/OnboardingModal.tsx`):
    1. Welcome
    2. Preferences
    3. Category selection
    4. LifeBuddy companion adoption
    5. Dashboard preset selection
    6. Complete setup

- [x] **Stage 3: Dashboard Redesign & Customization**
  - [x] Redesign `DashboardPage.tsx` with editorial greeting and quiet motion transitions
  - [x] Create modular dashboard widgets:
    - `NeedsAttentionWidget` (critical overdue and due soon responsibilities)
    - `TodayScheduleWidget` (integrated day view)
    - `TasksWidget` (urgent tasks with quick complete)
    - `BillsWidget` (upcoming bills in INR with recurrence chips)
    - `RemindersWidget` (active alerts)
    - `LifeBuddyWidget` (active companion status, avatar, growth bar)
    - `AIBriefingWidget` (AI productivity tips)
  - [x] Implement dashboard customization engine (reordering, toggle visibility, presets: Standard, Focus, Finance, Reset to Default)

- [x] **Stage 4: Main Modules Polish**
  - [x] Redesign `TasksPage.tsx`: List and Kanban Board views, filter by priority/status/category, inline create/edit
  - [x] Redesign `CalendarPage.tsx`: Month, Week, Day, Agenda views, clear color coding by entity type
  - [x] Redesign `BillsPage.tsx`: Monthly metrics in INR (₹), upcoming, overdue, paid status, recurrence intervals
  - [x] Redesign `AppointmentsPage.tsx`: Detailed appointment cards, venue/contact details, distinct from calendar
  - [x] Redesign `DocumentsPage.tsx`: Secure document vault, category filtering, expiry alerts, AI extraction preview
  - [x] Redesign `RemindersPage.tsx`: Notification history, timeline view, snooze/complete actions

- [x] **Stage 5: LifeBuddy Companion Collection**
  - [x] Author companion catalog dataset (`client/src/lib/companions.ts`) featuring:
    - *Aura* (The Celestial Luminary)
    - *Mossy* (The Verdant Sprout)
    - *Nori* (The Tide Hopper)
    - *Zephyr* (The Cloudling)
  - [x] Build high-fidelity SVG/Canvas stylised 3D-aesthetic companion illustrations with quiet idle breathing
  - [x] Create dedicated LifeBuddy gallery page (`client/src/pages/LifeBuddyPage.tsx`)
  - [x] Implement companion detail modal, name customization, active companion switching, and activity XP growth tracker

- [x] **Stage 6: Floating AI Assistant & Settings**
  - [x] Build floating AI assistant trigger button & expandable drawer (`FloatingAIAssistant.tsx`)
  - [x] Connect existing `/api/ai` endpoints with demo fallback state for unconfigured Gemini keys
  - [x] Polish full-page AI workspace (`client/src/pages/AIAssistantPage.tsx`)
  - [x] Redesign `SettingsPage.tsx`: Profile, theme toggle, categories editor, data privacy

- [x] **Stage 7: Testing, Responsive Verification & Polish**
  - [x] Verify frontend build: `npm run client:build`
  - [x] Verify backend build: `npm run server:build`
  - [x] Responsive testing across 375px, 390px, 768px, 1024px, 1440px
  - [x] Theme testing: Light, Dark, System
  - [x] WCAG 2.1 AA accessibility & reduced motion testing
  - [x] Update changelog and final documentation
