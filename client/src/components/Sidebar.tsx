import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  CheckSquare,
  Receipt,
  CalendarClock,
  FileText,
  Bell,
  Calendar,
  Bot,
  Plus,
  Settings,
  User,
  LogOut,
  Sun,
  Moon,
  ChevronLeft,
  Menu,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/tasks', label: 'Tasks', icon: CheckSquare },
  { path: '/bills', label: 'Bills', icon: Receipt },
  { path: '/appointments', label: 'Appointments', icon: CalendarClock },
  { path: '/documents', label: 'Documents', icon: FileText },
  { path: '/reminders', label: 'Reminders', icon: Bell },
  { path: '/calendar', label: 'Calendar', icon: Calendar },
  { path: '/ai', label: 'AI Assistant', icon: Bot },
];

export default function Sidebar() {
  const { user, logout, setTheme } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    setTheme(newTheme);
  };

  const createOptions = [
    { label: 'Task', path: '/tasks/new', icon: CheckSquare },
    { label: 'Bill', path: '/bills/new', icon: Receipt },
    { label: 'Appointment', path: '/appointments/new', icon: CalendarClock },
    { label: 'Reminder', path: '/reminders/new', icon: Bell },
    { label: 'Document', path: '/documents/new', icon: FileText },
    { label: 'Event', path: '/calendar/new', icon: Calendar },
  ];

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-white dark:bg-surface-800 shadow-elevated"
        id="sidebar-mobile-toggle"
      >
        <Menu size={20} />
      </button>

      <aside
        className={`fixed left-0 top-0 h-full z-40 flex flex-col transition-all duration-300 ease-in-out
          ${collapsed ? '-translate-x-full lg:translate-x-0 lg:w-20' : 'translate-x-0 w-72'}
          bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800
        `}
        id="sidebar"
      >
        {/* Logo / Brand */}
        <div className={`flex items-center justify-between px-6 h-16 border-b border-surface-100 dark:border-surface-800 ${collapsed ? 'lg:px-4 lg:justify-center' : ''}`}>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                <span className="text-white font-bold text-sm">L</span>
              </div>
              <span className="font-semibold text-lg text-surface-900 dark:text-surface-100">LifeAdmin</span>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <span className="text-white font-bold text-sm">L</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-500 transition-colors"
            id="sidebar-collapse-toggle"
          >
            <ChevronLeft size={18} className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${collapsed ? 'lg:justify-center lg:px-0' : ''}
                ${isActive
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                  : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-900 dark:hover:text-surface-200'
                }`
              }
            >
              <item.icon size={20} className="flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}

          {/* Create button */}
          <div className="relative pt-3">
            <button
              onClick={() => setShowCreateMenu(!showCreateMenu)}
              id="create-button"
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                bg-primary-500 hover:bg-primary-600 text-white shadow-sm hover:shadow-md
                ${collapsed ? 'lg:justify-center lg:px-0' : ''}
              `}
            >
              <Plus size={20} className="flex-shrink-0" />
              {!collapsed && <span>Create</span>}
            </button>

            {/* Create dropdown */}
            {showCreateMenu && (
              <div className="absolute left-0 right-0 mt-2 py-2 bg-white dark:bg-surface-800 rounded-xl shadow-modal border border-surface-200 dark:border-surface-700 z-50 animate-scale-in">
                {createOptions.map((option) => (
                  <button
                    key={option.path}
                    onClick={() => {
                      navigate(option.path);
                      setShowCreateMenu(false);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
                  >
                    <option.icon size={16} />
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Bottom section */}
        <div className="px-3 py-4 border-t border-surface-100 dark:border-surface-800 space-y-1">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            id="theme-toggle"
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors
              ${collapsed ? 'lg:justify-center lg:px-0' : ''}
            `}
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
            {!collapsed && <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>

          {/* Profile */}
          <NavLink
            to="/profile"
            id="nav-profile"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
              ${collapsed ? 'lg:justify-center lg:px-0' : ''}
              ${isActive
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'
              }`
            }
          >
            <User size={20} />
            {!collapsed && <span>Profile</span>}
          </NavLink>

          {/* Settings */}
          <NavLink
            to="/settings"
            id="nav-settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
              ${collapsed ? 'lg:justify-center lg:px-0' : ''}
              ${isActive
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'
              }`
            }
          >
            <Settings size={20} />
            {!collapsed && <span>Settings</span>}
          </NavLink>

          {/* User info + Logout */}
          <div className={`flex items-center gap-3 px-3 py-2.5 mt-2 ${collapsed ? 'lg:justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">{user?.name}</p>
                <p className="text-xs text-surface-500 truncate">{user?.email}</p>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={logout}
                id="logout-button"
                className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-500 transition-colors"
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {!collapsed && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 z-30"
          onClick={() => setCollapsed(true)}
        />
      )}
    </>
  );
}
