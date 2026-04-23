import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import {
  Package, TrendingUp, ShoppingCart, ClipboardList,
  ArrowRight, Boxes
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, Tooltip, Legend
} from 'recharts';
import { getAllBarang } from '../services/barangService';
import { getAllPenjualan } from '../services/penjualanService';
import { getAllPreOrder } from '../services/preOrderService';
import { getAllMasuk } from '../services/masukService';
import { StatCard } from '../components/StatCard';
import { getPOStatus, formatCurrency, formatDate, toDate } from '../utils/helpers';

const COLORS = ['#059669', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-lg">
        <p className="text-xs text-slate-500 mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [barangList, setBarangList] = useState([]);
  const [penjualanList, setPenjualanList] = useState([]);
  const [preOrderList, setPreOrderList] = useState([]);
  const [recentMasuk, setRecentMasuk] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAll() {
      try {
        const [barang, penjualan, po, masuk] = await Promise.all([
          getAllBarang(),
          getAllPenjualan(),
          getAllPreOrder(),
          getAllMasuk()
        ]);
        setBarangList(barang);
        setPenjualanList(penjualan);
        setPreOrderList(po);
        setRecentMasuk(masuk.slice(0, 5));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  // Computed stats
  const stats = useMemo(() => {
    const totalTerjual = penjualanList.reduce((s, p) => s + (parseInt(p.qty) || 0), 0);
    const totalRevenue = penjualanList.reduce((s, p) => s + ((parseInt(p.qty) || 0) * (parseFloat(p.harga) || 0)), 0);
    const totalStok = barangList.reduce((s, b) => s + (parseInt(b.stok) || 0), 0);
    const activePreOrder = preOrderList.filter(po => {
      const { label } = getPOStatus(po.tanggal_po);
      return label !== 'Overdue';
    }).length;
    return { totalTerjual, totalRevenue, totalStok, activePreOrder };
  }, [barangList, penjualanList, preOrderList]);

  // Top products for bar chart
  const topProducts = useMemo(() => {
    const map = {};
    penjualanList.forEach(p => {
      const key = p.nama_barang;
      if (!map[key]) map[key] = { name: p.kode_barang || p.nama_barang.slice(0, 10), total: 0 };
      map[key].total += parseInt(p.qty) || 0;
    });
    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [penjualanList]);

  // Offline vs Online
  const channelData = useMemo(() => {
    const offline = penjualanList.filter(p => p.tipe === 'offline').reduce((s, p) => s + (parseInt(p.qty) || 0), 0);
    const online = penjualanList.filter(p => p.tipe === 'online').reduce((s, p) => s + (parseInt(p.qty) || 0), 0);
    return [
      { name: 'Offline', value: offline },
      { name: 'Reseller', value: online }
    ];
  }, [penjualanList]);

  // Recent transactions (last 10 penjualan)
  const recentSales = penjualanList.slice(0, 10);

  // Low stock barang (stok <= 5)
  const lowStok = barangList.filter(b => b.stok <= 5 && b.stok >= 0).slice(0, 5);

  // Urgent pre-orders
  const urgentPO = preOrderList
    .map(po => ({ ...po, status: getPOStatus(po.tanggal_po) }))
    .filter(po => po.status.color === 'red' || po.status.color === 'yellow')
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Terjual"
          value={loading ? '…' : stats.totalTerjual.toLocaleString()}
          icon={ShoppingCart}
          color="emerald"
          loading={loading}
        />
        <StatCard
          label="Total Revenue"
          value={loading ? '…' : formatCurrency(stats.totalRevenue)}
          icon={TrendingUp}
          color="blue"
          loading={loading}
        />
        <StatCard
          label="Total Stok"
          value={loading ? '…' : stats.totalStok.toLocaleString()}
          icon={Boxes}
          color="violet"
          loading={loading}
        />
        <StatCard
          label="Pre Order Aktif"
          value={loading ? '…' : stats.activePreOrder.toString()}
          icon={ClipboardList}
          color="amber"
          loading={loading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar Chart - Top Products */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-slate-800 font-semibold" style={{ fontSize: '0.95rem' }}>Produk Terlaris</h3>
              <p className="text-slate-400" style={{ fontSize: '0.75rem' }}>Berdasarkan total unit terjual</p>
            </div>
            <Link to="/penjualan" className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1" style={{ fontSize: '0.8rem' }}>
              Lihat semua <ArrowRight size={13} />
            </Link>
          </div>
          {loading ? (
            <div className="h-52 bg-slate-50 rounded-lg animate-pulse" />
          ) : topProducts.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-slate-400 text-sm">Belum ada data penjualan</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topProducts} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" name="Terjual" fill="#059669" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie Chart - Channel */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="mb-5">
            <h3 className="text-slate-800 font-semibold" style={{ fontSize: '0.95rem' }}>Saluran Penjualan</h3>
            <p className="text-slate-400" style={{ fontSize: '0.75rem' }}>Offline vs Reseller</p>
          </div>
          {loading ? (
            <div className="h-52 bg-slate-50 rounded-lg animate-pulse" />
          ) : channelData.every(d => d.value === 0) ? (
            <div className="h-52 flex items-center justify-center text-slate-400 text-sm">Belum ada data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={channelData}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {channelData.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#059669' : '#3b82f6'} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', color: '#64748b' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Sales */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-800 font-semibold" style={{ fontSize: '0.95rem' }}>Transaksi Terbaru</h3>
            <Link to="/penjualan" className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1" style={{ fontSize: '0.8rem' }}>
              Lihat semua <ArrowRight size={13} />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => <div key={i} className="h-10 bg-slate-50 rounded animate-pulse" />)}
            </div>
          ) : recentSales.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">Belum ada transaksi</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left pb-2 text-xs text-slate-400 uppercase tracking-wider">Tanggal</th>
                    <th className="text-left pb-2 text-xs text-slate-400 uppercase tracking-wider">Produk</th>
                    <th className="text-left pb-2 text-xs text-slate-400 uppercase tracking-wider">Qty</th>
                    <th className="text-left pb-2 text-xs text-slate-400 uppercase tracking-wider">Kanal</th>
                    <th className="text-right pb-2 text-xs text-slate-400 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map(p => (
                    <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 text-xs text-slate-500">{formatDate(p.created_at)}</td>
                      <td className="py-2.5">
                        <span className="text-xs font-mono text-emerald-600 font-semibold">{p.kode_barang || '—'}</span>
                        <p className="text-xs text-slate-600 truncate max-w-[120px]">{p.nama_barang}</p>
                      </td>
                      <td className="py-2.5 text-xs text-slate-700 font-semibold">{p.qty} {p.satuan}</td>
                      <td className="py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          p.tipe === 'online' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          {p.tipe === 'online' ? 'Reseller' : 'Offline'}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-xs font-semibold text-slate-700">
                        {formatCurrency(parseInt(p.qty) * parseFloat(p.harga))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Alerts Column */}
        <div className="space-y-4">
          {/* Low Stock */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-slate-800 font-semibold" style={{ fontSize: '0.9rem' }}>Stok Menipis</h3>
              <Link to="/barang" className="text-xs text-emerald-600 hover:underline">Lihat</Link>
            </div>
            {loading ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-8 bg-slate-50 rounded animate-pulse" />)}</div>
            ) : lowStok.length === 0 ? (
              <p className="text-slate-400 text-xs text-center py-4">Semua stok aman ✓</p>
            ) : (
              <div className="space-y-2">
                {lowStok.map(b => (
                  <div key={b.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                    <div>
                      <p className="text-xs font-mono font-semibold text-slate-700">{b.kode || '—'}</p>
                      <p className="text-xs text-slate-400 truncate max-w-[110px]">{b.nama}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      b.stok === 0 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {b.stok} {b.satuan}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Urgent PO */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-slate-800 font-semibold" style={{ fontSize: '0.9rem' }}>PO Mendesak</h3>
              <Link to="/pre-order" className="text-xs text-emerald-600 hover:underline">Lihat</Link>
            </div>
            {loading ? (
              <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-8 bg-slate-50 rounded animate-pulse" />)}</div>
            ) : urgentPO.length === 0 ? (
              <p className="text-slate-400 text-xs text-center py-4">Tidak ada PO mendesak ✓</p>
            ) : (
              <div className="space-y-2">
                {urgentPO.map(po => (
                  <div key={po.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                    <div>
                      <p className="text-xs font-mono font-semibold text-slate-700">{po.kode_barang || '—'}</p>
                      <p className="text-xs text-slate-400">{po.status.message}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      po.status.color === 'red' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {po.status.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
