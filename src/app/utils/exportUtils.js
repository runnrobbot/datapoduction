import Papa from 'papaparse';
import * as XLSX from 'xlsx';


export function exportToCSV(data, filename = 'export.csv') {
  const csv = Papa.unparse(data);
  const BOM = '\uFEFF'; 
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename);
}

export function exportToExcel(data, filename = 'export.xlsx', sheetName = 'Data') {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}

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
