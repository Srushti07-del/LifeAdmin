# LifeAdmin — Antigravity Product & Implementation Specification

## 1. Project Overview

**LifeAdmin** is a personal life-management platform for **college students and young professionals**.

Its purpose is to centralize everyday administrative responsibilities—deadlines, tasks, bills, appointments, documents, reminders, and recurring responsibilities—into one clear system.

### Core promise

> **Tell the user what needs their attention next.**

The most important outcome for V1 is that when a user opens LifeAdmin, they can immediately understand **which responsibilities/events have deadlines and require attention**, without searching across multiple apps.

---

# 2. Target Users

### V1 target
- College students
- Young professionals

The product should not feel like a student-only application. It should work naturally for both audiences.

### Future
- Families / household accounts

The architecture should allow future household/member functionality without requiring family features in the V1 UI.

---

# 3. V1 Modules

The following modules are part of V1:

1. Dashboard
2. Tasks
3. Bills
4. Appointments
5. Documents
6. Reminders
7. AI Assistant
8. Calendar
9. Profile / Settings
10. Authentication
11. Pricing / subscription functionality

Do not remove these from the V1 scope unless a later product decision explicitly changes it.

---

# 4. Core Product Principle

LifeAdmin should answer:

> **"What needs my attention?"**

The dashboard should prioritize responsibilities based on urgency rather than simply displaying everything chronologically.

The user should see:

### First: Deadlines / Needs Attention

Examples:
- Electricity bill — due tomorrow
- Assignment — due in 2 days
- Insurance renewal — approaching
- Document expiry — approaching

### Second: Upcoming Events

Examples:
- Doctor appointment — Saturday
- Meeting — Monday
- Exam — next week

The distinction between **deadlines requiring action** and **upcoming events** is important.

---

# 5. Dashboard

The dashboard is the primary screen and the most important V1 feature.

Example structure:

```text
Good morning, [Name] 👋

Here's what needs your attention.

NEEDS ATTENTION
────────────────────────
🔴 Electricity bill
   ₹1,450 · Due tomorrow

🟠 Assignment submission
   Due in 2 days

🟠 Insurance renewal
   Due in 8 days


UPCOMING
────────────────────────
📅 Doctor appointment
   Saturday · 11:00 AM

📅 College event
   Monday · 4:00 PM


QUICK ACTIONS
────────────────────────
+ Create
```

### Dashboard requirements

- Deadlines appear before upcoming events.
- Urgency should be visually understandable.
- The interface should not become cluttered.
- Users should be able to quickly open/edit an item.
- Quick creation must be accessible.
- AI-generated insights can appear when useful, but AI should not dominate the dashboard.
- The dashboard should prioritize attention intelligently.

---

# 6. Tasks

V1 tasks should remain **simple**.

A task should support at minimum:

- Title
- Description/notes
- Due date
- Due time (if applicable)
- Priority
- Status
- Category
- Reminder
- Optional attachment

Do not over-engineer task management with unnecessary project-management features.

Possible task statuses:

```text
To Do
In Progress
Completed
```

---

# 7. Bills & Payments

Bills are not restricted to a fixed monthly pattern.

The system must support flexible durations and recurrence.

Examples:

- Rent every 2 months
- Gym membership for 1 month
- Gym membership for 6 months
- Gym membership for 1 year
- Annual insurance
- Monthly electricity
- Custom payment schedules

Therefore, avoid assuming:

> "Recurring = monthly"

### Bill data should support

- Name
- Provider
- Amount
- Due date
- Payment status
- Category
- Start date
- End/end date when applicable
- Recurrence interval
- Custom recurrence
- Reminder settings
- Notes
- Optional document/receipt

The recurrence system should be flexible enough to represent different real-world billing/membership periods.

---

# 8. Documents

V1 should use **smart document management**.

When a user uploads a document, LifeAdmin should use OCR/AI where appropriate to understand the document and extract relevant information.

Example:

```text
Uploaded:
Insurance_Policy.pdf

Detected:
Document type: Insurance Policy
Provider: XYZ
Expiry date: 12 March 2027
Renewal period: 30 days before expiry
```

The system can then create or suggest a reminder.

### Document functionality

- Upload
- Preview
- Organize
- Search
- Metadata
- Expiry detection
- Important date extraction
- AI-assisted classification
- Link documents to tasks/bills/reminders when appropriate

Do not pretend AI extracted information if extraction has not actually happened.

---

# 9. AI Assistant

AI is part of V1.

The AI should have multiple useful responsibilities rather than being a decorative chatbot.

### V1 AI capabilities

#### A. Conversational assistant

Example:

> "What do I need to do this week?"

Response should summarize relevant deadlines, tasks, bills, appointments, and reminders.

#### B. AI information extraction

Example:

User uploads a bill.

AI extracts:

```text
Amount
Due date
Provider
Bill type
Relevant dates
```

#### C. AI planning assistance

Example:

> "I have three assignments and an exam next week."

AI can help organize the work into tasks/reminders.

#### D. Responsibility detection

AI can identify potentially actionable information from uploaded/entered content.

Example:

> "Your document appears to contain a renewal date of 15 October."

