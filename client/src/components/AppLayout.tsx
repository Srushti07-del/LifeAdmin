import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-[#2F2F2F] text-[#F5F3EE]">
      <Sidebar />
      <main className="lg:ml-64 min-h-screen transition-all duration-200">
        <div className="max-w-5xl mx-auto px-5 py-6 pt-16 lg:pt-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
