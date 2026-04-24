import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Edit2, Trash2, RefreshCw, PackageOpen,
  History, CheckCircle, AlertTriangle, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { getAllBongkaran, updateBongkaran, selesaikanBongkaran, deleteBongkaran } from '../services/bongkaranService';
import { subscribeBongkaran } from '../services/realtimeService';
import { useRealtimeFirestore } from '../hooks/useRealtime';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { LoadingTable } from '../components/LoadingTable';
import { AnimatedCard } from '../components/motionComponents';
import { formatDate } from '../utils/helpers';

/* ─── Status badge helpers ────────────────────────────── */
const STATUS_STYLE = {
  'Menunggu Revisi': 'bg-amber-50 text-amber-700 border border-amber-100',
  'Sudah Dibongkar': 'bg-emerald-50 text-emerald-700 border border-emerald-100',
};

/* ─── Single item row: preview + inline edit toggle ───── */
function ItemRevisiRow({ item, index, onChange }) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      {/* Preview row — always visible */}
      <div className="flex items-start gap-3 px-4 py-3 bg-white">
        {/* Barang info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
              {item.kode_barang || '—'}
            </span>
            <span className="text-sm font-semibold text-slate-800">{item.deskripsi || '—'}</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span><span className="font-medium text-slate-400">Box</span> {item.box || <em className="text-slate-300">—</em>}</span>
            <span><span className="font-medium text-slate-400">Isi</span> {item.isi || <em className="text-slate-300">—</em>}</span>
            <span><span className="font-medium text-slate-400">Qty</span> <strong className="text-slate-700">{item.qty || 0}</strong> pcs</span>
            {item.catatan && <span><span className="font-medium text-slate-400">Ket.</span> {item.catatan}</span>}
          </div>
        </div>
        {/* Edit toggle button */}
        <button
          type="button"
          onClick={() => setEditing(e => !e)}
          className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            editing
              ? 'bg-slate-100 border-slate-200 text-slate-600'
              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-emerald-600 hover:border-emerald-200'
          }`}
        >
          <Edit2 size={11} />
          {editing ? 'Tutup' : 'Edit'}
        </button>
      </div>

      {/* Inline edit fields — only when editing */}
      {editing && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="border-t border-slate-100 bg-slate-50 px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Box</label>
            <input
              type="text"
              value={item.box || ''}
              onChange={e => onChange(index, { box: e.target.value })}
              placeholder="Cth: AA"
              className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Isi</label>
            <input
              type="text"
              value={item.isi || ''}
              onChange={e => onChange(index, { isi: e.target.value })}
              placeholder="Cth: 10 pcs"
              className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Qty <span className="text-red-400">*</span></label>
            <input
              type="number"
              value={item.qty || ''}
              onChange={e => onChange(index, { qty: e.target.value })}
              placeholder="0"
              min="0"
              className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Keterangan</label>
            <input
              type="text"
              value={item.catatan || ''}
              onChange={e => onChange(index, { catatan: e.target.value })}
              placeholder="Opsional"
              className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
            />
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ─── Bongkaran Card ───────────────────────────────────── */
function BongkaranCard({ bongkaran, onRevisi, onSelesai, onDelete, isSuperAdmin }) {
  const [expanded, setExpanded] = useState(false);
  const isDone = bongkaran.status === 'Sudah Dibongkar';

  return (
    <div className={`bg-white rounded-xl border overflow-hidden ${isDone ? 'border-emerald-100' : 'border-slate-200'}`}>
      <div
        className={`flex items-center justify-between px-4 py-3 cursor-pointer ${isDone ? 'bg-emerald-50/40' : 'bg-white'}`}
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div>
            <p className="text-sm font-semibold text-slate-800">PO: {bongkaran.tanggal_po}</p>
            <p className="text-xs text-slate-400">{formatDate(bongkaran.created_at)} · {bongkaran.items?.length || 0} item</p>
          </div>
          <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_STYLE[bongkaran.status] || 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
            {isDone ? <CheckCircle size={10} /> : <AlertTriangle size={10} />}
            {bongkaran.status}
          </span>
        </div>
        <div className="flex items-center gap-2 ml-2">
          {!isDone && (
            <>
              <button
                onClick={e => { e.stopPropagation(); onRevisi(bongkaran); }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
              >
                <Edit2 size={11} /> Revisi
              </button>
              <button
                onClick={e => { e.stopPropagation(); onSelesai(bongkaran); }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <CheckCircle size={11} /> Selesai
              </button>
            </>
          )}
          {isSuperAdmin && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(bongkaran); }}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-red-100 text-red-500 hover:bg-red-50"
            >
              <Trash2 size={11} />
            </button>
          )}
          {expanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4">
          <div className="border border-slate-100 rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100">
              <span className="col-span-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Barang</span>
              <span className="col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Box</span>
              <span className="col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Isi</span>
              <span className="col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Qty</span>
              <span className="col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Keterangan</span>
            </div>
            <div className="px-3">
              {(bongkaran.items || []).map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 py-2.5 border-b border-slate-50 last:border-0">
                  <div className="col-span-4">
                    <p className="text-xs font-mono font-bold text-emerald-600">{item.kode_barang || '—'}</p>
                    <p className="text-sm text-slate-700 truncate">{item.deskripsi || '—'}</p>
                  </div>
                  <div className="col-span-2 text-sm text-slate-600">{item.box || '—'}</div>
                  <div className="col-span-2 text-sm text-slate-600">{item.isi || '—'}</div>
                  <div className="col-span-2 text-sm font-bold text-slate-700">{item.qty || 0} <span className="text-xs font-normal text-slate-400">pcs</span></div>
                  <div className="col-span-2 text-sm text-slate-500 truncate">{item.catatan || '—'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ────────────────────────────────────────── */
export default function Bongkaran() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  const { data: list, loading, refresh: loadData } = useRealtimeFirestore(
    subscribeBongkaran,
    getAllBongkaran,
    30000
  );

  const [search, setSearch]       = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');

  // Modal revisi
  const [revisiTarget, setRevisiTarget] = useState(null);
  const [revisiItems, setRevisiItems]   = useState([]);
  const [saving, setSaving]             = useState(false);

  // Confirm selesai
  const [selesaiTarget, setSelesaiTarget] = useState(null);
  const [deleteTarget, setDeleteTarget]   = useState(null);

  /* filter */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return list.filter(b => {
      const matchSearch = !q ||
        b.tanggal_po?.toLowerCase().includes(q) ||
        b.items?.some(item =>
          item.kode_barang?.toLowerCase().includes(q) ||
          item.deskripsi?.toLowerCase().includes(q)
        );
      let matchDate = true;
      if (startDate || endDate) {
        const d = new Date(b.tanggal_po);
        if (startDate) matchDate = matchDate && d >= new Date(startDate);
        if (endDate) {
          const end = new Date(endDate); end.setHours(23,59,59,999);
          matchDate = matchDate && d <= end;
        }
      }
      return matchSearch && matchDate;
    });
  }, [list, search, startDate, endDate]);

  const pending  = useMemo(() => filtered.filter(b => b.status !== 'Sudah Dibongkar'), [filtered]);
  const history  = useMemo(() => filtered.filter(b => b.status === 'Sudah Dibongkar'), [filtered]);

  /* open revisi modal */
  function openRevisi(b) {
    setRevisiTarget(b);
    setRevisiItems(b.items ? b.items.map(i => ({ ...i })) : []);
  }

  function updateRevisiItem(index, updates) {
    setRevisiItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  }

  async function handleSaveRevisi() {
    if (!revisiTarget) return;
    setSaving(true);
    try {
      await updateBongkaran(revisiTarget.id, { items: revisiItems });
      toast.success('Revisi berhasil disimpan');
      setRevisiTarget(null);
      loadData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSelesai() {
    if (!selesaiTarget) return;
    try {
      await selesaikanBongkaran(selesaiTarget.id, selesaiTarget);
      toast.success('Bongkaran selesai! Data masuk ke Barang Masuk.');
      setSelesaiTarget(null);
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteBongkaran(deleteTarget.id);
      toast.success('Data bongkaran dihapus');
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="space-y-5">

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Menunggu Revisi', value: list.filter(b => b.status !== 'Sudah Dibongkar').length, color: 'amber' },
          { label: 'Sudah Dibongkar', value: list.filter(b => b.status === 'Sudah Dibongkar').length, color: 'green' },
          { label: 'Total Bongkaran', value: list.length, color: 'blue' },
        ].map((card, idx) => (
          <AnimatedCard key={card.label} delay={idx * 0.08} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider">{card.label}</p>
            <motion.p
              key={card.value}
              className={`text-2xl font-bold mt-1 ${
                card.color === 'amber' ? 'text-amber-600' :
                card.color === 'green' ? 'text-emerald-600' : 'text-slate-800'
              }`}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25 }}
            >
              {loading ? '…' : card.value}
            </motion.p>
          </AnimatedCard>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col gap-3">
          {/* Row 1: Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari kode, deskripsi, atau tanggal PO..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
            />
          </div>
          {/* Row 2: Date range + Refresh */}
          <div className="flex gap-2 items-center">
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 flex-1 min-w-0">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="py-1.5 text-sm text-slate-600 bg-transparent focus:outline-none w-full min-w-0" />
              <span className="text-slate-400 text-xs shrink-0">sd</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="py-1.5 text-sm text-slate-600 bg-transparent focus:outline-none w-full min-w-0" />
            </div>
            <button onClick={loadData} className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
              <RefreshCw size={14} /> <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pending bongkaran */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-amber-50/50 flex items-center gap-2">
          <PackageOpen size={16} className="text-amber-600" />
          <h2 className="font-semibold text-amber-800 text-sm">Menunggu Revisi</h2>
          <span className="ml-auto text-xs text-amber-600 font-semibold bg-amber-100 px-2 py-0.5 rounded-full">{pending.length}</span>
        </div>
        {loading ? (
          <div className="p-4"><LoadingTable cols={4} rows={3} /></div>
        ) : pending.length === 0 ? (
          <EmptyState icon={PackageOpen} title="Tidak ada yang perlu direvisi" description="Semua PO berstatus 'Sudah Tiba' akan muncul di sini untuk direvisi" />
        ) : (
          <div className="p-4 space-y-3">
            {pending.map(b => (
              <BongkaranCard
                key={b.id}
                bongkaran={b}
                onRevisi={openRevisi}
                onSelesai={setSelesaiTarget}
                onDelete={setDeleteTarget}
                isSuperAdmin={isSuperAdmin}
              />
            ))}
          </div>
        )}
      </div>

      {/* History sudah dibongkar */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-emerald-50/50 flex items-center gap-2">
          <History size={16} className="text-emerald-600" />
          <h2 className="font-semibold text-emerald-800 text-sm">History Bongkaran (Sudah Dibongkar)</h2>
          <span className="ml-auto text-xs text-emerald-600 font-semibold bg-emerald-100 px-2 py-0.5 rounded-full">{history.length}</span>
        </div>
        {loading ? (
          <div className="p-4"><LoadingTable cols={4} rows={3} /></div>
        ) : history.length === 0 ? (
          <EmptyState icon={History} title="Belum ada history" description="Bongkaran yang sudah diselesaikan akan muncul di sini" />
        ) : (
          <div className="p-4 space-y-3">
            {history.map(b => (
              <BongkaranCard
                key={b.id}
                bongkaran={b}
                onRevisi={openRevisi}
                onSelesai={setSelesaiTarget}
                onDelete={setDeleteTarget}
                isSuperAdmin={isSuperAdmin}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal Revisi */}
      <Modal
        isOpen={!!revisiTarget}
        onClose={() => setRevisiTarget(null)}
        title={`Revisi Bongkaran — PO ${revisiTarget?.tanggal_po || ''}`}
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Cek detail tiap produk. Klik <strong className="text-slate-600">Edit</strong> pada item yang perlu diubah, lalu simpan.
          </p>
          <div className="max-h-[55vh] overflow-y-auto space-y-2 pr-0.5">
            {revisiItems.map((item, index) => (
              <ItemRevisiRow
                key={index}
                item={item}
                index={index}
                onChange={updateRevisiItem}
              />
            ))}
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setRevisiTarget(null)}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSaveRevisi}
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? 'Menyimpan…' : 'Simpan Revisi'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm selesai */}
      <ConfirmDialog
        isOpen={!!selesaiTarget}
        onConfirm={handleSelesai}
        onCancel={() => setSelesaiTarget(null)}
        title="Konfirmasi Selesai Bongkar"
        message={`Bongkaran PO ${selesaiTarget?.tanggal_po} akan ditandai Sudah Dibongkar dan semua itemnya akan masuk ke Barang Masuk serta menambah stok. Lanjutkan?`}
        confirmLabel="Ya, Selesaikan"
      />

      {/* Confirm delete */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        title="Hapus Data Bongkaran"
        message={`Hapus bongkaran PO ${deleteTarget?.tanggal_po}? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
      />
    </div>
  );
}
