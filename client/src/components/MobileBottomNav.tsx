import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Plus,
  MoreHorizontal,
  Receipt,
  FileText,
  CalendarClock,
  Bell,
  Sparkles,
  Settings,
  X,
} from 'lucide-react';

export default function MobileBottomNav() {
  const navigate = useNavigate();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  const moreItems = [
    { path: '/bills', label: 'Bills & Payments', icon: Receipt },
    { path: '/documents', label: 'Documents', icon: FileText },
    { path: '/appointments', label: 'Appointments', icon: CalendarClock },
    { path: '/reminders', label: 'Reminders', icon: Bell },
    { path: '/lifebuddy', label: 'LifeBuddy', icon: Sparkles },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  const createOptions = [
    { label: 'New Task', path: '/tasks/new', icon: CheckSquare },
    { label: 'New Bill', path: '/bills/new', icon: Receipt },
    { label: 'New Appointment', path: '/appointments/new', icon: CalendarClock },
    { label: 'New Reminder', path: '/reminders/new', icon: Bell },
    { label: 'Upload Document', path: '/documents/new', icon: FileText },
    { label: 'New Event', path: '/calendar/new', icon: Calendar },
  ];

  return (
    <>
      {/* Fixed Bottom Bar on Mobile/Tablet */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#141F22]/95 backdrop-blur-md border-t border-surface-200 dark:border-[#304247] px-3 py-1.5 shadow-elevated">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {/* Overview */}
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[11px] font-medium transition-colors ${
                isActive
                  ? 'text-primary-600 dark:text-primary-300 font-semibold'
                  : 'text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-surface-100'
              }`
            }
          >
            <LayoutDashboard size={20} className="mb-0.5" />
            <span>Overview</span>
          </NavLink>

          {/* Tasks */}
          <NavLink
            to="/tasks"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[11px] font-medium transition-colors ${
                isActive
                  ? 'text-primary-600 dark:text-primary-300 font-semibold'
                  : 'text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-surface-100'
              }`
            }
          >
            <CheckSquare size={20} className="mb-0.5" />
            <span>Tasks</span>
          </NavLink>

          {/* Center Floating Plus Button */}
          <div className="relative -top-4">
            <button
              onClick={() => {
                setShowCreateMenu(true);
                setShowMoreMenu(false);
              }}
              className="w-12 h-12 rounded-full bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-400 text-white dark:text-[#101719] shadow-elevated flex items-center justify-center transition-transform active:scale-95 focus:outline-none"
              aria-label="Create new item"
            >
              <Plus size={24} />
            </button>
          </div>

          {/* Calendar */}
          <NavLink
            to="/calendar"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[11px] font-medium transition-colors ${
                isActive
                  ? 'text-primary-600 dark:text-primary-300 font-semibold'
                  : 'text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-surface-100'
              }`
            }
          >
            <Calendar size={20} className="mb-0.5" />
            <span>Calendar</span>
          </NavLink>

          {/* More Drawer Button */}
          <button
            onClick={() => {
              setShowMoreMenu(true);
              setShowCreateMenu(false);
            }}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[11px] font-medium transition-colors ${
              showMoreMenu
                ? 'text-primary-600 dark:text-primary-300 font-semibold'
                : 'text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-surface-100'
            }`}
          >
            <MoreHorizontal size={20} className="mb-0.5" />
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* Quick Create Bottom Sheet */}
      {showCreateMenu && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs animate-fade-in"
            onClick={() => setShowCreateMenu(false)}
          />
          <div className="relative bg-white dark:bg-surface-0 rounded-t-3xl border-t border-surface-200 dark:border-surface-700 p-6 shadow-modal z-10 animate-slide-in-right">
            <div className="flex items-center justify-between pb-4 border-b border-surface-100 dark:border-surface-800 mb-4">
              <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100 font-editorial">
                Quick Create
              </h3>
              <button
                onClick={() => setShowCreateMenu(false)}
                className="p-1 rounded-lg text-surface-400 hover:text-surface-600 dark:hover:text-surface-200"
              >
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 pb-4">
              {createOptions.map((opt) => (
                <button
                  key={opt.path}
                  onClick={() => {
                    setShowCreateMenu(false);
                    navigate(opt.path);
                  }}
                  className="flex items-center gap-3 p-3.5 rounded-2xl border border-surface-200 dark:border-surface-700/80 hover:bg-primary-50 dark:hover:bg-primary-950/30 hover:border-primary-400/40 text-left transition-all"
                >
                  <div className="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 flex items-center justify-center flex-shrink-0">
                    <opt.icon size={18} />
                  </div>
                  <span className="text-sm font-medium text-surface-800 dark:text-surface-200">
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* More Navigation Drawer */}
      {showMoreMenu && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs animate-fade-in"
            onClick={() => setShowMoreMenu(false)}
          />
          <div className="relative bg-white dark:bg-[#1C292D] rounded-t-3xl border-t border-surface-200 dark:border-[#304247] p-6 shadow-modal z-10 animate-slide-in-right">
            <div className="flex items-center justify-between pb-4 border-b border-surface-100 dark:border-surface-800 mb-4">
              <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100 font-editorial">
                All Modules
              </h3>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="p-1 rounded-lg text-surface-400 hover:text-surface-600 dark:hover:text-surface-200"
              >
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 pb-4">
              {moreItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setShowMoreMenu(false)}
                  className="flex items-center gap-3 p-3.5 rounded-2xl border border-surface-200 dark:border-surface-700/80 hover:bg-primary-50 dark:hover:bg-primary-950/30 hover:border-primary-400/40 text-left transition-all"
                >
                  <div className="w-9 h-9 rounded-xl bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 flex items-center justify-center flex-shrink-0">
                    <item.icon size={18} />
                  </div>
                  <span className="text-sm font-medium text-surface-800 dark:text-surface-200">
                    {item.label}
                  </span>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}


