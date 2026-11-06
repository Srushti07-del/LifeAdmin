import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Receipt,
  FileText,
  CalendarClock,
  Bell,
  Sparkles,
  Bot,
  Settings,
  Plus,
  LogOut,
  Sun,
  Moon,
  ChevronLeft,
  Menu,
  X,
} from 'lucide-react';
import NotificationCenter from './NotificationCenter';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenAI?: () => void;
}

const navItems = [
  { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { path: '/tasks', label: 'My Tasks', icon: CheckSquare },
  { path: '/calendar', label: 'Calendar', icon: Calendar },
  { path: '/bills', label: 'Bills & Payments', icon: Receipt },
  { path: '/documents', label: 'Documents', icon: FileText },
  { path: '/appointments', label: 'Appointments', icon: CalendarClock },
  { path: '/reminders', label: 'Reminders', icon: Bell },
  { path: '/lifebuddy', label: 'LifeBuddy', icon: Sparkles },
  { path: '/ai', label: 'AI Assistant', icon: Bot },
];

export default function Sidebar({ collapsed, onToggleCollapse, onOpenAI }: SidebarProps) {
  const { user, logout, exitDemo, setTheme } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  const handleLogout = async () => {
    if (user?.isDemo) {
      await exitDemo();
    } else {
      logout();
    }
    navigate('/login');
  };

  const toggleTheme = () => {
    const nextTheme = isDark ? 'light' : 'dark';
    setTheme(nextTheme);
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
      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 z-30 bg-white/95 dark:bg-[#143440]/95 backdrop-blur-md border-b border-surface-200 dark:border-[#355966] px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-xl text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800"
            aria-label="Open navigation menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              L
            </div>
            <span className="font-editorial text-lg font-normal tracking-tight text-surface-900 dark:text-surface-100">
              LifeAdmin
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <NotificationCenter onNavigate={() => setMobileOpen(false)} />
          <button
            type="button"
            onClick={onOpenAI}
            className="p-2 rounded-xl text-primary-700 dark:text-primary-300 hover:bg-primary-50 dark:hover:bg-[#285968]/70 transition-colors"
            aria-label="Open AI Assistant"
            title="AI Assistant"
          >
            <Bot size={18} />
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            title="Toggle theme"
          >
            {isDark ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-primary-600" />}
          </button>
          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-surface-800 text-primary-800 dark:text-primary-100 flex items-center justify-center font-semibold text-xs border border-primary-300 dark:border-surface-700">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
        </div>
      </div>

      {/* Desktop / Tablet Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full z-40 hidden lg:flex flex-col bg-white dark:bg-[#143440] border-r border-surface-200 dark:border-[#355966] transition-all duration-300 ease-in-out ${
          collapsed ? 'w-20' : 'w-64'
        }`}
        id="sidebar"
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-18 px-5 border-b border-surface-200 dark:border-[#355966]">
          {!collapsed ? (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                L
              </div>
              <div>
                <span className="font-editorial text-xl font-normal tracking-tight text-surface-900 dark:text-surface-100 block leading-none">
                  LifeAdmin
                </span>
                <span className="text-[10px] text-surface-500 dark:text-surface-400 tracking-wider uppercase font-semibold">Workspace</span>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 mx-auto rounded-xl bg-primary-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              L
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-surface-500 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft size={16} className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Quick Create Action */}
        <div className="p-3">
          <div className="relative">
            <button
              onClick={() => setShowCreateMenu(!showCreateMenu)}
              className={`flex items-center gap-2.5 w-full py-2.5 rounded-xl font-semibold text-xs transition-all duration-150 bg-primary-600 hover:bg-primary-700 text-white dark:bg-primary-500 dark:hover:bg-primary-400 dark:text-[#183B4A] shadow-xs ${
                collapsed ? 'justify-center px-0' : 'px-3.5'
              }`}
            >
              <Plus size={16} />
              {!collapsed && <span>New Item</span>}
            </button>

            {showCreateMenu && (
              <div className="absolute left-0 right-0 mt-2 py-1.5 bg-white dark:bg-[#204B5A] rounded-2xl shadow-elevated border border-surface-200 dark:border-[#355966] z-50 animate-scale-in">
                {createOptions.map((opt) => (
                  <button
                    key={opt.path}
                    onClick={() => {
                      navigate(opt.path);
                      setShowCreateMenu(false);
                    }}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs text-surface-800 dark:text-surface-200 hover:bg-primary-50 dark:hover:bg-surface-800 hover:text-primary-700 dark:hover:text-primary-200 transition-colors text-left font-medium"
                  >
                    <opt.icon size={15} className="text-surface-500 dark:text-surface-400" />
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-3 space-y-1 py-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `group flex items-center gap-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                  collapsed ? 'justify-center px-0' : 'px-3.5'
                } ${
                  isActive
                    ? 'bg-primary-50 dark:bg-[#285968] text-primary-800 dark:text-[#F1F7F7] font-semibold shadow-xs ring-1 ring-primary-200/70 dark:ring-primary-500/40'
                    : 'text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-[#285968]/70 hover:text-surface-900 dark:hover:text-surface-100'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    size={18}
                    className={`flex-shrink-0 transition-colors ${
                      isActive
                        ? 'text-primary-700 dark:text-primary-300'
                        : 'text-surface-500 dark:text-surface-300 group-hover:text-surface-900 dark:group-hover:text-surface-100'
                    }`}
                  />
                  {!collapsed && <span>{item.label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="p-3 border-t border-surface-200 dark:border-[#355966] space-y-1">
          {!collapsed && (
            <div className="px-1 pb-1">
              <NotificationCenter />
            </div>
          )}
          {collapsed && (
            <div className="flex justify-center pb-1">
              <NotificationCenter />
            </div>
          )}
          {/* Theme switch */}
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-3 w-full py-2 rounded-xl text-xs font-medium text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-900 dark:hover:text-surface-100 transition-colors ${
              collapsed ? 'justify-center px-0' : 'px-3.5'
            }`}
            title="Toggle theme"
          >
            {isDark ? <Sun size={17} className="text-amber-500" /> : <Moon size={17} className="text-primary-600" />}
            {!collapsed && <span>{isDark ? 'Light Theme' : 'Dark Theme'}</span>}
          </button>

          {/* Settings link */}
          <NavLink
            to="/settings"
            title={collapsed ? 'Settings' : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                collapsed ? 'justify-center px-0' : 'px-3.5'
              } ${
                isActive
                  ? 'bg-primary-50 dark:bg-[#285968] text-primary-800 dark:text-[#F1F7F7] font-semibold ring-1 ring-primary-200/70 dark:ring-primary-500/40'
                  : 'text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-[#285968]/70 hover:text-surface-900 dark:hover:text-surface-100'
              }`
            }
          >
            <Settings size={17} className="flex-shrink-0 text-surface-500 dark:text-surface-300" />
            {!collapsed && <span>Settings</span>}
          </NavLink>

          {/* User Profile Info & Logout */}
          <div
            className={`flex items-center gap-2.5 pt-2 mt-1 border-t border-surface-200 dark:border-[#355966] ${
              collapsed ? 'justify-center' : 'px-2'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-surface-800 text-primary-800 dark:text-primary-100 flex items-center justify-center font-semibold text-xs flex-shrink-0 border border-primary-200/50 dark:border-surface-700">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-surface-900 dark:text-surface-100 truncate">
                    {user?.name || 'User'}
                  </p>
                  {user?.isDemo && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-[#54390E] text-amber-900 dark:text-[#FFE8AD] font-bold uppercase tracking-wider border border-amber-200/60 dark:border-amber-700/60">
                      Demo
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-surface-600 dark:text-surface-300 truncate font-medium">
                  {user?.isDemo ? 'Guest Session' : user?.email}
                </p>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-surface-500 hover:text-danger-600 hover:bg-danger-50 dark:text-surface-300 dark:hover:text-danger-300 dark:hover:bg-danger-950/40 transition-colors"
                title={user?.isDemo ? 'Exit demo' : 'Log out'}
              >
                <LogOut size={15} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Drawer (When hamburger menu is pressed) */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] bg-white dark:bg-[#143440] h-full p-4 flex flex-col shadow-modal z-10 animate-slide-in-right">
            <div className="flex items-center justify-between pb-4 border-b border-surface-200 dark:border-[#355966] mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-primary-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  L
                </div>
                <span className="font-editorial text-lg font-normal tracking-tight text-surface-900 dark:text-surface-100">
                  LifeAdmin
                </span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg text-surface-500 hover:text-surface-900 dark:text-surface-300 dark:hover:text-surface-100 hover:bg-surface-100 dark:hover:bg-surface-800"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-50 dark:bg-[#285968] text-primary-800 dark:text-[#F1F7F7] font-semibold ring-1 ring-primary-200/70 dark:ring-primary-500/40'
                        : 'text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-[#285968]/70 hover:text-surface-900 dark:hover:text-surface-100'
                    }`
                  }
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>

            <div className="pt-3 border-t border-surface-200 dark:border-[#355966] space-y-2">
              <NavLink
                to="/settings"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-900 dark:hover:text-surface-100"
              >
                <Settings size={17} />
                <span>Settings</span>
              </NavLink>
              <button
                onClick={() => {
                  setMobileOpen(false);
                  handleLogout();
                }}
                className="flex items-center gap-3 w-full px-3.5 py-2 rounded-xl text-xs font-medium text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-[#5C2828]"
              >
                <LogOut size={17} />
                <span>{user?.isDemo ? 'Exit demo' : 'Log out'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
