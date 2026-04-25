import { NavLink } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, Package, PackagePlus, ShoppingCart,
  ClipboardList, X, Layers, Users, PackageOpen
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/',            icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/barang',      icon: Package,         label: 'Master Barang' },
  { to: '/masuk',       icon: PackagePlus,     label: 'Barang Masuk' },
  { to: '/penjualan',   icon: ShoppingCart,    label: 'Penjualan' },
  { to: '/pre-order',   icon: ClipboardList,   label: 'Pre Order' },
  { to: '/bongkaran',   icon: PackageOpen,     label: 'Bongkaran' },
  { to: '/manage-user', icon: Users,           label: 'Manage User', superOnly: true },
];

export function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();
  const filteredItems = NAV_ITEMS.filter(item => !item.superOnly || user?.role === 'super_admin');

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ x: isOpen ? 0 : undefined }}
        className={`
          fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 z-40
          flex flex-col transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-100">
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05, duration: 0.4 }}
            className="flex items-center gap-2.5"
          >
            <motion.div
              whileHover={{ rotate: 8, scale: 1.08 }}
              className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center"
            >
              <Layers size={16} className="text-white" />
            </motion.div>
            <div>
              <span className="text-slate-800 font-bold tracking-tight" style={{ fontSize: '0.95rem' }}>DataPro</span>
              <span className="text-emerald-500 font-bold" style={{ fontSize: '0.95rem' }}>.</span>
            </div>
          </motion.div>
          <motion.button whileTap={{ scale: 0.85 }}
            onClick={onClose}
            className="lg:hidden w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X size={15} />
          </motion.button>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <p className="px-2 mb-2 text-xs text-slate-400 uppercase tracking-wider">Menu Utama</p>
          <ul className="space-y-0.5">
            {filteredItems.map((item, index) => (
              <motion.li
                key={item.to}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 + index * 0.05, duration: 0.3, ease: 'easeOut' }}
              >
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <motion.span
                        animate={{ scale: isActive ? 1.1 : 1 }}
                        transition={{ duration: 0.2 }}
                      >
                        <item.icon size={16} className={isActive ? 'text-emerald-600' : 'text-slate-400'} />
                      </motion.span>
                      <span>{item.label}</span>
                      {isActive && (
                        <motion.span
                          layoutId="active-dot"
                          className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}
                    </>
                  )}
                </NavLink>
              </motion.li>
            ))}
          </ul>
        </nav>

        <div className="px-5 py-4 border-t border-slate-100">
          <p className="text-xs text-slate-400">Data Production v2.0</p>
          <p className="text-xs text-slate-300">Powered by Glory8</p>
        </div>
      </motion.aside>
    </>
  );
}
