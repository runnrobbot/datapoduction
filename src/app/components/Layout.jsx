import { useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Menu, LogOut, User } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { Sidebar } from './Sidebar';
import { NotificationPanel } from './NotificationPanel';
import { useAuth } from '../context/AuthContext';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/barang': 'Master Barang',
  '/masuk': 'Barang Masuk',
  '/penjualan': 'Penjualan',
  '/pre-order': 'Pre Order',
  '/manage-user': 'Manajemen User',
};

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const pageTitle = PAGE_TITLES[location.pathname] || 'Data Production';

  const handleLogout = () => {
    logout();
    toast.success('Berhasil keluar');
  };

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
          <div className="flex items-center gap-3">
            <NotificationPanel />
            
            <div className="h-8 w-px bg-slate-100 mx-1 hidden sm:block"></div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-bold text-slate-700 leading-tight">{user?.nama}</span>
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider leading-tight">
                  {user?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-200">
                <User size={14} />
              </div>
              <button 
                onClick={handleLogout}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all ml-1"
                title="Keluar"
              >
                <LogOut size={16} />
              </button>
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
