import { NavLink } from 'react-router';
import {
  LayoutDashboard, Package, PackagePlus, ShoppingCart,
  ClipboardList, X, Layers, Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/barang', icon: Package, label: 'Master Barang' },
  { to: '/masuk', icon: PackagePlus, label: 'Barang Masuk' },
  { to: '/penjualan', icon: ShoppingCart, label: 'Penjualan' },
  { to: '/pre-order', icon: ClipboardList, label: 'Pre Order' },
  { to: '/manage-user', icon: Users, label: 'Manage User', superOnly: true },
];

export function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();

  const filteredItems = NAV_ITEMS.filter(item => !item.superOnly || user?.role === 'super_admin');

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 z-40
          flex flex-col transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Layers size={16} className="text-white" />
            </div>
            <div>
              <span className="text-slate-800 font-bold tracking-tight" style={{ fontSize: '0.95rem' }}>DataPro</span>
              <span className="text-emerald-500 font-bold" style={{ fontSize: '0.95rem' }}>.</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <X size={15} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <p className="px-2 mb-2 text-xs text-slate-400 uppercase tracking-wider">Menu Utama</p>
          <ul className="space-y-0.5">
            {filteredItems.map(item => (
              <li key={item.to}>
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
                      <item.icon size={16} className={isActive ? 'text-emerald-600' : 'text-slate-400'} />
                      <span>{item.label}</span>
                      {isActive && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100">
          <p className="text-xs text-slate-400">Data Production v2.0</p>
          <p className="text-xs text-slate-300">Powered by Firebase Firestore</p>
        </div>
      </aside>
    </>
  );
}
