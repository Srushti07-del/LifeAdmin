# LifeAdmin — Existing Architecture Audit

## 1. Project Organization
The LifeAdmin repository is structured as a TypeScript full-stack monorepo:

```text
LifeAdmin/
├── client/                 # Frontend SPA (React 19, Vite, Tailwind CSS 4)
│   ├── src/
│   │   ├── assets/         # Static images & graphics
│   │   ├── components/     # Layout & UI components (AppLayout, Sidebar)
│   │   ├── contexts/       # React Contexts (AuthContext)
│   │   ├── lib/            # Utilities & Axios API client
│   │   ├── pages/          # Feature views (Dashboard, Tasks, Bills, etc.)
│   │   ├── App.tsx         # Route definitions & protected route guards
│   │   ├── index.css       # Tailwind v4 configuration & base tokens
│   │   └── main.tsx        # React entry point
├── server/                 # Backend REST API (Node.js, Express, Mongoose)
│   ├── src/
│   │   ├── config/         # Environment & MongoDB connection
│   │   ├── middleware/     # JWT authentication middleware
│   │   ├── models/         # Mongoose schemas (Task, Bill, User, etc.)
│   │   ├── routes/         # Express endpoint handlers
│   │   └── index.ts        # App setup, security, & server bootstrap
├── shared/                 # Shared TypeScript models
│   └── types.ts            # Common contracts (Priority, Recurrence, UserSummary)
└── docs/                   # Architectural & product specifications
```

---

## 2. Frontend Architecture
- **Framework**: React 19 with Vite.
- **Routing**: `react-router-dom` v7. Protected route wrappers (`ProtectedRoute`, `PublicOnlyRoute`) conditionally mount views based on JWT token presence.
- **State Management**:
  - `AuthContext`: Manages logged-in user details, active token in `localStorage` (`lifeadmin_token`), theme switching (`light`, `dark`, `system`), and authentication actions (`login`, `register`, `logout`, `updateUser`).
  - Local state in page components (`useState`, `useEffect`) fetching directly through `/lib/api`.
- **API Client**: Axios instance configured with base URL `/api`, automated `Bearer` token attachment via request interceptors, and 401 response handling redirection.
- **Styling**: Tailwind CSS v4 using `@import "tailwindcss"` and `@theme` blocks inside `client/src/index.css`.

---

## 3. Backend Architecture
- **Framework**: Express 5 on Node.js with TypeScript (`tsx` in dev, `tsc` for production build).
- **Database**: MongoDB via Mongoose 9. Includes an optional memory server fallback for isolated testing.
- **Security & Reliability**:
  - `helmet`: HTTP header hardening.
  - `cors`: Restricted to configured `CLIENT_URL`.
  - `express-rate-limit`: Rate limiting applied across `/api/*`.
  - `bcryptjs`: 12-round salted password hashing.
  - `jsonwebtoken`: Bearer token authorization verified through `authenticate` middleware.

---

## 4. API Endpoints Map

| Route Prefix | Handlers | Purpose |
| :--- | :--- | :--- |
| `/api/auth` | `POST /register`, `POST /login`, `GET /me` | Authentication and user session validation |
| `/api/dashboard` | `GET /` | Aggregated priority view (`needsAttention`, `upcoming`, stats) |
| `/api/tasks` | `GET /`, `POST /`, `PUT /:id`, `DELETE /:id`, `PATCH /:id/status` | Task CRUD, status toggling, category filtering |
| `/api/bills` | `GET /`, `POST /`, `PUT /:id`, `DELETE /:id`, `PATCH /:id/status` | Bill and subscription tracking, recurrence periods |
| `/api/appointments` | `GET /`, `POST /`, `PUT /:id`, `DELETE /:id` | Appointment profile and schedule management |
| `/api/reminders` | `GET /`, `POST /`, `PUT /:id`, `DELETE /:id`, `PATCH /:id/status` | Standalone reminders and notification triggers |
| `/api/documents` | `GET /`, `POST /upload`, `GET /:id`, `DELETE /:id` | Secure document uploads via Multer and metadata indexing |
| `/api/calendar` | `GET /`, `POST /`, `PUT /:id`, `DELETE /:id` | Unified chronological view of events, tasks, and bills |
| `/api/ai` | `POST /chat`, `POST /plan`, `POST /detect`, `POST /confirm` | Google Generative AI integration for life admin tasks |
| `/api/notifications` | `GET /`, `PATCH /:id/read`, `PATCH /read-all` | In-app alerts and notifications |
| `/api/users` | `GET /profile`, `PUT /profile`, `PUT /preferences`, `DELETE /account` | User settings, categories, and account lifecycle |

---

## 5. Technical Findings & Current Limitations
1. **Design System Disconnect**: The current `index.css` is still configured with an indigo theme (`#6366f1`) and generic styles instead of the approved Ocean Teal palette (`#087E83`, `#35B8B2`) and DM Serif typography.
2. **Missing Adaptive Navigation**: Current `Sidebar.tsx` has a basic desktop toggle and mobile overlay, but lacks tablet-responsive behavior, proper bottom navigation on mobile, and the new navigation items (LifeBuddy, dedicated profile/theme controls).
3. **No Onboarding Flow**: New users registering are dumped straight onto an empty dashboard without preference setup or companion selection.
4. **Dashboard Hardcoded Layout**: Dashboard currently has a static layout without customization or preset options.
5. **LifeBuddy Feature Missing**: No companion model, gallery, or widget exists in the frontend codebase.
6. **Floating AI Assistant Missing**: AI is currently only accessible via the `/ai` page rather than an accessible persistent floating assistant with quick access drawer.

