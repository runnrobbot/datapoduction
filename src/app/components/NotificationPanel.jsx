import { useState, useEffect, useRef } from 'react';
import { Bell, X, ShoppingCart, Package, TrendingUp, Clock } from 'lucide-react';
import { getAllMasuk } from '../services/masukService';
import { getAllPenjualan } from '../services/penjualanService';

function timeAgo(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date)) return 'Baru saja';
  const diff = Math.floor((Date.now() - date) / 1000);
  if (diff < 60) return 'Baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return `${Math.floor(diff / 86400)} hari lalu`;
}

export function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [readTime, setReadTime] = useState(
    parseInt(localStorage.getItem('lastReadNotificationTime') || '0')
  );
  const ref = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        const [masuk, penjualan] = await Promise.allSettled([
          getAllMasuk(),
          getAllPenjualan(),
        ]);

        const items = [];

        if (masuk.status === 'fulfilled') {
          masuk.value.slice(0, 5).forEach((m) => {
            items.push({
              id: `masuk-${m.id}`,
              icon: Package,
              color: 'text-emerald-600',
              bg: 'bg-emerald-50',
              title: 'Barang Masuk',
              desc: `${m.nama_barang || m.barang_nama || 'Barang'} — ${m.qty} unit`,
              time: m.tanggal || m.created_at || null,
            });
          });
        }

        if (penjualan.status === 'fulfilled') {
          penjualan.value.slice(0, 5).forEach((p) => {
            items.push({
              id: `jual-${p.id}`,
              icon: ShoppingCart,
              color: 'text-blue-600',
              bg: 'bg-blue-50',
              title: 'Penjualan',
              desc: `${p.nama_barang || p.barang_nama || 'Barang'} — ${p.qty} unit`,
              time: p.tanggal || p.created_at || null,
            });
          });
        }

        items.sort((a, b) => new Date(b.time) - new Date(a.time));
        const latest = items.slice(0, 8);
        setNotifications(latest);
        
        const unreadCount = latest.filter(n => new Date(n.time).getTime() > readTime).length;
        setUnread(unreadCount);
      } catch {
        setNotifications([]);
      }
    }
    load();
  }, [readTime]);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleOpen() {
    setOpen((v) => !v);
  }

  function markAsRead() {
    const now = Date.now();
    localStorage.setItem('lastReadNotificationTime', now.toString());
    setReadTime(now);
    setUnread(0);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors relative"
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold" style={{ fontSize: '0.55rem' }}>
              {unread > 9 ? '9+' : unread}
            </span>
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-emerald-600" />
              <span className="font-semibold text-slate-700" style={{ fontSize: '0.875rem' }}>
                Aktivitas Terbaru
              </span>
            </div>
            <div className="flex items-center gap-3">
              {unread > 0 && (
                <button 
                  onClick={markAsRead}
                  className="text-[10px] uppercase tracking-wider font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md"
                >
                  Mark as Read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <Bell size={28} className="mb-2 opacity-40" />
                <p style={{ fontSize: '0.8rem' }}>Belum ada aktivitas</p>
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = n.icon;
                const isUnread = new Date(n.time).getTime() > readTime;
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 transition-colors border-b border-slate-50 last:border-0 ${
                      isUnread ? 'bg-slate-50/80 hover:bg-slate-100' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${n.bg}`}>
                      <Icon size={14} className={n.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`font-medium text-slate-700 ${isUnread ? 'text-slate-800 font-bold' : ''}`} style={{ fontSize: '0.8rem' }}>
                          {n.title}
                        </p>
                        {isUnread && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>}
                      </div>
                      <p className="text-slate-500 truncate" style={{ fontSize: '0.75rem' }}>
                        {n.desc}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock size={10} className="text-slate-300" />
                        <span className="text-slate-400" style={{ fontSize: '0.7rem' }}>
                          {timeAgo(n.time)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-slate-100 bg-slate-50">
              <p className="text-center text-slate-400" style={{ fontSize: '0.7rem' }}>
                Menampilkan {notifications.length} aktivitas terbaru
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
