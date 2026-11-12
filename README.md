# LifeAdmin

LifeAdmin is a personal life-management workspace designed to organize everyday responsibilities in one calm interface. It helps users manage tasks, bills, appointments, and documents with smart reminders and alerts. It also includes LifeBuddy, an interactive virtual companion for positive habit-building.

## Live Website

https://lifeadmin-web.onrender.com/

## Features

- **Dashboard & Deadlines:** Overview of upcoming tasks, bills, and active reminders.
- **Tasks & Bills:** List and board task tracking with recurring bill management in INR (₹).
- **Calendar & Appointments:** Consolidated timeline aggregating dated responsibilities and visits.
- **Documents & AI Extraction:** File storage with automated Google Gemini metadata extraction.
- **LifeBuddy Companion:** Stylized virtual companions reinforcing positive habits and progress.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript, MongoDB, Mongoose, JWT
- **AI:** Google Gemini API

## Run Locally

```bash
npm run install:all                  # Install root, server, and client dependencies
cp server/.env.example server/.env   # Set MONGODB_URI and JWT_SECRET
npm run dev                          # Start backend and frontend concurrently
```

## Project Structure

- `client/` — React frontend application
- `server/` — Express API server and MongoDB models
- `mobile/` — React Native (Expo) mobile app
- `shared/` — Shared TypeScript types and contracts
- `docs/` — Documentation and specifications
