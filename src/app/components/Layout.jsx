import { useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Menu, LogOut, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { Sidebar } from './Sidebar';
import { NotificationPanel } from './NotificationPanel';
import { useAuth } from '../context/AuthContext';

const PAGE_TITLES = {
  '/':             'Dashboard',
  '/barang':       'Master Barang',
  '/masuk':        'Barang Masuk',
  '/penjualan':    'Penjualan',
  '/pre-order':    'Pre Order',
  '/bongkaran':    'Bongkaran',
  '/manage-user':  'Manajemen User',
};

const pageVariants = {
  initial:  { opacity: 0, y: 14 },
  animate:  { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } },
  exit:     { opacity: 0, y: -8, transition: { duration: 0.18, ease: 'easeIn' } },
};

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const pageTitle = PAGE_TITLES[location.pathname] || 'Data Production';

  const handleLogout = () => { logout(); toast.success('Berhasil keluar'); };

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Toaster position="top-right" richColors />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-64 min-h-screen flex flex-col">
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.button whileTap={{ scale: 0.88 }}
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors">
              <Menu size={18} />
            </motion.button>
            <AnimatePresence mode="wait">
              <motion.div key={pageTitle}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-slate-800 font-semibold" style={{ fontSize: '1rem' }}>{pageTitle}</h1>
                  <span className="relative inline-flex h-2 w-2">
                    <motion.span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400"
                      animate={{ scale: [1, 1.8, 1], opacity: [0.8, 0, 0.8] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                </div>
                <p className="text-slate-400 hidden sm:block" style={{ fontSize: '0.75rem' }}>
                  Data Production Management System
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="flex items-center gap-3">
            <NotificationPanel />
            <div className="h-8 w-px bg-slate-100 mx-1 hidden sm:block" />
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-bold text-slate-700 leading-tight">{user?.nama}</span>
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider leading-tight">
                  {user?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                </span>
              </div>
              <motion.div whileHover={{ scale: 1.08 }}
                className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-200">
                <User size={14} />
              </motion.div>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={handleLogout}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all ml-1"
                title="Keluar">
                <LogOut size={16} />
              </motion.button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
