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
 * Parse an Excel file and return { headers, rows }
 * rows is array of objects keyed by header names
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