The system should distinguish **AI suggestions** from confirmed user-created data.

---

# 10. Smart Prioritization

LifeAdmin should prioritize what requires attention.

Priority can consider:

- Due date
- Time remaining
- Importance/priority set by user
- Overdue state
- Event type
- Recurrence
- Whether the user has already completed the responsibility

Do not make prioritization opaque.

The UI should explain urgency where useful:

> Due tomorrow

> Overdue by 2 days

> Renewal in 7 days

The system should not constantly nag the user.

---

# 11. Notifications

V1 should support **push notifications**.

Notifications should be **smart and user-controlled**.

The system must avoid notification spam.

### User controls

Users should be able to customize:

- Whether notifications are enabled
- Reminder timing
- Notification categories
- Quiet periods
- Frequency where appropriate

Example reminder schedule:

```text
7 days before
3 days before
1 day before
Due today
```

But this should be configurable.

### Important principle

Do NOT repeatedly push notifications every few days simply because an item exists.

Notifications should be based on:
- urgency
- user settings
- whether the item has already been acknowledged
- whether the item is still incomplete
- whether another reminder is actually useful

---

# 12. Recurring Responsibilities

Recurring responsibilities need a **flexible recurrence engine**.

Do not hard-code only:

```text
Daily
Weekly
Monthly
Yearly
```

Support custom durations/intervals where practical.

Examples:

```text
Every 2 months
Every 6 months
Every year
For 6 months
Until a specific date
Custom interval
```

Separate these concepts:

### Recurrence
How often something repeats.

### Duration
How long a subscription/membership/payment arrangement lasts.

These are not necessarily the same thing.

---

# 13. Calendar

LifeAdmin should have its **own internal calendar in V1**.

It should show relevant:

- Appointments
- Tasks with dates
- Deadlines
- Bills
- Reminders
- Other scheduled events

### Future

Google Calendar integration can be added later.

Do not make Google Calendar integration a V1 dependency.

---

# 14. Create System

The sidebar should contain a prominent **Create** option.

Example:

```text
+ Create
```

Clicking it should provide quick creation options:

```text
Create
├── Task
├── Bill
├── Appointment
├── Reminder
├── Document
└── Event
```

The exact taxonomy can be refined during UI implementation.

Creation should be fast and accessible from the dashboard as well.

---

# 15. Navigation

Use a sidebar-based application layout.

Suggested navigation:

```text
LifeAdmin

Dashboard

Tasks
Bills
Appointments
Documents
Reminders
Calendar
AI Assistant

────────────

+ Create

────────────

Profile
Settings
```

The sidebar should be:

- Easy to understand
- Responsive
- Not overcrowded
- Consistent across the application

---

# 16. UI / UX Direction

The UI should be:

- Interactive
- Modern
- Easy to navigate
- Visually interesting
- Clean
- Personal
- Responsive
- Not cluttered

### Explicitly avoid

- Generic SaaS template appearance
- Excessive cards everywhere
- Excessive gradients
- Boring static dashboards
- Unnecessary animations
- Dense information overload
- Decorative UI with no purpose

The product should feel like a **personal administrative assistant**, not another generic project-management SaaS.

### Theme

Support both:

- Light mode
- Dark mode

Theme switching should be integrated into the application rather than treated as a later add-on.

---

# 17. Authentication

V1 authentication:

- Email + password
- Google authentication

Authentication should be implemented properly rather than mocked.

---

# 18. Profile & Settings

Profile/settings should support at least:

- Name
- Profile picture
- Email
- Notification preferences
- Default reminder preferences
- Theme
- Categories/preferences
- AI preferences where applicable
- Account management

---

# 19. Security & Privacy

V1 should use a **serious security approach**.

Requirements include:

- Secure authentication
- Password hashing
- Protected API endpoints
- Authorization checks
- Secure document access
- Secure file storage
- Encrypted sensitive data where appropriate
- Secure API communication
- User-controlled data deletion
- Minimal data collection
- Proper session/token handling

Do not expose one user's personal documents/data to another user.

---

# 20. Monetization

Pricing functionality should be implemented in V1.

Business model direction:

### Free / Freemium
Basic life-management functionality.

### Premium
Advanced functionality.

### Premium AI
Advanced AI capabilities.

### Future
Institutional/college partnerships.

The exact pricing amounts and limits are still a product decision and should remain configurable rather than hard-coded throughout the application.

---

# 21. Family / Household Architecture

Family functionality is **not a V1 UI feature**.

However, the backend/data architecture should avoid making future household support impossible.

Potential future model:

```text
User
  ↓
Household
  ↓
Members
```

Do not build the full family system now unless required by another feature.

---

# 22. Landing Page

Decision: **UNRESOLVED**

A marketing landing page has not yet been decided.

Do not spend major implementation effort on a complex marketing site before the core product is functional.

If a landing page is created, keep it minimal and focused on:

- What LifeAdmin is
- Why it exists
- Key benefits
- Sign up / Login

This decision can be revisited.

---

# 23. Technical Direction

Current preferred stack:

### Frontend

- React
- TypeScript
- Tailwind CSS

### Backend

