import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Search, Trash2, ShoppingCart, RefreshCw,
  Upload, Download, ChevronLeft, ChevronRight, Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { getAllPenjualan, addPenjualan, deletePenjualan, batchImportPenjualan } from '../services/penjualanService';
import { subscribePenjualan } from '../services/realtimeService';
import { getAllBarang } from '../services/barangService';
import { useRealtimeFirestore } from '../hooks/useRealtime';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { LoadingTable } from '../components/LoadingTable';
import { SearchDropdown } from '../components/SearchDropdown';
import { AnimatedCard } from '../components/motionComponents';
import { formatDate, formatCurrency } from '../utils/helpers';
import { parseFile, parseCAFile } from '../utils/importUtils';
import { exportToCSV, exportToExcel } from '../utils/exportUtils';

const PAGE_SIZE = 50;

export default function Penjualan() {
  const [barangList, setBarangList] = useState([]);
  const [search, setSearch] = useState('');
  const [filterTipe, setFilterTipe] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBarang, setSelectedBarang] = useState(null);
  const [qty, setQty] = useState('');
  const [tipe, setTipe] = useState('offline');
  const [harga, setHarga] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [saving, setSaving] = useState(false);

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importData, setImportData] = useState([]);
  const [importColumns, setImportColumns] = useState([]);
  const [importMap, setImportMap] = useState({
    kode_barang: '', nama_barang: '', qty: '', tipe: '', harga: '', keterangan: '', tanggal: ''
  });
  const [caImport, setCaImport] = useState(null); // { rows, skipped } untuk CA format
  const importRef = useRef(null);

  const [deleteTarget, setDeleteTarget] = useState(null);

  const [showExport, setShowExport] = useState(false);

  const { data: list, loading, refresh: loadAll } = useRealtimeFirestore(
    subscribePenjualan,
    getAllPenjualan,
    30000
  );

  useEffect(() => {
    getAllBarang().then(setBarangList).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedBarang) {
      setHarga(selectedBarang.harga_jual?.toString() || '');
    }
  }, [selectedBarang]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return list.filter(p => {
      const matchSearch = !q ||
        p.nama_barang?.toLowerCase().includes(q) ||
        p.kode_barang?.toLowerCase().includes(q);
      const matchTipe = filterTipe === 'all' || p.tipe === filterTipe;
      
      let matchDate = true;
      if (startDate || endDate) {
        const itemDate = new Date(p.created_at?.toDate ? p.created_at.toDate() : p.created_at);
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

      return matchSearch && matchTipe && matchDate;
    });
  }, [list, search, filterTipe, startDate, endDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const summary = useMemo(() => {
    const totalQty = filtered.reduce((s, p) => s + (parseInt(p.qty) || 0), 0);
    const totalRevenue = filtered.reduce((s, p) => s + ((parseInt(p.qty) || 0) * (parseFloat(p.harga) || 0)), 0);
    return { totalQty, totalRevenue };
  }, [filtered]);

  function openAdd() {
    setSelectedBarang(null);
    setQty('');
    setTipe('offline');
    setHarga('');
    setKeterangan('');
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedBarang) { toast.error('Pilih barang terlebih dahulu'); return; }
    if (!qty || parseInt(qty) <= 0) { toast.error('Qty harus lebih dari 0'); return; }
    if (!harga || parseFloat(harga) < 0) { toast.error('Harga tidak valid'); return; }
    setSaving(true);
    try {
      await addPenjualan({
        barang_id: selectedBarang.id,
        kode_barang: selectedBarang.kode || '',
        nama_barang: selectedBarang.nama,
        satuan: selectedBarang.satuan,
        qty: parseInt(qty),
        tipe,
        harga: parseFloat(harga),
        keterangan
      });
      toast.success('Penjualan berhasil dicatat');
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
      await deletePenjualan(deleteTarget.id);
      toast.success('Transaksi dibatalkan dan stok dikembalikan');
      setDeleteTarget(null);
      loadAll();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      // Coba deteksi format CA terlebih dahulu
      const caResult = await parseCAFile(file);
      if (caResult.isCAFormat) {
        if (!caResult.rows.length) {
          toast.error('Tidak ada data invoice valid (harus diawali INV) di file ini');
          return;
        }
        setCaImport(caResult);
        setImportData([]);
        setImportModalOpen(true);
        return;
      }

      // Format biasa
      const data = await parseFile(file);
      if (!data.length) { toast.error('File kosong'); return; }
      const cols = Object.keys(data[0]);
      setImportColumns(cols);
      setImportData(data);
      setCaImport(null);
      const map = { kode_barang: '', nama_barang: '', qty: '', tipe: '', harga: '', keterangan: '', tanggal: '' };
      cols.forEach(c => {
        const cl = c.toLowerCase();
        if (cl.includes('kode')) map.kode_barang = c;
        if (cl.includes('nama')) map.nama_barang = c;
        if (cl.includes('qty') || cl.includes('jumlah')) map.qty = c;
        if (cl.includes('tipe') || cl.includes('channel')) map.tipe = c;
        if (cl.includes('harga')) map.harga = c;
        if (cl.includes('ket')) map.keterangan = c;
        if (cl.includes('tanggal') || cl.includes('date')) map.tanggal = c;
      });
      setImportMap(map);
      setImportModalOpen(true);
    } catch (err) {
      toast.error(err.message);
    } finally {
      if (importRef.current) importRef.current.value = '';
    }
  }

  async function executeImport() {
    setSaving(true);
    try {
      // Format CA: langsung import rows yang sudah di-parse
      if (caImport) {
        const items = caImport.rows.map(row => ({
          kode_barang: '',
          nama_barang: row.keterangan || row.no_invoice,
          qty:         row.kts_keluar || 0,
          tipe:        'offline',
          harga:       0,
          keterangan:  row.keterangan || '',
          kota:        row.kota       || '',
          no_invoice:  row.no_invoice || '',
          tanggal:     row.tanggal    || '',
          satuan:      'pcs',
        }));
        await batchImportPenjualan(items);
        toast.success(`${items.length} data CA berhasil diimpor${caImport.skipped ? ` (${caImport.skipped} baris dilewati bukan INV)` : ''}`);
        toast.info('Catatan: Stok tidak diperbarui secara otomatis untuk import massal');
        setImportModalOpen(false);
        setCaImport(null);
        loadAll();
        return;
      }

      // Format biasa
      if (!importMap.nama_barang && !importMap.kode_barang) {
        toast.error('Petakan minimal kolom nama atau kode barang');
        setSaving(false);
        return;
      }
      const items = importData.map(row => ({
        kode_barang: importMap.kode_barang ? row[importMap.kode_barang]?.toString().trim() || '' : '',
        nama_barang: importMap.nama_barang ? row[importMap.nama_barang]?.toString().trim() || '' : '',
        qty: importMap.qty ? parseInt(row[importMap.qty]) || 0 : 0,
        tipe: importMap.tipe ? row[importMap.tipe]?.toString().toLowerCase().trim() || 'offline' : 'offline',
        harga: importMap.harga ? parseFloat(row[importMap.harga]) || 0 : 0,
        keterangan: importMap.keterangan ? row[importMap.keterangan]?.toString().trim() || '' : '',
        satuan: 'pcs'
      })).filter(item => item.nama_barang || item.kode_barang);

      await batchImportPenjualan(items);
      toast.success(`${items.length} data penjualan berhasil diimpor`);
      toast.info('Catatan: Stok tidak diperbarui secara otomatis untuk import massal');
      setImportModalOpen(false);
      loadAll();
    } catch (err) {
      toast.error('Import gagal: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleExportCSV() {
    const data = filtered.map(p => ({
      tanggal: formatDate(p.created_at),
      kode_barang: p.kode_barang || '',
      nama_barang: p.nama_barang,
      qty: p.qty,
      satuan: p.satuan,
      tipe: p.tipe,
      harga: p.harga,
      total: parseInt(p.qty) * parseFloat(p.harga),
      keterangan: p.keterangan || ''
    }));
    exportToCSV(data, 'penjualan.csv');
    toast.success('Data diekspor ke CSV');
    setShowExport(false);
  }

  function handleExportExcel() {
    const data = filtered.map(p => ({
      Tanggal: formatDate(p.created_at),
      'Kode Barang': p.kode_barang || '',
      'Nama Barang': p.nama_barang,
      Qty: p.qty,
      Satuan: p.satuan,
      Tipe: p.tipe === 'online' ? 'Reseller' : 'Offline',
      Harga: p.harga,
      Total: parseInt(p.qty) * parseFloat(p.harga),
      Keterangan: p.keterangan || ''
    }));
    exportToExcel(data, 'penjualan.xlsx', 'Penjualan');
    toast.success('Data diekspor ke Excel');
    setShowExport(false);
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Unit Terjual', value: summary.totalQty.toLocaleString(), sub: filterTipe !== 'all' ? `filter: ${filterTipe}` : null, color: 'slate' },
          { label: 'Total Revenue',      value: formatCurrency(summary.totalRevenue), color: 'emerald' },
          { label: 'Jumlah Transaksi',   value: filtered.length.toLocaleString(), color: 'slate', span: true },
        ].map((card, idx) => (
          <AnimatedCard key={card.label} delay={idx * 0.08} className={`bg-white rounded-xl border border-slate-200 p-4 ${card.span ? 'col-span-2 sm:col-span-1' : ''}`}>
            <p className="text-xs text-slate-500 uppercase tracking-wider">{card.label}</p>
            <motion.p
              key={card.value}
              className={`text-2xl font-bold mt-1 ${card.color === 'emerald' ? 'text-emerald-600' : 'text-slate-800'}`}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25 }}
            >
              {loading ? '…' : card.value}
            </motion.p>
            {card.sub && <p className="text-xs text-slate-400">{card.sub}</p>}
          </AnimatedCard>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
        <div className="flex flex-col gap-3">
          {/* Row 1: Search + Tipe filter */}
          <div className="flex gap-2">
            <div className="relative flex-1 min-w-0">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Cari nama atau kode barang..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
              />
            </div>
            <select
              value={filterTipe}
              onChange={e => { setFilterTipe(e.target.value); setPage(1); }}
              className="shrink-0 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              <option value="all">Semua Tipe</option>
              <option value="offline">Offline</option>
              <option value="online">Reseller</option>
            </select>
          </div>
          {/* Row 2: Date range + action buttons */}
          <div className="flex gap-2 items-center flex-wrap">
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 flex-1 min-w-0">
              <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }} className="py-1.5 text-sm text-slate-600 bg-transparent focus:outline-none w-full min-w-0" />
              <span className="text-slate-400 text-xs shrink-0">sd</span>
              <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }} className="py-1.5 text-sm text-slate-600 bg-transparent focus:outline-none w-full min-w-0" />
            </div>
            <button onClick={loadAll} className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
              <RefreshCw size={14} />
            </button>
            <label className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer">
              <Upload size={14} /> Import
              <input ref={importRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} className="hidden" />
            </label>
            <div className="relative shrink-0">
              <button
                onClick={() => setShowExport(!showExport)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <Download size={14} /> Export
              </button>
              {showExport && (
                <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
                  <button onClick={handleExportCSV} className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">Export CSV</button>
                  <button onClick={handleExportExcel} className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">Export Excel</button>
                </div>
              )}
            </div>
            <button
              onClick={openAdd}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-medium"
            >
              <Plus size={14} /> <span className="hidden sm:inline">Catat Penjualan</span><span className="sm:hidden">Catat</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Tanggal', 'Kode', 'Nama Barang', 'Qty', 'Tipe', 'Harga', 'Total', 'Aksi'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-slate-500 uppercase tracking-wider font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4"><LoadingTable cols={8} rows={8} /></td></tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      icon={ShoppingCart}
                      title={search || filterTipe !== 'all' ? 'Tidak ada hasil' : 'Belum ada data penjualan'}
                      description="Klik Catat Penjualan untuk menambahkan transaksi"
                      action={(!search && filterTipe === 'all') && (
                        <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
                          <Plus size={14} /> Catat Penjualan
                        </button>
                      )}
                    />
                  </td>
                </tr>
              ) : (
                paginated.map(p => (
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDate(p.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                        {p.kode_barang || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-800 font-medium max-w-[160px] truncate">{p.nama_barang}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-red-500">-{p.qty}</span>
                      <span className="text-xs text-slate-400 ml-1">{p.satuan}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        p.tipe === 'online' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {p.tipe === 'online' ? 'Reseller' : 'Offline'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{formatCurrency(p.harga)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                      {formatCurrency(parseInt(p.qty) * parseFloat(p.harga))}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setDeleteTarget(p)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-red-100 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 size={11} /> Void
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-500">Halaman {page} dari {totalPages} ({filtered.length} transaksi)</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-40">
                <ChevronLeft size={13} />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-40">
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Catat Penjualan">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1.5">Barang <span className="text-red-500">*</span></label>
            <SearchDropdown
              barangList={barangList.filter(b => b.stok > 0)}
              value={selectedBarang?.id}
              onChange={b => setSelectedBarang(b)}
              placeholder="Cari barang (hanya yang ada stok)..."
            />
          </div>

          {selectedBarang && (
            <div className="bg-slate-50 rounded-lg p-3 grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-slate-500">Satuan</p>
                <p className="text-sm font-semibold text-slate-700">{selectedBarang.satuan.toUpperCase()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Stok Tersedia</p>
                <p className="text-sm font-bold text-emerald-600">{selectedBarang.stok}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Harga Default</p>
                <p className="text-sm font-semibold text-slate-700">{formatCurrency(selectedBarang.harga_jual)}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1.5">Tipe Penjualan</label>
              <select
                value={tipe}
                onChange={e => setTipe(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
              >
                <option value="offline">Offline</option>
                <option value="online">Reseller</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1.5">Jumlah <span className="text-red-500">*</span></label>
              <input
                type="number"
                value={qty}
                onChange={e => setQty(e.target.value)}
                placeholder="0"
                min="1"
                max={selectedBarang?.stok || undefined}
                required
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1.5">Harga Satuan <span className="text-red-500">*</span></label>
            <input
              type="number"
              value={harga}
              onChange={e => setHarga(e.target.value)}
              placeholder="0"
              min="0"
              required
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
            />
          </div>

          {qty && harga && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-2 flex items-center justify-between">
              <span className="text-sm text-slate-600">Total Transaksi</span>
              <span className="font-bold text-emerald-700">{formatCurrency(parseInt(qty || 0) * parseFloat(harga || 0))}</span>
            </div>
          )}

          <div>
            <label className="block text-sm text-slate-600 mb-1.5">Keterangan</label>
            <input
              type="text"
              value={keterangan}
              onChange={e => setKeterangan(e.target.value)}
              placeholder="Opsional"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
              Batal
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
              {saving ? 'Menyimpan…' : 'Catat Penjualan'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={importModalOpen} onClose={() => { setImportModalOpen(false); setCaImport(null); }} title="Import Data Penjualan" size="lg">
        <div className="space-y-4">
          {caImport ? (
            /* ── Preview CA Format ── */
            <>
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3 text-sm text-emerald-800">
                <strong>Format CA (Kartu Stok) terdeteksi</strong>
                <br />
                <span className="text-xs">
                  {caImport.rows.length} baris invoice ditemukan
                  {caImport.skipped > 0 && ` · ${caImport.skipped} baris dilewati (bukan INV)`}
                </span>
              </div>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      {['Tanggal', 'No Invoice', 'Kota', 'Keterangan', 'Kts. Keluar'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {caImport.rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-3 py-1.5 text-slate-700">{row.tanggal || '—'}</td>
                        <td className="px-3 py-1.5 text-slate-700 font-mono">{row.no_invoice}</td>
                        <td className="px-3 py-1.5 text-slate-700">{row.kota || '—'}</td>
                        <td className="px-3 py-1.5 text-slate-700 max-w-[150px] truncate">{row.keterangan || '—'}</td>
                        <td className="px-3 py-1.5 text-slate-700">{row.kts_keluar}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            /* ── Preview Format Biasa ── */
            <>
              <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 text-sm text-amber-700">
                Import massal tidak memperbarui stok secara otomatis. Cocok untuk data historis.
                <br />
                <span className="text-xs">{importData.length} baris ditemukan</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'nama_barang', label: 'Nama Barang' },
                  { key: 'kode_barang', label: 'Kode Barang' },
                  { key: 'qty', label: 'Qty / Jumlah' },
                  { key: 'tipe', label: 'Tipe (offline/online)' },
                  { key: 'harga', label: 'Harga Satuan' },
                  { key: 'keterangan', label: 'Keterangan' }
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs text-slate-500 mb-1">{f.label}</label>
                    <select
                      value={importMap[f.key]}
                      onChange={e => setImportMap(m => ({ ...m, [f.key]: e.target.value }))}
                      className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    >
                      <option value="">— Tidak dipetakan —</option>
                      {importColumns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              {importData.length > 0 && (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        {['Nama', 'Kode', 'Qty', 'Tipe', 'Harga'].map(h => (
                          <th key={h} className="px-3 py-2 text-left text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importData.slice(0, 4).map((row, i) => (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="px-3 py-1.5 text-slate-700 max-w-[100px] truncate">{importMap.nama_barang ? row[importMap.nama_barang] || '—' : '—'}</td>
                          <td className="px-3 py-1.5 text-slate-700">{importMap.kode_barang ? row[importMap.kode_barang] || '—' : '—'}</td>
                          <td className="px-3 py-1.5 text-slate-700">{importMap.qty ? row[importMap.qty] || '—' : '—'}</td>
                          <td className="px-3 py-1.5 text-slate-700">{importMap.tipe ? row[importMap.tipe] || '—' : '—'}</td>
                          <td className="px-3 py-1.5 text-slate-700">{importMap.harga ? row[importMap.harga] || '—' : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={() => { setImportModalOpen(false); setCaImport(null); }}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
              Batal
            </button>
            <button onClick={executeImport} disabled={saving}
              className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
              {saving ? 'Mengimpor…' : `Import ${caImport ? caImport.rows.length : importData.length} Data`}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        title="Batalkan Transaksi"
        message={`Void penjualan ${deleteTarget?.qty} ${deleteTarget?.satuan} "${deleteTarget?.nama_barang}"? Stok akan dikembalikan.`}
        confirmLabel="Void Transaksi"
      />
    </div>
  );
}
