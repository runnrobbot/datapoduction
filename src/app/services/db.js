export const USE_FIREBASE = import.meta.env.VITE_USE_FIREBASE === 'true';
export const API_BASE     = import.meta.env.VITE_API_BASE_URL || '/api';

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
