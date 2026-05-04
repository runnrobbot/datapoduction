import Papa from 'papaparse';
import * as XLSX from 'xlsx';

/**
 * Parse a CSV file and return array of objects
 */
export function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: (err) => reject(new Error(err.message || 'Gagal membaca CSV'))
    });
  });
}

/**
 * Parse an Excel file and return array of objects
 */
export function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        resolve(jsonData);
      } catch (err) {
        reject(new Error('Gagal membaca file Excel'));
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parse any file (CSV or Excel) based on extension
 */
export async function parseFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'csv') return await parseCSV(file);
  if (ext === 'xlsx' || ext === 'xls') return await parseExcel(file);
  throw new Error('Format file tidak didukung. Gunakan CSV atau Excel (.xlsx/.xls)');
}

// ─────────────────────────────────────────────────────────────────
// CA (Kartu Stok) Format Parser
//
// Struktur file CA:
//   Row kosong (beberapa)
//   Header: Tanggal | No. Sumber | Tipe | Keterangan | Kts. Masuk | Kts. Keluar | Saldo
//   Row nama barang: [null, 'NAMA BARANG', null, ...]  → diabaikan (diisi manual dari master)
//   Row kota:        [null, 'BALIKPAPAN',  null, null, null, null, '23,00', null]
//                    → tidak ada tanggal, no_sumber = nama kota (huruf semua, tanpa '/')
//                       saldo di kolom ke-6 = saldo awal kota tsb
//   Row transaksi:   ada tanggal di kolom 0
//                    → ambil SEMUA, tapi pisahkan yang valid (Faktur Penjualan) vs lainnya
//   Row subtotal:    tidak ada tanggal, no_sumber kosong atau angka → skip
// ─────────────────────────────────────────────────────────────────

const CA_HEADERS = ['Tanggal', 'No. Sumber', 'Tipe', 'Keterangan', 'Kts. Masuk', 'Kts. Keluar', 'Saldo'];

function isCAHeader(row) {
  const vals = row.map(v => String(v ?? '').trim());
  return CA_HEADERS.every(h => vals.includes(h));
}

function parseAngka(val) {
  if (val === null || val === undefined || val === '') return 0;
  const str = String(val).trim().replace(/\./g, '').replace(',', '.');
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
}

/**
 * Deteksi apakah baris adalah baris kota.
 * Ciri-ciri: tidak ada tanggal, No. Sumber berisi nama kota
 * (string huruf/spasi saja, tanpa '/' dan bukan angka murni),
 * dan ada nilai saldo di kolom ke-6.
 *
 * Contoh kota: [null, 'BALIKPAPAN', null, null, null, null, '23,00', null]
 * Bukan kota:  [null, 'PANEL CA LIST GOLD UK 30 CM', ...]  ← nama barang (saldo kosong)
 *              [null, 'RPNJ/07/25/974', ...]               ← ada '/'
 *              ['08 Apr 2026', ...]                         ← ada tanggal
 */
function isNamaKota(r, idxTanggal, idxNoSumber, idxSaldo) {
  const tanggal  = r[idxTanggal];
  const noSumber = String(r[idxNoSumber] ?? '').trim();
  const saldo    = r[idxSaldo];

  // Harus tidak punya tanggal
  if (tanggal !== null && tanggal !== '' && tanggal !== undefined) return false;
  // Harus ada isi di No. Sumber
  if (!noSumber) return false;
  // Tidak boleh ada '/' (kode transaksi seperti RPNJ/...)
  if (noSumber.includes('/')) return false;
  // Tidak boleh angka murni
  if (/^\d+$/.test(noSumber)) return false;
  // Harus ada saldo (nilai saldo awal kota)
  const saldoNum = parseAngka(saldo);
  if (!saldo && saldoNum === 0) return false;

  return true;
}

/**
 * Parse file Excel/CSV format CA (Kartu Stok).
 *
 * Returns:
 *   { isCAFormat, rows, skipped }
 *   rows: array of {
 *     tanggal, no_sumber, tipe, keterangan,
 *     kts_keluar, saldo, kota
 *   }
 *   Catatan: kts_masuk sengaja diabaikan — hanya kts_keluar yang dipakai
 *   karena import CA hanya untuk mencatat penjualan (pengurangan stok).
 *   skipped: baris yang ada tanggal tapi bukan Faktur Penjualan
 *            (RPNJ, TB, Penyesuaian, Pembelian, dll)
 */
export async function parseCAFile(file) {
  const reader = new FileReader();
  const raw = await new Promise((resolve, reject) => {
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb   = XLSX.read(data, { type: 'array' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
        resolve(rows);
      } catch {
        reject(new Error('Gagal membaca file'));
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsArrayBuffer(file);
  });

  // Cari baris header CA
  let headerRowIdx = -1;
  for (let i = 0; i < raw.length; i++) {
    if (isCAHeader(raw[i])) { headerRowIdx = i; break; }
  }
  if (headerRowIdx === -1) return { rows: [], skipped: 0, isCAFormat: false };

  // Index kolom
  const hr = raw[headerRowIdx].map(v => String(v ?? '').trim());
  const idx = {
    tanggal:    hr.indexOf('Tanggal'),
    no_sumber:  hr.indexOf('No. Sumber'),
    tipe:       hr.indexOf('Tipe'),
    keterangan: hr.indexOf('Keterangan'),
    // kts_masuk sengaja tidak diambil — import CA hanya pakai kts_keluar
    kts_keluar: hr.indexOf('Kts. Keluar'),
    saldo:      hr.indexOf('Saldo'),
  };

  // Row tepat setelah header = nama barang di file (kita abaikan, diisi dari master)
  // Langsung mulai dari headerRowIdx + 2
  const rows   = [];
  let skipped  = 0;
  let kotaAktif = '';

  for (let i = headerRowIdx + 1; i < raw.length; i++) {
    const r = raw[i];
    if (!r || r.every(v => v === null || v === '' || v === undefined)) continue;

    const tanggal  = r[idx.tanggal];
    const noSumber = String(r[idx.no_sumber] ?? '').trim();

    // Baris nama barang: tepat 1 baris setelah header, saldo kosong → skip
    // (sudah di-handle karena tidak punya tanggal dan saldo kosong, bukan kota juga)

    // Deteksi kota
    if (isNamaKota(r, idx.tanggal, idx.no_sumber, idx.saldo)) {
      kotaAktif = noSumber;
      continue;
    }

    // Harus punya tanggal untuk dianggap baris transaksi
    const tanggalStr = String(tanggal ?? '').trim();
    if (!tanggalStr) continue;

    const tipe = String(r[idx.tipe] ?? '').trim();
    const isPenjualan = tipe === 'Faktur Penjualan';

    if (!isPenjualan) {
      skipped++;
      continue;
    }

    rows.push({
      tanggal:    tanggalStr,
      no_sumber:  noSumber,
      tipe,
      keterangan: String(r[idx.keterangan] ?? '').trim(),
      kts_keluar: parseAngka(r[idx.kts_keluar]),
      saldo:      parseAngka(r[idx.saldo]),
      kota:       kotaAktif,
    });
  }

  return { rows, skipped, isCAFormat: true };
}