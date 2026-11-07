import { useState, useEffect } from 'react';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Sparkles, ArrowRight, LogOut, Loader2 } from 'lucide-react';
import Sidebar from './Sidebar';
import MobileBottomNav from './MobileBottomNav';
import FloatingAIAssistant from './FloatingAIAssistant';

export default function AppLayout() {
  const { user, exitDemo } = useAuth();
  const navigate = useNavigate();
  const [exitingDemo, setExitingDemo] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('lifeadmin_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('lifeadmin_sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  const toggleCollapse = () => setCollapsed((prev) => !prev);

  const handleExitDemo = async () => {
    setExitingDemo(true);
    try {
      await exitDemo();
      navigate('/login');
    } catch {
      navigate('/login');
    } finally {
      setExitingDemo(false);
    }
  };

  return (
    <div className="min-h-screen bg-app text-main transition-colors duration-200">
      {/* Navigation Shell */}
      <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} onOpenAI={() => setAiOpen(true)} />

      {/* Main Content Area */}
      <main
        className={`min-h-screen transition-all duration-300 ease-in-out ${
          collapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}
      >
        {/* Guest Demo Mode Notice Banner */}
        {user?.isDemo && (
          <div className="sticky top-0 z-30 bg-surface-50/95 dark:bg-[#1C292D]/95 backdrop-blur-md border-b border-surface-200 dark:border-[#304247] text-surface-900 dark:text-surface-100 px-4 sm:px-6 py-2.5 text-xs shadow-xs mt-16 lg:mt-0 flex flex-wrap items-center justify-between gap-2 sm:gap-3 transition-colors">
            <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
              <span className="p-1 rounded-md bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300 flex-shrink-0 mt-0.5 sm:mt-0">
                <Sparkles size={14} />
              </span>
              <p className="min-w-0 text-xs leading-relaxed">
                <span className="font-bold tracking-wider uppercase text-[10px] bg-primary-100 dark:bg-primary-500/20 text-primary-800 dark:text-primary-200 px-2 py-0.5 rounded-full mr-2 border border-primary-200/70 dark:border-primary-500/30 inline-block mb-1 sm:mb-0">
                  Guest Demo
                </span>
                <span className="text-surface-700 dark:text-surface-200 font-medium">
                  Exploring with sample records. Changes are isolated and temporary.
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 w-full sm:w-auto sm:ml-auto justify-end flex-wrap">
              <Link
                to="/register"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-400 text-white dark:text-[#101719] font-semibold text-xs shadow-xs transition-all"
              >
                Create Free Account <ArrowRight size={13} />
              </Link>
              <button
                type="button"
                onClick={handleExitDemo}
                disabled={exitingDemo}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-surface-700 dark:text-surface-200 hover:text-surface-900 dark:hover:text-surface-100 hover:bg-white dark:hover:bg-[#243438] border border-surface-200 dark:border-[#304247] text-xs font-medium transition-colors cursor-pointer disabled:opacity-60"
              >
                {exitingDemo ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <LogOut size={13} />
                )}
                <span>Exit Demo</span>
              </button>
            </div>
          </div>
        )}

        <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${user?.isDemo ? 'pt-6' : 'pt-20 lg:pt-8'} pb-28 lg:pb-12 animate-fade-in`}>
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Floating AI Assistant Drawer (mobile entry in top header) */}
      <FloatingAIAssistant isOpen={aiOpen} onOpenChange={setAiOpen} hideMobileTrigger />
    </div>
  );
}


