/**
 * ============================================================
 * DATABASE ABSTRACTION LAYER
 * ============================================================
 * 
 * Di sini semua service import helper ini untuk tahu
 * apakah harus pakai Firebase (production) atau REST API MySQL (dev).
 * 
 * Nilai dikontrol via env:
 *   VITE_USE_FIREBASE=true   → Firebase Firestore (production)
 *   VITE_USE_FIREBASE=false  → PHP/MySQL REST API via XAMPP (dev)
 */

export const USE_FIREBASE = import.meta.env.VITE_USE_FIREBASE === 'true';
export const API_BASE     = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Helper fetch untuk MySQL REST API (dev only)
 * Otomatis parse JSON dan lempar error jika response tidak OK.
 * 
 * @param {string} endpoint  - path relatif, misal: '/barang' atau '/barang/1'
 * @param {object} [options] - fetch options (method, body, headers, dll)
 */
export async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Response bukan JSON: ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    throw new Error(data?.message || `HTTP ${res.status}: ${res.statusText}`);
  }

  return data;
}
