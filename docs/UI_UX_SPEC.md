# LifeAdmin — UI/UX Specification

## 1. Product Design Philosophy
LifeAdmin is an **Editorial + Modern Productivity SaaS** application.
Tagline: *"Your life, organised. Your mind, uncluttered."*

### Core Attributes
- **Calm**: Reduces cognitive load through whitespace, measured contrast, and muted secondary tones.
- **Intelligent**: Automatically surfaces what requires immediate attention without overwhelming the user.
- **Personal**: Feels like a warm personal workspace rather than an austere corporate admin panel.
- **Trustworthy**: Secure handling of personal documents, finances, and sensitive life events.
- **Quiet Motion**: Fluid, intentional animations that provide feedback without drawing undue attention.

---

## 2. Global Navigation & Adaptive Layout

### Breakpoints
- **Mobile**: `< 768px` (tested at 375px and 390px)
- **Tablet**: `768px – 1023px` (compact or collapsible sidebar)
- **Desktop**: `1024px – 1439px` (collapsible full sidebar)
- **Wide Desktop**: `>= 1440px` (maximum content readability width: `1280px` centered)

### Navigation Modes
1. **Desktop (`>= 1024px`)**:
   - Left vertical sidebar (collapsible between 288px and 80px).
   - Top brand header with subtle logo and collapse toggle.
   - Core links:
     1. Dashboard / Overview
     2. My Tasks
     3. Calendar
     4. Bills & Payments
     5. Appointments
     6. Documents
     7. Reminders
     8. LifeBuddy
     9. AI Assistant
   - Quick "Create (+)" dropdown menu.
   - User profile summary, theme switcher (Light / Dark / System), and sign-out at bottom.
2. **Tablet (`768px – 1023px`)**:
   - Sidebar renders in compact icon mode (80px) with expandable flyouts or slide-over drawer on hamburger click.
3. **Mobile (`< 768px`)**:
   - Top app bar: Minimal header with LifeAdmin brand mark, notifications bell, and avatar button.
   - Bottom navigation bar (fixed, backdrop blur):
     - Overview (Dashboard)
     - Tasks
     - Quick Create (+) Action Button (elevated floating center button)
     - Calendar
     - More (Drawer menu containing Bills, Documents, Appointments, Reminders, LifeBuddy, Settings)
   - Bottom sheets for modals and quick create actions.

---

## 3. Screen-by-Screen Specifications

### 3.1 Authentication (Login & Register)
- **Visual Style**: Clean split layout or centered editorial card with soft teal ambient glow.
- **Headline**: DM Serif Display typography (*"Welcome back"* / *"Create your personal workspace"*).
- **Form Controls**:
  - High-clarity inputs with floating/clear labels, password visibility toggles, autofocus, and field validations.
  - Error states with accessible inline alerts.
  - Seamless redirection between login and registration.

### 3.2 Guided Onboarding Flow
A skippable 6-step guided walkthrough for first-time signups:
1. **Welcome**: Warm introduction to LifeAdmin's philosophy.
2. **Personal Preferences**: Name pronunciation, default alert timings, quiet hours.
3. **Select LifeAdmin Categories**: Choose active domains (e.g. Academic, Career, Home & Rent, Health & Fitness, Personal Finance).
4. **Choose LifeBuddy Companion**: Introduce the starter companion collection. Users adopt and name their companion.
5. **Select Dashboard Preset**: Choose layout preference (e.g. "Focus Mode", "Financial & Deadlines", "Balanced Overview").
6. **Complete Setup**: Animated transition leading directly into the tailored dashboard with sample orientation items.

### 3.3 Dashboard (The Heart of LifeAdmin)
The primary screen designed to answer: *"What needs my attention next?"*
- **Greeting Banner**:
  - Editorial headline: *"Good morning, [Name]."*
  - Subheading: *"Let's make today a little more organised."*
  - Ambient summary chips (e.g. `2 urgent deadlines`, `1 bill due tomorrow`).
- **Needs Attention Widget**:
  - Top priority container with distinct visual urgency indicators (overdue in muted crimson, due today in amber, due soon in soft teal).
  - Quick inline actions (e.g., Mark Done, Snooze, Pay, View Details).
- **Customizable Widget Matrix**:
  - **Today's Schedule & Appointments**: Integrated timeline.
  - **Upcoming Tasks**: Filtered by urgency and priority.
  - **Upcoming Bills**: Clear amounts in ₹ (INR), due dates, and recurrence badges.
  - **Active Reminders**: Snooze and dismiss triggers.
  - **LifeBuddy Widget**: Interactive card displaying companion avatar, mood, level, and growth progress bar.
  - **AI Daily Briefing**: Smart insights on workload distribution and potential conflicts.
- **Customization Toolbar**:
  - "Customize Dashboard" toggle:
    - Drag & drop or reorder widgets via up/down controls.
    - Toggle visibility of individual modules.
    - Presets: Standard, Focus (Tasks & Deadlines), Financial (Bills & Renewals).
    - "Reset to Default" button.

