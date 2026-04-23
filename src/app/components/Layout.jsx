import { useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Menu } from 'lucide-react';
import { Toaster } from 'sonner';
import { Sidebar } from './Sidebar';
import { NotificationPanel } from './NotificationPanel';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/barang': 'Master Barang',
  '/masuk': 'Barang Masuk',
  '/penjualan': 'Penjualan',
  '/pre-order': 'Pre Order',
};

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const pageTitle = PAGE_TITLES[location.pathname] || 'Data Production';

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Toaster position="top-right" richColors />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area */}
      <div className="lg:pl-64 min-h-screen flex flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <Menu size={18} />
            </button>
            <div>
              <h1 className="text-slate-800 font-semibold" style={{ fontSize: '1rem' }}>{pageTitle}</h1>
              <p className="text-slate-400 hidden sm:block" style={{ fontSize: '0.75rem' }}>
                Data Production Management System
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationPanel />
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">DP</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
