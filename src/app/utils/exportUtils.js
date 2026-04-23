import Papa from 'papaparse';
import * as XLSX from 'xlsx';

/**
 * Export data array to CSV and trigger download
 */
export function exportToCSV(data, filename = 'export.csv') {
  const csv = Papa.unparse(data);
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename);
}

/**
 * Export data array to Excel (.xlsx) and trigger download
 */
export function exportToExcel(data, filename = 'export.xlsx', sheetName = 'Data') {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}

/**
 * Trigger file download from a Blob
 */
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
