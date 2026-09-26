import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TasksPage from './pages/TasksPage';
import BillsPage from './pages/BillsPage';
import AppointmentsPage from './pages/AppointmentsPage';
import DocumentsPage from './pages/DocumentsPage';
import RemindersPage from './pages/RemindersPage';
import CalendarPage from './pages/CalendarPage';
import AIAssistantPage from './pages/AIAssistantPage';
import SettingsPage from './pages/SettingsPage';
import { Loader2 } from 'lucide-react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950 text-primary-600">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950 text-primary-600">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Auth Routes */}
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <RegisterPage />
              </PublicOnlyRoute>
            }
          />

          {/* Protected Application Routes */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/tasks/new" element={<TasksPage />} />
            <Route path="/bills" element={<BillsPage />} />
            <Route path="/bills/new" element={<BillsPage />} />
            <Route path="/appointments" element={<AppointmentsPage />} />
            <Route path="/appointments/new" element={<AppointmentsPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/documents/new" element={<DocumentsPage />} />
            <Route path="/reminders" element={<RemindersPage />} />
            <Route path="/reminders/new" element={<RemindersPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/calendar/new" element={<CalendarPage />} />
            <Route path="/ai" element={<AIAssistantPage />} />
            <Route path="/profile" element={<SettingsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
