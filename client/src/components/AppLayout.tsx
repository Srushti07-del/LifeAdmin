import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      <Sidebar />
      <main className="lg:ml-72 min-h-screen transition-all duration-300">
        <div className="max-w-6xl mx-auto px-6 py-8 pt-20 lg:pt-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
