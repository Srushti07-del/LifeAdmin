# LifeAdmin

LifeAdmin is a personal life-management platform designed to organize everyday responsibilities into a calm, unified workspace. It helps students and professionals track tasks, bills, appointments, and important documents with intelligent reminders. The platform also includes LifeBuddy, an interactive virtual companion that reinforces positive habit-building without guilt.

## Key Features

- **Tasks & Deadlines:** Manage to-dos and recurring responsibilities across List and Board views.
- **Bills & Subscriptions:** Monitor payment dates, recurring expenses, and upcoming dues in INR (₹).
- **Calendar & Appointments:** Consolidated timeline aggregating all dated tasks, bills, and appointments.
- **Documents & AI Extraction:** Upload personal files with automated metadata extraction via Google Gemini.
- **LifeBuddy & AI Assistant:** Stylized 3D companion for habit reinforcement plus an interactive planning assistant.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4, React Router
- **Backend:** Node.js, Express, TypeScript, JWT, Nodemailer
- **Database:** MongoDB, Mongoose
- **AI:** Google Gemini API (`@google/generative-ai`)

## Getting Started

### Prerequisites
- Node.js (v18+) and npm
- MongoDB instance

### Installation & Run

```bash
# Install root, client, and server dependencies
npm run install:all

# Start frontend and backend concurrently
npm run dev
```

The web client runs on `http://localhost:5173` and the server on `http://localhost:5000`.

## Environment Setup

Copy the example environment file and configure required keys:

```bash
cp server/.env.example server/.env
```

Set `MONGODB_URI`, `JWT_SECRET`, and optionally `GEMINI_API_KEY` and SMTP settings in `server/.env`.

## Project Structure

```text
├── client/   # React frontend application
├── server/   # Express backend API and database models
├── mobile/   # React Native / Expo mobile app
├── shared/   # Shared TypeScript types and contracts
└── docs/     # Design system, UX specs, and documentation
```
