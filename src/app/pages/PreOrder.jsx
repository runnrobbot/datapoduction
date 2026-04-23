import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, Edit2, Trash2, ClipboardList,
  RefreshCw, Clock, AlertTriangle, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { getAllPreOrder, addPreOrder, updatePreOrder, deletePreOrder } from '../services/preOrderService';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { LoadingTable } from '../components/LoadingTable';
import { getPOStatus, formatDate } from '../utils/helpers';

const STATUS_FILTER = ['all', 'Overdue', 'Urgent', 'Segera', 'Masih Lama'];

const INITIAL_FORM = {
  tanggal_po: '',
  kode_barang: '',
  deskripsi: '',
  qty: '',
  catatan: ''
};

export default function PreOrder() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState(null);

  async function loadData() {
    setLoading(true);
    try {
      const data = await getAllPreOrder();
      setList(data);
    } catch (err) {
      toast.error('Gagal memuat data: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  // Enrich list with status
  const enriched = useMemo(() => {
    return list.map(po => ({
      ...po,
      status: getPOStatus(po.tanggal_po)
    }));
  }, [list]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return enriched.filter(po => {
      const matchSearch = !q ||
        po.kode_barang?.toLowerCase().includes(q) ||
        po.deskripsi?.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || po.status.label === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [enriched, search, statusFilter]);

  // Summary counts
  const counts = useMemo(() => {
    return enriched.reduce((acc, po) => {
      acc[po.status.label] = (acc[po.status.label] || 0) + 1;
      return acc;
    }, {});
  }, [enriched]);

  function openAdd() {
    setForm({ ...INITIAL_FORM, tanggal_po: new Date().toISOString().split('T')[0] });
    setEditTarget(null);
    setModalOpen(true);
  }

  function openEdit(item) {
    setForm({
      tanggal_po: item.tanggal_po || '',
      kode_barang: item.kode_barang || '',
      deskripsi: item.deskripsi || '',
      qty: item.qty?.toString() || '',
      catatan: item.catatan || ''
    });
    setEditTarget(item);
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.tanggal_po) { toast.error('Tanggal PO wajib diisi'); return; }
    if (!form.deskripsi.trim()) { toast.error('Deskripsi wajib diisi'); return; }
    if (!form.qty || parseInt(form.qty) <= 0) { toast.error('Quantity harus lebih dari 0'); return; }
    setSaving(true);
    try {
      if (editTarget) {
        await updatePreOrder(editTarget.id, form);
        toast.success('Pre Order berhasil diperbarui');
      } else {
        await addPreOrder(form);
        toast.success('Pre Order berhasil ditambahkan');
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deletePreOrder(deleteTarget.id);
      toast.success('Pre Order dihapus');
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  }

  const statusBadgeClass = (color) => {
    if (color === 'red') return 'bg-red-50 text-red-600 border border-red-100';
    if (color === 'yellow') return 'bg-amber-50 text-amber-600 border border-amber-100';
    if (color === 'green') return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
    return 'bg-slate-50 text-slate-500 border border-slate-200';
  };

  const statusIcon = (color) => {
    if (color === 'red') return <AlertTriangle size={10} className="text-red-500" />;
    if (color === 'yellow') return <Clock size={10} className="text-amber-500" />;
    return <CheckCircle size={10} className="text-emerald-500" />;
  };

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total PO', value: enriched.length, color: 'blue' },
          { label: 'Overdue', value: counts['Overdue'] || 0, color: 'red' },
          { label: 'Urgent / Segera', value: (counts['Urgent'] || 0) + (counts['Segera'] || 0), color: 'amber' },
          { label: 'Masih Lama', value: counts['Masih Lama'] || 0, color: 'green' }
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider">{card.label}</p>
            <p className={`text-2xl font-bold mt-1 ${
              card.color === 'red' ? 'text-red-600' :
              card.color === 'amber' ? 'text-amber-600' :
              card.color === 'green' ? 'text-emerald-600' :
              'text-slate-800'
            }`}>{loading ? '…' : card.value}</p>
          </div>
        ))}
      </div>

      {/* Header Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari kode atau deskripsi..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              {STATUS_FILTER.map(s => (
                <option key={s} value={s}>{s === 'all' ? 'Semua Status' : s}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadData} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
              <RefreshCw size={14} />
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-medium"
            >
              <Plus size={14} /> Tambah PO
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Tanggal PO', 'Kode Barang', 'Deskripsi', 'Qty', 'Status', 'Countdown', 'Aksi'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-slate-500 uppercase tracking-wider font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4"><LoadingTable cols={7} rows={6} /></td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={ClipboardList}
                      title={search || statusFilter !== 'all' ? 'Tidak ada hasil' : 'Belum ada Pre Order'}
                      description="Klik Tambah PO untuk membuat pre-order baru"
                      action={(!search && statusFilter === 'all') && (
                        <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
                          <Plus size={14} /> Tambah PO
                        </button>
                      )}
                    />
                  </td>
                </tr>
              ) : (
                filtered.map(po => (
                  <tr key={po.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                    po.status.color === 'red' ? 'border-l-2 border-l-red-400' :
                    po.status.color === 'yellow' ? 'border-l-2 border-l-amber-400' : ''
                  }`}>
                    <td className="px-4 py-3">
                      <p className="text-xs text-slate-700 font-medium whitespace-nowrap">{po.tanggal_po}</p>
                      <p className="text-xs text-slate-400">{formatDate(po.created_at)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                        {po.kode_barang || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-800 font-medium max-w-[180px] truncate">{po.deskripsi}</p>
                      {po.catatan && <p className="text-xs text-slate-400 truncate max-w-[180px]">{po.catatan}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-slate-700">{po.qty}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold ${statusBadgeClass(po.status.color)}`}>
                        {statusIcon(po.status.color)}
                        {po.status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className={`text-sm font-semibold ${
                        po.status.color === 'red' ? 'text-red-600' :
                        po.status.color === 'yellow' ? 'text-amber-600' :
                        'text-emerald-600'
                      }`}>
                        {po.status.message}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEdit(po)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                        >
                          <Edit2 size={11} /> Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(po)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-red-100 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 size={11} /> Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-3">Keterangan Status</p>
        <div className="flex flex-wrap gap-4">
          {[
            { label: 'Masih Lama', desc: '> 7 hari', color: 'green' },
            { label: 'Segera', desc: '3–7 hari lagi', color: 'yellow' },
            { label: 'Urgent', desc: '0–2 hari lagi', color: 'red' },
            { label: 'Overdue', desc: 'Tanggal telah lewat', color: 'red' }
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${statusBadgeClass(s.color)}`}>
                {s.label}
              </span>
              <span className="text-xs text-slate-400">{s.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? 'Edit Pre Order' : 'Tambah Pre Order Baru'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1.5">Tanggal PO <span className="text-red-500">*</span></label>
            <input
              type="date"
              value={form.tanggal_po}
              onChange={e => setForm(f => ({ ...f, tanggal_po: e.target.value }))}
              required
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
            />
            {form.tanggal_po && (
              <div className={`mt-2 inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full ${
                statusBadgeClass(getPOStatus(form.tanggal_po).color)
              }`}>
                {statusIcon(getPOStatus(form.tanggal_po).color)}
                {getPOStatus(form.tanggal_po).label} — {getPOStatus(form.tanggal_po).message}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1.5">Kode Barang</label>
            <input
              type="text"
              value={form.kode_barang}
              onChange={e => setForm(f => ({ ...f, kode_barang: e.target.value }))}
              placeholder="Cth: BRG-001"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1.5">Deskripsi <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.deskripsi}
              onChange={e => setForm(f => ({ ...f, deskripsi: e.target.value }))}
              placeholder="Nama barang atau deskripsi pesanan"
              required
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1.5">Quantity <span className="text-red-500">*</span></label>
            <input
              type="number"
              value={form.qty}
              onChange={e => setForm(f => ({ ...f, qty: e.target.value }))}
              placeholder="0"
              min="1"
              required
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1.5">Catatan</label>
            <textarea
              value={form.catatan}
              onChange={e => setForm(f => ({ ...f, catatan: e.target.value }))}
              placeholder="Informasi tambahan, supplier, dst..."
              rows={2}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
              Batal
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
              {saving ? 'Menyimpan…' : editTarget ? 'Perbarui' : 'Simpan PO'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        title="Hapus Pre Order"
        message={`Hapus PO "${deleteTarget?.deskripsi}" (${deleteTarget?.kode_barang || '—'})? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus PO"
      />
    </div>
  );
}
