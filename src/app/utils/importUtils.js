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
// Header yang dikenali:
//   Tanggal | No. Sumber | Tipe | Keterangan | Kts. Masuk | Kts. Keluar | Saldo
//
// Aturan import:
//  - Baris yang No. Sumber-nya TIDAK diawali "INV" → DITOLAK (skip)
//  - Baris yang merupakan nama kota (tidak ada tanggal, tidak ada header) → diingat sebagai konteks kota
//  - Field baru: kota, no_invoice, tanggal (string), kts_masuk, kts_keluar, saldo
// ─────────────────────────────────────────────────────────────────

const CA_HEADERS = ['Tanggal', 'No. Sumber', 'Tipe', 'Keterangan', 'Kts. Masuk', 'Kts. Keluar', 'Saldo'];

/**
 * Cek apakah array row adalah header CA
 */
function isCAHeader(row) {
  const vals = row.map(v => String(v ?? '').trim());
  return CA_HEADERS.every(h => vals.includes(h));
}

/**
 * Parse angka format "1.234,56" atau "1234,56" atau "1234.56"
 */
function parseAngka(val) {
  if (val === null || val === undefined || val === '') return 0;
  const str = String(val).trim().replace(/\./g, '').replace(',', '.');
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
}

/**
 * Cek apakah nilai tampak seperti nama kota
 * (string, tidak ada tanggal, tidak ada slash, tidak ada angka panjang)
 */
function isNamaKota(vals) {
  // Baris kota: hanya kolom kedua yang ada isinya, sisanya kosong
  // contoh: [null, 'BALIKPAPAN', null, null, null, null, '23,00', null]
  const nonEmpty = vals.filter(v => v !== null && v !== '' && String(v).trim() !== '');
  if (nonEmpty.length === 0) return false;
  
  // Kolom pertama (Tanggal) harus kosong
  const tanggal = vals[0];
  if (tanggal !== null && tanggal !== '') return false;
  
  // Kolom kedua harus berisi string huruf (nama kota/lokasi)
  const noSumber = String(vals[1] ?? '').trim();
  if (!noSumber) return false;
  
  // Jika No. Sumber diawali INV → bukan kota
  if (noSumber.toUpperCase().startsWith('INV')) return false;
  
  // Harus berisi huruf dan bukan angka murni
  if (/^\d+$/.test(noSumber)) return false;
  
  // Tidak mengandung '/' (bukan kode seperti TB/25/08)
  if (noSumber.includes('/')) return false;
  
  return true;
}

/**
 * Parse file Excel/CSV format CA (Kartu Stok)
 * Mengembalikan { rows, skipped, isCAFormat }
 * rows: array of { tanggal, no_invoice, tipe, keterangan, kts_masuk, kts_keluar, saldo, kota }
 * skipped: jumlah baris yang di-skip karena bukan INV
 */
export async function parseCAFile(file) {
  const reader = new FileReader();
  const raw = await new Promise((resolve, reject) => {
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb   = XLSX.read(data, { type: 'array' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        // Ambil sebagai array of arrays (raw), tanpa header
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
        resolve(rows);
      } catch (err) {
        reject(new Error('Gagal membaca file'));
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsArrayBuffer(file);
  });

  // Cari baris header CA
  let headerRowIdx = -1;
  for (let i = 0; i < raw.length; i++) {
    if (isCAHeader(raw[i])) {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx === -1) {
    return { rows: [], skipped: 0, isCAFormat: false };
  }

  // Petakan index kolom berdasarkan header
  const headerRow = raw[headerRowIdx].map(v => String(v ?? '').trim());
  const idx = {
    tanggal:    headerRow.indexOf('Tanggal'),
    no_sumber:  headerRow.indexOf('No. Sumber'),
    tipe:       headerRow.indexOf('Tipe'),
    keterangan: headerRow.indexOf('Keterangan'),
    kts_masuk:  headerRow.indexOf('Kts. Masuk'),
    kts_keluar: headerRow.indexOf('Kts. Keluar'),
    saldo:      headerRow.indexOf('Saldo'),
  };

  const rows    = [];
  let skipped   = 0;
  let kotaAktif = '';

  for (let i = headerRowIdx + 1; i < raw.length; i++) {
    const r = raw[i];
    if (!r || r.every(v => v === null || v === '')) continue;

    // Deteksi baris nama kota
    if (isNamaKota(r)) {
      // Ambil nilai kolom No. Sumber sebagai nama kota
      kotaAktif = String(r[idx.no_sumber] ?? '').trim();
      continue;
    }

    const noSumber = String(r[idx.no_sumber] ?? '').trim();
    const tanggal  = String(r[idx.tanggal]   ?? '').trim();

    // Skip baris subtotal / total (tidak ada tanggal, tidak ada no_sumber berbentuk INV)
    if (!tanggal && !noSumber.toUpperCase().startsWith('INV')) continue;

    // Wajib diawali INV
    if (!noSumber.toUpperCase().startsWith('INV')) {
      skipped++;
      continue;
    }

    rows.push({
      tanggal:    tanggal,
      no_invoice: noSumber,
      tipe:       String(r[idx.tipe]       ?? '').trim(),
      keterangan: String(r[idx.keterangan] ?? '').trim(),
      kts_masuk:  parseAngka(r[idx.kts_masuk]),
      kts_keluar: parseAngka(r[idx.kts_keluar]),
      saldo:      parseAngka(r[idx.saldo]),
      kota:       kotaAktif,
    });
  }

  return { rows, skipped, isCAFormat: true };
}
