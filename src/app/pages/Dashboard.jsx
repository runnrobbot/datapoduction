import { useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import {
  Package, TrendingUp, ShoppingCart, ClipboardList,
  ArrowRight, Boxes
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, Tooltip, Legend
} from 'recharts';
import { Chart, ArcElement, DoughnutController, Tooltip as ChartTooltip, Legend as ChartLegend } from 'chart.js';
import { getAllBarang } from '../services/barangService';
import { getAllPenjualan } from '../services/penjualanService';
import { getAllPreOrder } from '../services/preOrderService';
import { getAllMasuk } from '../services/masukService';
import { subscribeBarang, subscribePenjualan, subscribePreOrder, subscribeBarangMasuk } from '../services/realtimeService';
import { StatCard } from '../components/StatCard';
import { AnimatedCard } from '../components/motionComponents';
import { useRealtimeFirestore } from '../hooks/useRealtime';
import { getPOStatus, formatCurrency, formatDate } from '../utils/helpers';

Chart.register(ArcElement, DoughnutController, ChartTooltip, ChartLegend);

/* ─── Reusable Doughnut (Chart.js canvas) ─────────────── */
const PALETTE = [
  '#059669','#3b82f6','#8b5cf6','#f59e0b','#ef4444',
  '#06b6d4','#ec4899','#84cc16','#f97316','#6366f1',
];

function DoughnutChart({ data, title, subtitle, loading, centerLabel }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || loading) return;

    // Destroy previous instance
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const total = data.reduce((s, d) => s + d.value, 0);
    if (total === 0) return;

    chartRef.current = new Chart(canvasRef.current, {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.label),
        datasets: [{
          data:            data.map(d => d.value),
          backgroundColor: data.map((_, i) => PALETTE[i % PALETTE.length]),
          borderColor:     '#ffffff',
          borderWidth:     3,
          hoverBorderWidth: 3,
          hoverOffset:     6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        animation: { animateRotate: true, duration: 700, easing: 'easeInOutQuart' },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 8, boxHeight: 8, borderRadius: 4,
              padding: 12,
              font: { size: 11, family: "'Inter', system-ui, sans-serif" },
              color: '#64748b',
            },
          },
          tooltip: {
            backgroundColor: '#fff',
            titleColor: '#0f172a',
            bodyColor: '#475569',
            borderColor: '#e2e8f0',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 10,
            boxShadow: '0 4px 6px rgba(0,0,0,.06)',
            callbacks: {
              label: (ctx) => {
                const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
                return `  ${ctx.label}: ${ctx.parsed.toLocaleString()} (${pct}%)`;
              },
            },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [data, loading]);

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col">
      <div className="mb-4">
        <h3 className="text-slate-800 font-semibold text-[0.95rem]">{title}</h3>
        <p className="text-slate-400 text-xs mt-0.5">{subtitle}</p>
      </div>
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-36 h-36 rounded-full bg-slate-100 animate-pulse" />
        </div>
      ) : total === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
          Belum ada data
        </div>
      ) : (
        <div className="relative flex-1" style={{ minHeight: 220 }}>
          <canvas ref={canvasRef} />
          {/* Center label */}
          {centerLabel && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ top: '-18%' }}>
              <p className="text-2xl font-bold text-slate-800">{total.toLocaleString()}</p>
              <p className="text-xs text-slate-400">{centerLabel}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
  const { data: barangList,   loading: l1 } = useRealtimeFirestore(subscribeBarang,      getAllBarang,      30000);
  const { data: penjualanList,loading: l2 } = useRealtimeFirestore(subscribePenjualan,   getAllPenjualan,   30000);
  const { data: preOrderList, loading: l3 } = useRealtimeFirestore(subscribePreOrder,    getAllPreOrder,    30000);
  const { data: masukAll,     loading: l4 } = useRealtimeFirestore(subscribeBarangMasuk, getAllMasuk,       30000);

  const loading     = l1 || l2 || l3 || l4;
  const recentMasuk = masukAll.slice(0, 5);

  const stats = useMemo(() => {
    const totalTerjual = penjualanList.reduce((s, p) => s + (parseInt(p.qty) || 0), 0);
    const totalRevenue = penjualanList.reduce((s, p) => s + ((parseInt(p.qty) || 0) * (parseFloat(p.harga) || 0)), 0);
    const totalStok = barangList.reduce((s, b) => s + (parseInt(b.stok) || 0), 0);

    // PO aktif = belum selesai (bukan Sudah Tiba / Sudah Dibongkar) DAN bukan Overdue
    const activePreOrder = preOrderList.filter(po => {
      const selesai = po.keterangan_status === 'Sudah Tiba' || po.keterangan_status === 'Sudah Dibongkar';
      if (selesai) return false;
      const { label } = getPOStatus(po.tanggal_po);
      return label !== 'Overdue';
    }).length;

    return { totalTerjual, totalRevenue, totalStok, activePreOrder };
  }, [barangList, penjualanList, preOrderList]);

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

  const channelData = useMemo(() => {
    const offline = penjualanList.filter(p => p.tipe === 'offline').reduce((s, p) => s + (parseInt(p.qty) || 0), 0);
    const online = penjualanList.filter(p => p.tipe === 'online').reduce((s, p) => s + (parseInt(p.qty) || 0), 0);
    return [
      { name: 'Offline', value: offline },
      { name: 'Reseller', value: online }
    ];
  }, [penjualanList]);

  const recentSales = penjualanList.slice(0, 10);
  const lowStok = barangList.filter(b => b.stok <= 5 && b.stok >= 0).slice(0, 5);

  // ── Pie chart data ─────────────────────────────────────

  // 1. Top 6 barang berdasarkan stok
  const stokDistData = useMemo(() => {
    return [...barangList]
      .filter(b => (parseInt(b.stok) || 0) > 0)
      .sort((a, b) => (parseInt(b.stok) || 0) - (parseInt(a.stok) || 0))
      .slice(0, 6)
      .map(b => ({
        label: b.kode || b.nama?.slice(0, 12) || '?',
        value: parseInt(b.stok) || 0,
      }));
  }, [barangList]);

  // 2. Status Pre Order breakdown
  const poStatusData = useMemo(() => {
    const counts = { 'Masih Dijalan': 0, 'Sudah Tiba': 0, 'Sudah Dibongkar': 0, 'Overdue': 0, 'Aktif': 0 };
    preOrderList.forEach(po => {
      const ket = po.keterangan_status;
      if (ket === 'Sudah Tiba')     { counts['Sudah Tiba']++;     return; }
      if (ket === 'Sudah Dibongkar'){ counts['Sudah Dibongkar']++; return; }
      if (ket === 'Masih Dijalan')  { counts['Masih Dijalan']++;   return; }
      const { label } = getPOStatus(po.tanggal_po);
      if (label === 'Overdue') counts['Overdue']++;
      else counts['Aktif']++;
    });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([label, value]) => ({ label, value }));
  }, [preOrderList]);

  // 3. Top 6 produk terjual (pie)
  const topSalesPieData = useMemo(() => {
    const map = {};
    penjualanList.forEach(p => {
      const key = p.kode_barang || p.nama_barang;
      if (!key) return;
      map[key] = (map[key] || 0) + (parseInt(p.qty) || 0);
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([label, value]) => ({ label, value }));
  }, [penjualanList]);

  // PO Mendesak: hanya yang belum Sudah Tiba / Sudah Dibongkar, dan status tanggal red/yellow
  const urgentPO = preOrderList
    .filter(po => {
      const selesai = po.keterangan_status === 'Sudah Tiba' || po.keterangan_status === 'Sudah Dibongkar';
      return !selesai;
    })
    .map(po => ({ ...po, status: getPOStatus(po.tanggal_po) }))
    .filter(po => po.status.color === 'red' || po.status.color === 'yellow')
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Terjual', value: loading ? '…' : stats.totalTerjual.toLocaleString(), icon: ShoppingCart, color: 'emerald' },
          { label: 'Total Revenue',  value: loading ? '…' : formatCurrency(stats.totalRevenue),  icon: TrendingUp,   color: 'blue' },
          { label: 'Total Stok',     value: loading ? '…' : stats.totalStok.toLocaleString(),     icon: Boxes,        color: 'violet' },
          { label: 'Pre Order Aktif',value: loading ? '…' : stats.activePreOrder.toString(),      icon: ClipboardList,color: 'amber' },
        ].map((card, idx) => (
          <AnimatedCard key={card.label} delay={idx * 0.08}>
            <StatCard label={card.label} value={card.value} icon={card.icon} color={card.color} loading={loading} />
          </AnimatedCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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

      {/* ── 3 Doughnut Pie Charts (Chart.js) ───────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <DoughnutChart
          title="Distribusi Stok"
          subtitle="Top 6 barang berdasarkan stok tersedia"
          data={stokDistData}
          loading={loading}
          centerLabel="unit"
        />
        <DoughnutChart
          title="Status Pre Order"
          subtitle="Breakdown status semua PO"
          data={poStatusData}
          loading={loading}
          centerLabel="PO"
        />
        <DoughnutChart
          title="Top Produk Terjual"
          subtitle="Top 6 produk berdasarkan unit terjual"
          data={topSalesPieData}
          loading={loading}
          centerLabel="unit"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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

        <div className="space-y-4">
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
                {urgentPO.map(po => {
                  const firstItem = po.items?.[0];
                  const itemCount = po.items?.length || 0;
                  return (
                    <div key={po.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 truncate">
                          {firstItem?.kode_barang
                            ? <span className="font-mono text-emerald-600">{firstItem.kode_barang}</span>
                            : <span className="text-slate-400">Tanggal PO</span>
                          }
                          {itemCount > 1 && <span className="text-slate-400 ml-1">+{itemCount - 1} item</span>}
                        </p>
                        <p className="text-xs text-slate-400">{po.tanggal_po} · {po.status.message}</p>
                      </div>
                      <span className={`ml-2 shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
                        po.status.color === 'red' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {po.status.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
