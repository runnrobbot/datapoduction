/**
 * useRealtimeData
 * ───────────────
 * Dev mode  (USE_FIREBASE=false) → polling via setInterval setiap `interval` ms
 * Firebase  (USE_FIREBASE=true)  → onSnapshot realtime listener
 *
 * Usage:
 *   const { data, loading, error, refresh } = useRealtimeData(fetchFn, { interval: 30000 });
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { USE_FIREBASE } from '../services/db.js';

/**
 * @param {() => Promise<any[]>}   fetchFn    — async function yang return array data
 * @param {object}                 opts
 * @param {number}                 opts.interval   — polling interval ms (default 30000)
 * @param {any[]}                  opts.deps       — extra deps yang trigger re-subscribe
 */
export function useRealtimeData(fetchFn, { interval = 30_000, deps = [] } = {}) {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const mountedRef = useRef(true);

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const result = await fetchFn();
      if (mountedRef.current) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) setError(err.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFn, ...deps]);

  useEffect(() => {
    mountedRef.current = true;
    load(true);

    // Polling untuk dev mode (PHP tidak support realtime)
    if (!USE_FIREBASE) {
      const timer = setInterval(() => load(false), interval);
      return () => {
        mountedRef.current = false;
        clearInterval(timer);
      };
    }

    return () => { mountedRef.current = false; };
  }, [load, interval]);

  const refresh = useCallback(() => load(false), [load]);

  return { data, loading, error, refresh, setData };
}

/**
 * useRealtimeFirestore
 * ─────────────────────
 * Wrapper khusus untuk Firebase onSnapshot.
 * Di dev mode tetap pakai polling biasa.
 *
 * @param {(callback: (data: any[]) => void) => () => void} subscribeFn
 *   — function yang subscribe ke onSnapshot dan return unsubscribe fn
 * @param {() => Promise<any[]>} fetchFn — fallback untuk dev mode
 * @param {object} opts
 */
export function useRealtimeFirestore(subscribeFn, fetchFn, { interval = 30_000 } = {}) {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!USE_FIREBASE) {
      // Dev mode: polling
      let mounted = true;
      const poll = async (showLoading = false) => {
        if (showLoading) setLoading(true);
        try {
          const result = await fetchFn();
          if (mounted) { setData(result); setError(null); }
        } catch (err) {
          if (mounted) setError(err.message);
        } finally {
          if (mounted) setLoading(false);
        }
      };
      poll(true);
      const timer = setInterval(() => poll(false), interval);
      return () => { mounted = false; clearInterval(timer); };
    }

    // Firebase: onSnapshot
    setLoading(true);
    let isFirst = true;
    const unsubscribe = subscribeFn((result) => {
      setData(result);
      setError(null);
      if (isFirst) { setLoading(false); isFirst = false; }
    }, (err) => {
      setError(err.message);
      setLoading(false);
    });

    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err.message);
    }
  }, [fetchFn]);

  return { data, loading, error, refresh, setData };
}
