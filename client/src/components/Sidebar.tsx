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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);

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
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-lg bg-[#383838] shadow-sm border border-[#505050] text-[#F5F3EE]"
        id="sidebar-mobile-toggle"
      >
        <Menu size={18} />
      </button>

      <aside
        className={`fixed left-0 top-0 h-full z-40 flex flex-col transition-all duration-200 ease-in-out
          ${collapsed ? '-translate-x-full lg:translate-x-0 lg:w-16' : 'translate-x-0 w-64'}
          bg-[#242424] border-r border-[#505050]
        `}
        id="sidebar"
      >
        {/* Logo / Workspace Brand */}
        <div className={`flex items-center justify-between px-4 h-14 border-b border-[#505050] ${collapsed ? 'lg:px-2 lg:justify-center' : ''}`}>
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded bg-[#383838] border border-[#505050] flex items-center justify-center text-[#F5F3EE] font-bold text-xs">
                L
              </div>
              <span className="font-semibold text-sm tracking-tight text-[#F5F3EE]">
                LifeAdmin
              </span>
            </div>
          )}
          {collapsed && (
            <div className="w-6 h-6 rounded bg-[#383838] border border-[#505050] flex items-center justify-center text-[#F5F3EE] font-bold text-xs">
              L
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex p-1 rounded hover:bg-[#383838] text-[#85827C] hover:text-[#F5F3EE] transition-colors"
            id="sidebar-collapse-toggle"
          >
            <ChevronLeft size={16} className={`transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${collapsed ? 'lg:justify-center lg:px-0' : ''}
                ${isActive
                  ? 'bg-[#383838] text-[#F5F3EE] font-semibold border border-[#505050]/60'
                  : 'text-[#B8B5AE] hover:bg-[#383838]/60 hover:text-[#F5F3EE]'
                }`
              }
            >
              <item.icon size={16} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}

          {/* Quick Create Button */}
          <div className="relative pt-2">
            <button
              onClick={() => setShowCreateMenu(!showCreateMenu)}
              id="create-button"
              className={`flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors
                bg-[#383838] hover:bg-[#414141] text-[#F5F3EE] border border-[#505050] shadow-sm
                ${collapsed ? 'lg:justify-center lg:px-0' : ''}
              `}
            >
              <Plus size={15} className="shrink-0" />
              {!collapsed && <span>Create</span>}
            </button>

            {/* Create Dropdown */}
            {showCreateMenu && (
              <div className="absolute left-0 right-0 mt-1 py-1 bg-[#383838] rounded-xl shadow-lg border border-[#505050] z-50 animate-scale-in">
                {createOptions.map((option) => (
                  <button
                    key={option.path}
                    onClick={() => {
                      navigate(option.path);
                      setShowCreateMenu(false);
                    }}
                    className="flex items-center gap-2.5 w-full px-3 py-1.5 text-xs text-[#B8B5AE] hover:text-[#F5F3EE] hover:bg-[#414141] transition-colors"
                  >
                    <option.icon size={14} className="text-[#85827C]" />
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Bottom Section */}
        <div className="px-2 py-3 border-t border-[#505050] space-y-0.5">
          {/* Profile */}
          <NavLink
            to="/profile"
            id="nav-profile"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors
              ${collapsed ? 'lg:justify-center lg:px-0' : ''}
              ${isActive
                ? 'bg-[#383838] text-[#F5F3EE] font-semibold border border-[#505050]/60'
                : 'text-[#B8B5AE] hover:bg-[#383838]/60 hover:text-[#F5F3EE]'
              }`
            }
          >
            <User size={15} />
            {!collapsed && <span>Profile</span>}
          </NavLink>

          {/* Settings */}
          <NavLink
            to="/settings"
            id="nav-settings"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors
              ${collapsed ? 'lg:justify-center lg:px-0' : ''}
              ${isActive
                ? 'bg-[#383838] text-[#F5F3EE] font-semibold border border-[#505050]/60'
                : 'text-[#B8B5AE] hover:bg-[#383838]/60 hover:text-[#F5F3EE]'
              }`
            }
          >
            <Settings size={15} />
            {!collapsed && <span>Settings</span>}
          </NavLink>

          {/* User Account & Sign Out */}
          <div className={`flex items-center gap-2 px-2.5 py-2 mt-1 border-t border-[#505050] ${collapsed ? 'lg:justify-center' : ''}`}>
            <div className="w-6 h-6 rounded-full bg-[#414141] border border-[#505050] flex items-center justify-center text-[#F5F3EE] text-xs font-medium shrink-0">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[#F5F3EE] truncate">{user?.name}</p>
                <p className="text-[11px] text-[#85827C] truncate">{user?.email}</p>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={logout}
                id="logout-button"
                className="p-1 rounded hover:bg-[#414141] text-[#85827C] hover:text-[#F5F3EE] transition-colors"
                title="Sign out"
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {!collapsed && (
        <div
          className="lg:hidden fixed inset-0 bg-black/20 z-30"
          onClick={() => setCollapsed(true)}
        />
      )}
    </>
  );
}
