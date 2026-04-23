import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, Edit2, Trash2, Package,
  Upload, Download, RefreshCw, ChevronLeft, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getAllBarang, addBarang, updateBarang, deleteBarang
} from '../services/barangService';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { LoadingTable } from '../components/LoadingTable';
import { formatCurrency } from '../utils/helpers';
import { parseFile } from '../utils/importUtils';
import { exportToCSV, exportToExcel } from '../utils/exportUtils';

const PAGE_SIZE = 50;
const INITIAL_FORM = { nama: '', kode: '', satuan: 'pcs', harga_jual: '' };

export default function Barang() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importData, setImportData] = useState([]);
  const [importLoading, setImportLoading] = useState(false);
  const [columnMap, setColumnMap] = useState({ nama: '', kode: '', satuan: '', harga_jual: '' });
  const [importColumns, setImportColumns] = useState([]);

  const [deleteTarget, setDeleteTarget] = useState(null);

  async function loadData() {
    setLoading(true);
    try {
      const data = await getAllBarang();
      setList(data);
    } catch (err) {
      toast.error('Gagal memuat data: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return list.filter(b =>
      b.nama.toLowerCase().includes(q) ||
      (b.kode && b.kode.toLowerCase().includes(q))
    );
  }, [list, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openAdd() {
    setForm(INITIAL_FORM);
    setEditTarget(null);
    setModalOpen(true);
  }

  function openEdit(item) {
    setForm({ nama: item.nama, kode: item.kode || '', satuan: item.satuan, harga_jual: item.harga_jual });
    setEditTarget(item);
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nama.trim()) { toast.error('Nama barang wajib diisi'); return; }
    setSaving(true);
    try {
      if (editTarget) {
        await updateBarang(editTarget.id, form);
        toast.success('Barang berhasil diperbarui');
      } else {
        await addBarang(form);
        toast.success('Barang berhasil ditambahkan');
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
      await deleteBarang(deleteTarget.id);
      toast.success('Barang berhasil dihapus');
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImportLoading(true);
    try {
      const data = await parseFile(file);
      if (data.length === 0) { toast.error('File kosong atau tidak valid'); return; }
      setImportData(data);
      const cols = Object.keys(data[0]);
      setImportColumns(cols);
      const autoMap = { nama: '', kode: '', satuan: '', harga_jual: '' };
      cols.forEach(c => {
        const cl = c.toLowerCase();
        if (cl.includes('nama')) autoMap.nama = c;
        if (cl.includes('kode')) autoMap.kode = c;
        if (cl.includes('satuan')) autoMap.satuan = c;
        if (cl.includes('harga')) autoMap.harga_jual = c;
      });
      setColumnMap(autoMap);
      setImportModalOpen(true);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setImportLoading(false);
      e.target.value = '';
    }
  }

  async function executeImport() {
    if (!columnMap.nama) { toast.error('Kolom nama wajib dipetakan'); return; }
    setSaving(true);
    try {
      let added = 0;
      for (const row of importData) {
        const nama = row[columnMap.nama]?.toString().trim();
        if (!nama) continue;
        await addBarang({
          nama,
          kode: columnMap.kode ? row[columnMap.kode]?.toString().trim() : '',
          satuan: columnMap.satuan ? row[columnMap.satuan]?.toString().trim() : 'pcs',
          harga_jual: columnMap.harga_jual ? parseFloat(row[columnMap.harga_jual]) || 0 : 0
        });
        added++;
      }
      toast.success(`${added} barang berhasil diimpor`);
      setImportModalOpen(false);
      loadData();
    } catch (err) {
      toast.error('Import gagal: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleExportCSV() {
    const data = filtered.map(b => ({
      kode: b.kode || '',
      nama: b.nama,
      satuan: b.satuan,
      harga_jual: b.harga_jual,
      stok: b.stok
    }));
    exportToCSV(data, 'master_barang.csv');
    toast.success('Data diekspor ke CSV');
  }

  function handleExportExcel() {
    const data = filtered.map(b => ({
      Kode: b.kode || '',
      Nama: b.nama,
      Satuan: b.satuan,
      'Harga Jual': b.harga_jual,
      Stok: b.stok
    }));
    exportToExcel(data, 'master_barang.xlsx', 'Barang');
    toast.success('Data diekspor ke Excel');
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Cari nama atau kode barang..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={loadData}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <RefreshCw size={14} /> Refresh
            </button>
            <label className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
              <Upload size={14} />
              Import
              <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} className="hidden" />
            </label>
            <div className="relative group">
              <button className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                <Download size={14} /> Export
              </button>
              <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-slate-200 rounded-lg shadow-lg hidden group-hover:block z-10">
                <button onClick={handleExportCSV} className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">Export CSV</button>
                <button onClick={handleExportExcel} className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">Export Excel</button>
              </div>
            </div>
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors font-medium"
            >
              <Plus size={14} /> Tambah Barang
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          Menampilkan {paginated.length} dari {filtered.length} barang
          {search && ` (filter: "${search}")`}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Kode', 'Nama Barang', 'Satuan', 'Harga Jual', 'Stok', 'Aksi'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-slate-500 uppercase tracking-wider font-semibold whitespace-nowrap">
                    {h}
                  </th>
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
                      icon={Package}
                      title={search ? 'Tidak ada hasil pencarian' : 'Belum ada data barang'}
                      description={search ? `Tidak ada barang dengan kata kunci "${search}"` : 'Klik tombol Tambah Barang untuk menambahkan data'}
                      action={!search && (
                        <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
                          <Plus size={14} /> Tambah Barang
                        </button>
                      )}
                    />
                  </td>
                </tr>
              ) : (
                paginated.map(b => (
                  <tr key={b.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                        {b.kode || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-800 font-medium">{b.nama}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-md uppercase">{b.satuan}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-700 font-semibold">{formatCurrency(b.harga_jual)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${
                        b.stok === 0 ? 'bg-red-50 text-red-600' :
                        b.stok <= 5 ? 'bg-amber-50 text-amber-600' :
                        'bg-emerald-50 text-emerald-600'
                      }`}>
                        {b.stok}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEdit(b)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          <Edit2 size={11} /> Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(b)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-red-100 text-red-500 hover:bg-red-50 transition-colors"
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
            <p className="text-xs text-slate-500">
              Halaman {page} dari {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={13} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page + i - 2;
                if (p < 1 || p > totalPages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs transition-colors ${
                      page === p
                        ? 'bg-emerald-600 text-white border border-emerald-600'
                        : 'border border-slate-200 text-slate-600 hover:bg-white'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? 'Edit Barang' : 'Tambah Barang Baru'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1.5">Kode Barang</label>
            <input
              type="text"
              value={form.kode}
              onChange={e => setForm(f => ({ ...f, kode: e.target.value }))}
              placeholder="Cth: BRG-001"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1.5">Nama Barang <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.nama}
              onChange={e => setForm(f => ({ ...f, nama: e.target.value }))}
              placeholder="Masukkan nama barang"
              required
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1.5">Satuan</label>
              <select
                value={form.satuan}
                onChange={e => setForm(f => ({ ...f, satuan: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 bg-white"
              >
                {['pcs', 'unit', 'box', 'karton', 'lusin', 'kg', 'liter', 'meter', 'roll', 'set'].map(s => (
                  <option key={s} value={s}>{s.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1.5">Harga Jual</label>
              <input
                type="number"
                value={form.harga_jual}
                onChange={e => setForm(f => ({ ...f, harga_jual: e.target.value }))}
                placeholder="0"
                min="0"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-60"
            >
              {saving ? 'Menyimpan…' : editTarget ? 'Perbarui' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="Mapping Kolom Import"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-700">
            📋 File berhasil dibaca. Petakan kolom file ke field yang sesuai.
            <br />
            <span className="text-xs text-blue-500">{importData.length} baris ditemukan</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: 'nama', label: 'Nama Barang *', required: true },
              { key: 'kode', label: 'Kode Barang', required: false },
              { key: 'satuan', label: 'Satuan', required: false },
              { key: 'harga_jual', label: 'Harga Jual', required: false }
            ].map(field => (
              <div key={field.key}>
                <label className="block text-sm text-slate-600 mb-1.5">
                  {field.label}
                </label>
                <select
                  value={columnMap[field.key]}
                  onChange={e => setColumnMap(m => ({ ...m, [field.key]: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
                >
                  <option value="">— Tidak dipetakan —</option>
                  {importColumns.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          {importData.length > 0 && columnMap.nama && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Preview (5 baris pertama):</p>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      {['Nama', 'Kode', 'Satuan', 'Harga'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importData.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-3 py-1.5 text-slate-700">{row[columnMap.nama] || '—'}</td>
                        <td className="px-3 py-1.5 text-slate-700">{columnMap.kode ? row[columnMap.kode] || '—' : '—'}</td>
                        <td className="px-3 py-1.5 text-slate-700">{columnMap.satuan ? row[columnMap.satuan] || '—' : '—'}</td>
                        <td className="px-3 py-1.5 text-slate-700">{columnMap.harga_jual ? row[columnMap.harga_jual] || '—' : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setImportModalOpen(false)}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              onClick={executeImport}
              disabled={saving || !columnMap.nama}
              className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? 'Mengimpor…' : `Import ${importData.length} Data`}
            </button>
          </div>
        </div>
      </Modal>
      
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        title="Hapus Barang"
        message={`Yakin ingin menghapus "${deleteTarget?.nama}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
      />
    </div>
  );
}
