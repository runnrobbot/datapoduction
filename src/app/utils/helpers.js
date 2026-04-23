/**
 * Format number as Indonesian Rupiah
 */
export function formatCurrency(amount) {
  if (!amount && amount !== 0) return 'Rp 0';
  return 'Rp ' + Number(amount).toLocaleString('id-ID');
}

/**
 * Convert Firestore Timestamp or ISO string to JS Date
 */
export function toDate(value) {
  if (!value) return new Date();
  if (value && typeof value.toDate === 'function') return value.toDate();
  return new Date(value);
}

/**
 * Format date for display
 */
export function formatDate(value) {
  if (!value) return '-';
  const date = toDate(value);
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Format date + time
 */
export function formatDateTime(value) {
  if (!value) return '-';
  const date = toDate(value);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

/**
 * Calculate Pre-Order status from tanggal_po (date string YYYY-MM-DD)
 */
export function getPOStatus(tanggalPO) {
  if (!tanggalPO) return { label: '-', color: 'gray', days: null, message: '-' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const poDate = new Date(tanggalPO);
  poDate.setHours(0, 0, 0, 0);

  const diffMs = poDate - today;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      label: 'Overdue',
      color: 'red',
      days: diffDays,
      message: `${Math.abs(diffDays)} hari yang lalu`
    };
  }
  if (diffDays === 0) {
    return { label: 'Urgent', color: 'red', days: 0, message: 'Hari ini!' };
  }
  if (diffDays <= 2) {
    return { label: 'Urgent', color: 'red', days: diffDays, message: `${diffDays} hari lagi` };
  }
  if (diffDays <= 7) {
    return { label: 'Segera', color: 'yellow', days: diffDays, message: `${diffDays} hari lagi` };
  }
  return {
    label: 'Masih Lama',
    color: 'green',
    days: diffDays,
    message: `${diffDays} hari lagi`
  };
}

/**
 * Truncate text to N characters
 */
export function truncate(str, n = 30) {
  if (!str) return '-';
  return str.length > n ? str.slice(0, n) + '…' : str;
}