### 3.4 Tasks Module
- **Dual Views**: Tabbed switch between **List View** and **Board / Kanban View** (To Do, In Progress, Completed).
- **Task Creation & Editing**: Title, notes/description, due date, time, priority (Low, Medium, High, Urgent), category tags, recurrence rule, subtasks checklist.
- **Quick Completion**: Single-click checkbox with subtle micro-bounce animation.
- **Filters & Search**: Filter by status, priority, category, and date range. Instant client-side search.

### 3.5 Calendar Module
- **Distinction from Appointments**: Calendar provides an aggregated, bird's-eye schedule combining dated Tasks, Bills, Appointments, Reminders, and manual events.
- **View Options**: Month, Week, Day, and Agenda list views.
- **Event Chip System**: Color-coded by entity type with icon indicators.
- **Day Inspector**: Clicking any day opens an expanded day view showing chronological items and quick addition.

### 3.6 Bills & Payments Module
- **Currency-Aware Display**: Formatted in ₹ (INR) by default, supporting multi-currency.
- **Financial Status Segments**: Upcoming, Overdue, Paid, and Recurring subscriptions.
- **Metrics Summary**: Total due this month, total paid, upcoming next 7 days.
- **Recurrence Support**: Flexible interval model (e.g. Monthly, Bi-weekly, Annual, Custom duration).
- **Receipt / Attachment Preview**: Link to related payment receipts or invoice documents.

### 3.7 Appointments Module
- **Dedicated Record Management**: Detailed appointment profiles including venue/link, contact person/doctor, organization, preparations notes, and attached documents.
- **Pre-appointment Reminders**: Configurable alerts (e.g. 1 day before, 2 hours before).

### 3.8 Documents Module
- **Secure File Storage**: Grid and list views of uploaded receipts, IDs, contracts, policies, and health records.
- **File Metadata & AI Extraction**: Preview panel displaying AI-extracted details (provider, expiry dates, renewal dates, identifiers, summaries).
- **Expiry Alerts**: Highlighting documents with approaching expiration (e.g. Passport, Lease, Insurance).
- **Search & Tagging**: Instant search by file name, document category, or tags.

### 3.9 Reminders Module
- **Timeline & Categories**: Active reminders chronologically sorted.
- **Snooze & Complete**: Actionable controls to acknowledge or defer reminders.
- **Honest Notifications**: Transparent browser/in-app alerts without deceptive push claims.

### 3.10 LifeBuddy Companion Collection
- **Concept**: A gentle, delightful personal companion that grows alongside the user's productivity.
- **Philosophy**: Positive reinforcement only. Companions never get sick, die, become unhappy, or penalize the user for taking a break.
- **Companion Roster**:
  - *Aura* (The Celestial Luminary - Elemental spirit)
  - *Mossy* (The Verdant Sprout - Forest nature spirit)
  - *Nori* (The Tide Hopper - Playful aquatic guardian)
  - *Zephyr* (The Cloudling - Gentle sky beast)
- **Collection Hub**: Companion gallery, companion detail drawer, active companion switcher, name customizer, growth history ledger.
- **Growth XP Mechanics**: Progress generated organically from completing tasks, clearing bills, and staying organized.

### 3.11 AI Assistant Interface
- **Floating Entry Point**: Persistent floating trigger button at bottom-right corner with subtle pulse glow.
- **Slide-Out Assistant Drawer**: Fast conversational side-panel accessible from any screen without losing context.
- **Dedicated Page (`/ai`)**: Full-screen workspace with dedicated tabs:
  1. *Chat Assistant*: Context-aware querying of upcoming obligations.
  2. *Plan My Day / Week*: Intelligent plan generator based on pending tasks and calendar openings.
  3. *Extract Responsibilities*: Paste raw unstructured text (emails, syllabus, notices) to auto-detect deadlines, tasks, and bills.
- **Demo / Fallback State**: Graceful messaging and illustrative example prompts if Gemini API key is unconfigured.

### 3.12 Settings & Profile
- **Personal Information**: Name, email, avatar initial or photo.
- **Appearance**: Theme selection (Light, Dark, System Match).
- **Categories Manager**: Add, edit, or color-code life categories.
- **Data Export & Privacy**: Clean controls for data download and account management.

---

## 4. Interaction Patterns & "Quiet Motion"

### Timing Guidelines
- **Micro-interactions (Hover, Press, Checkbox)**: `120ms – 180ms` (cubic-bezier(0.4, 0, 0.2, 1)).
- **Standard UI Transitions (Drawers, Modals, Popovers)**: `180ms – 250ms`.
- **Page & View Transitions**: `250ms – 320ms`.

### Animation Standards
- Smooth card hover lift with subtle shadow tint (`translateY(-2px)`).
- Modal entrance with scale from 98% to 100% and opacity fade.
- Checkbox success ripple with soft teal fill.
- Respect `prefers-reduced-motion` at all times.

---

## 5. Accessibility (a11y)
- **Target**: WCAG 2.1 Level AA compliance.
- **Color Contrast**: Minimum 4.5:1 for body copy; 3:1 for large headers and actionable icons.
- **Keyboard Navigation**: Comprehensive focus rings with `:focus-visible` styling (`ring-2 ring-primary-500/50`).
- **ARIA Standards**: Dialogs, dropdowns, and tablists equipped with proper roles, `aria-expanded`, and descriptive labels.

