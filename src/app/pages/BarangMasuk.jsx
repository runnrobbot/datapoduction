import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, Edit2, Trash2, PackagePlus,
  RefreshCw, ChevronLeft, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { getAllMasuk, addMasuk, updateMasuk, deleteMasuk } from '../services/masukService';
import { subscribeBarangMasuk } from '../services/realtimeService';
import { getAllBarang } from '../services/barangService';
import { useRealtimeFirestore } from '../hooks/useRealtime';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { LoadingTable } from '../components/LoadingTable';
import { SearchDropdown } from '../components/SearchDropdown';
import { formatDate } from '../utils/helpers';

const PAGE_SIZE = 50;

export default function BarangMasuk() {
  const [barangList, setBarangList] = useState([]);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [selectedBarang, setSelectedBarang] = useState(null);
  const [qty, setQty] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: list, loading, refresh: loadAll } = useRealtimeFirestore(
    subscribeBarangMasuk,
    getAllMasuk,
    30000
  );

  useEffect(() => {
    getAllBarang().then(setBarangList).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return list.filter(m => {
      const matchSearch = m.nama_barang?.toLowerCase().includes(q) ||
        m.kode_barang?.toLowerCase().includes(q) ||
        m.keterangan?.toLowerCase().includes(q);
      
      let matchDate = true;
      if (startDate || endDate) {
        const itemDate = new Date(m.created_at?.toDate ? m.created_at.toDate() : m.created_at);
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          matchDate = matchDate && itemDate >= start;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          matchDate = matchDate && itemDate <= end;
        }
      }

      return matchSearch && matchDate;
    });
  }, [list, search, startDate, endDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openAdd() {
    setEditTarget(null);
    setSelectedBarang(null);
    setQty('');
    setKeterangan('');
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditTarget(item);
    const barang = barangList.find(b => b.id === item.barang_id);
    setSelectedBarang(barang || { id: item.barang_id, kode: item.kode_barang, nama: item.nama_barang, satuan: item.satuan, stok: 0 });
    setQty(item.qty.toString());
    setKeterangan(item.keterangan || '');
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedBarang) { toast.error('Pilih barang terlebih dahulu'); return; }
    if (!qty || parseInt(qty) <= 0) { toast.error('Qty harus lebih dari 0'); return; }
    setSaving(true);
    try {
      if (editTarget) {
        await updateMasuk(editTarget.id, editTarget.qty, parseInt(qty), selectedBarang.id, keterangan);
        toast.success('Data barang masuk diperbarui');
      } else {
        await addMasuk({
          barang_id: selectedBarang.id,
          kode_barang: selectedBarang.kode || '',
          nama_barang: selectedBarang.nama,
          satuan: selectedBarang.satuan,
          qty: parseInt(qty),
          keterangan
        });
        toast.success(`Stok ${selectedBarang.nama} bertambah ${qty} ${selectedBarang.satuan}`);
      }
      setModalOpen(false);
      loadAll();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMasuk(deleteTarget.id);
      toast.success('Data barang masuk dihapus dan stok dirollback');
      setDeleteTarget(null);
      loadAll();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Cari nama, kode, atau keterangan..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
            />
          </div>
          <div className="flex gap-2 items-center">
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 flex-1 min-w-0">
              <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }} className="py-1.5 text-sm text-slate-600 bg-transparent focus:outline-none w-full min-w-0" />
              <span className="text-slate-400 text-xs shrink-0">sd</span>
              <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }} className="py-1.5 text-sm text-slate-600 bg-transparent focus:outline-none w-full min-w-0" />
            </div>
            <button onClick={loadAll} className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
              <RefreshCw size={14} /> <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={openAdd}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-medium"
            >
              <Plus size={14} /> <span className="hidden sm:inline">Tambah Masuk</span><span className="sm:hidden">Masuk</span>
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          {filtered.length} catatan ditemukan
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Tanggal', 'Kode', 'Nama Barang', 'Qty', 'Keterangan', 'Aksi'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-slate-500 uppercase tracking-wider font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4"><LoadingTable cols={6} rows={8} /></td></tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={PackagePlus}
                      title={search ? 'Tidak ada hasil' : 'Belum ada catatan barang masuk'}
                      description="Klik Tambah Masuk untuk mencatat penerimaan stok"
                      action={!search && (
                        <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
                          <Plus size={14} /> Tambah Masuk
                        </button>
                      )}
                    />
                  </td>
                </tr>
              ) : (
                paginated.map(m => (
                  <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDate(m.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                        {m.kode_barang || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-800 font-medium">{m.nama_barang}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-blue-600">+{m.qty}</span>
                      <span className="text-xs text-slate-400 ml-1">{m.satuan}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 max-w-[160px] truncate">
                      {m.keterangan || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEdit(m)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                        >
                          <Edit2 size={11} /> Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(m)}
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

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-500">Halaman {page} dari {totalPages}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronLeft size={13} />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? 'Edit Barang Masuk' : 'Tambah Barang Masuk'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1.5">Barang <span className="text-red-500">*</span></label>
            {editTarget ? (
              <div className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700">
                <span className="font-mono font-semibold text-emerald-600">{selectedBarang?.kode || '—'}</span>
                <span className="ml-2">{selectedBarang?.nama}</span>
              </div>
            ) : (
              <SearchDropdown
                barangList={barangList}
                value={selectedBarang?.id}
                onChange={b => setSelectedBarang(b)}
              />
            )}
          </div>

          {selectedBarang && !editTarget && (
            <div className="bg-slate-50 rounded-lg p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Satuan</p>
                <p className="text-sm font-semibold text-slate-700">{selectedBarang.satuan.toUpperCase()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Stok Saat Ini</p>
                <p className={`text-sm font-bold ${selectedBarang.stok <= 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {selectedBarang.stok} {selectedBarang.satuan}
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm text-slate-600 mb-1.5">Jumlah Masuk <span className="text-red-500">*</span></label>
            <input
              type="number"
              value={qty}
              onChange={e => setQty(e.target.value)}
              placeholder="Masukkan jumlah"
              min="1"
              required
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1.5">Keterangan</label>
            <textarea
              value={keterangan}
              onChange={e => setKeterangan(e.target.value)}
              placeholder="Cth: Pembelian dari supplier, dst..."
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
              {saving ? 'Menyimpan…' : editTarget ? 'Perbarui' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        title="Hapus Catatan Masuk"
        message={`Hapus catatan ${deleteTarget?.qty} ${deleteTarget?.satuan} ${deleteTarget?.nama_barang}? Stok akan dirollback.`}
        confirmLabel="Hapus"
      />
    </div>
  );
}