- Node.js
- Express.js

### Database

- MongoDB

### AI

- External AI/LLM API

### Authentication

- Email/password
- Google OAuth

However, the implementation team/Antigravity may recommend a different architecture if there is a clear technical reason.

### Architecture principle

Prefer a clean, maintainable architecture over blindly following the proposed stack.

---

# 24. Core Data Entities

At minimum, the backend should be designed around entities such as:

```text
User

Task
Bill
Appointment
Document
Reminder
CalendarEvent

AIInteraction
Notification
Subscription
```

Potential future entities:

```text
Household
HouseholdMember
Integration
AuditLog
```

Relationships should be designed so every personal object is securely associated with the correct user.

---

# 25. AI Data Safety

AI should not silently modify important user data.

Use a distinction between:

### Confirmed data

Information explicitly entered or confirmed by the user.

### AI suggestion

Information inferred/extracted by AI that still requires user confirmation where appropriate.

Example:

```text
AI detected:

Insurance renewal:
15 October 2026

[Confirm] [Edit] [Dismiss]
```

This is preferable to silently creating a potentially incorrect deadline.

---

# 26. V1 Success Criteria

The central success criterion is:

> When the user opens LifeAdmin, they immediately understand what responsibilities/events have deadlines and what needs attention.

A successful experience should make it easy to answer:

1. What is overdue?
2. What is due soon?
3. What is coming up?
4. What do I need to do?
5. What can I create quickly?
6. What information/documents are associated with those responsibilities?

---

# 27. Things NOT to Build as Unnecessary Complexity

Avoid:

- Fake AI functionality
- Dummy buttons with no purpose
- Placeholder functionality presented as real
- Excessive animations
- Unnecessary analytics
- Social networking features
- User-to-user chat
- Complex admin panel unless required
- Unnecessary project-management functionality
- Google Calendar integration in V1
- Full family management in V1
- Mobile application as a separate project before the web product is stable

Every visible feature should have a real purpose.

---

# 28. Product Design Principle

LifeAdmin should not try to become a collection of every productivity feature imaginable.

The product should stay focused:

> **Capture → Understand → Prioritize → Remind → Act**

A user should be able to enter or upload information, have LifeAdmin understand the important dates/responsibilities, prioritize them, remind the user intelligently, and help them act.

---

# 29. Business Model Canvas Reference

The provided Business Model Canvas establishes the broader business direction:

### Key Partners
- Colleges & universities
- Cloud/AI service providers
- Payment providers
- Student organizations
- Technology/integration partners

### Key Activities
- Platform development
- Deadline detection
- Task/reminder management
- Platform maintenance
- AI accuracy improvement
- Data security/privacy
- Customer support

### Value Proposition
- One platform for everyday administrative tasks
- Automatic detection of deadlines/tasks
- Smart reminders
- Document/task organization
- Reduced missed deadlines
- Reduced time and mental effort

### Customer Relationships
- Personalized dashboard
- Notifications/reminders
- AI assistance
- Smart recommendations
- Customer support
- Feedback system

### Channels
- Web/mobile application
- College partnerships
- Student communities
- Social media
- Referrals

### Customer Segments
- College students
- Young professionals
- Individuals with multiple obligations
- Families as future expansion

### Cost Structure
- Development
- AI/API costs
- Cloud hosting
- Database/storage
- Security/maintenance
- Marketing/support

### Revenue Streams
- Freemium
- Premium subscriptions
- Premium AI features
- Advanced automation/reminders
- Institutional/college partnerships

---

# 30. Antigravity Implementation Instruction

Build LifeAdmin as a **real, functional product**, not a static UI mockup.

Before implementing:

1. Inspect the complete existing codebase if one exists.
2. Identify existing functionality that can be reused.
3. Identify dead/placeholder UI.
4. Preserve useful future-facing architecture.
5. Remove UI that has no current or future purpose.
6. Establish the data model.
7. Establish authentication and authorization.
8. Build the core user flows.
9. Implement the dashboard around deadlines/attention.
10. Implement each V1 module.
11. Implement smart reminders.
12. Implement the internal calendar.
13. Implement AI features progressively.
14. Implement pricing/subscription architecture.
15. Test cross-module relationships.
16. Test security boundaries.
17. Test responsive behavior.
18. Do not create fake functionality merely to make the UI look complete.

### Build philosophy

**Functionality first → usability second → visual polish third → advanced intelligence fourth.**

Do not add a feature simply because it looks impressive.

Every feature should answer:

> **"Does this help the user manage their life responsibilities?"**

---

# 31. Unresolved Decisions

These should NOT be silently invented:

1. Exact pricing plans and prices
2. Exact AI provider/model
3. Exact notification infrastructure
4. Exact document storage provider
5. Final landing-page scope
6. Final visual design system
7. Final deployment architecture
8. Exact free vs premium feature limits

Antigravity should use sensible temporary architecture/configuration where necessary and clearly isolate these decisions so they can be changed later.

---

# 32. Product North Star

### LifeAdmin

> **Less chaos. More life.**

The product should reduce the user's mental effort by turning scattered responsibilities into one clear, prioritized view of what needs attention.
