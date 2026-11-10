/**
 * LifeAdmin Backend Endpoints Registry
 * Strictly mapped to existing Express server routes in /server/src/routes/
 */

export const Endpoints = {
  // Health
  health: '/health',

  // Authentication & Users (server/src/routes/auth.ts & users.ts)
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    guest: '/auth/guest',
    exitGuest: '/auth/guest',
    me: '/auth/me',
    profile: '/auth/me',
    updateProfile: '/users/profile',
    deleteAccount: '/users/account',
    forgotPassword: '/auth/forgot-password',
    resetPassword: (token: string) => `/auth/reset-password/${encodeURIComponent(token)}`,
  },

  // Dashboard (server/src/routes/dashboard.ts)
  dashboard: {
    overview: '/dashboard',
  },

  // Tasks (server/src/routes/tasks.ts)
  tasks: {
    list: '/tasks',
    create: '/tasks',
    getById: (id: string) => `/tasks/${id}`,
    update: (id: string) => `/tasks/${id}`,
    delete: (id: string) => `/tasks/${id}`,
  },

  // Bills & Payments (server/src/routes/bills.ts)
  bills: {
    list: '/bills',
    create: '/bills',
    getById: (id: string) => `/bills/${id}`,
    update: (id: string) => `/bills/${id}`,
    delete: (id: string) => `/bills/${id}`,
    pay: (id: string) => `/bills/${id}/pay`,
  },

  // Appointments (server/src/routes/appointments.ts)
  appointments: {
    list: '/appointments',
    create: '/appointments',
    getById: (id: string) => `/appointments/${id}`,
    update: (id: string) => `/appointments/${id}`,
    delete: (id: string) => `/appointments/${id}`,
  },

  // Reminders (server/src/routes/reminders.ts)
  reminders: {
    list: '/reminders',
    create: '/reminders',
    getById: (id: string) => `/reminders/${id}`,
    update: (id: string) => `/reminders/${id}`,
    delete: (id: string) => `/reminders/${id}`,
    acknowledge: (id: string) => `/reminders/${id}/acknowledge`,
  },

  // Documents (server/src/routes/documents.ts)
  documents: {
    list: '/documents',
    upload: '/documents/upload',
    getById: (id: string) => `/documents/${id}`,
    delete: (id: string) => `/documents/${id}`,
    downloadUrl: (id: string) => `/documents/${id}/download`,
  },

  // Calendar (server/src/routes/calendar.ts)
  calendar: {
    events: '/calendar/events',
    createEvent: '/calendar/events',
    updateEvent: (id: string) => `/calendar/events/${id}`,
    deleteEvent: (id: string) => `/calendar/events/${id}`,
  },

  // Notifications (server/src/routes/notifications.ts)
  notifications: {
    list: '/notifications',
    markRead: (id: string) => `/notifications/${id}/read`,
    markAllRead: '/notifications/read-all',
  },

  // AI Assistant (server/src/routes/ai.ts)
  ai: {
    chat: '/ai/chat',
    plan: '/ai/plan',
    extractDocument: '/ai/extract-document',
  },
} as const;

export default Endpoints;
