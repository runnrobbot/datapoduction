/**
 * useRealtime — hook untuk data realtime.
 *
 * Firebase mode  : pakai onSnapshot → update instan tanpa refresh.
 * Dev mode (PHP) : polling setiap `intervalMs` ms (default 30s).
 *
 * Usage:
 *   const { data, loading, refresh } = useRealtime(getAllBarang, [], 30000);
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { USE_FIREBASE } from '../services/db.js';

export function useRealtime(fetchFn, deps = [], intervalMs = 30000) {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const mountedRef             = useRef(true);
  const timerRef               = useRef(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const result = await fetchFn();
      if (mountedRef.current) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) setError(err.message);
    } finally {
      if (mountedRef.current && !silent) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFn, ...deps]);

  useEffect(() => {
    mountedRef.current = true;
    load();

    if (!USE_FIREBASE && intervalMs > 0) {
      // Dev mode: poll silently
      timerRef.current = setInterval(() => load(true), intervalMs);
    }

    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const refresh = useCallback(() => load(false), [load]);

  return { data, loading, error, refresh, setData };
}

/**
 * useRealtimeFirestore — Firebase onSnapshot wrapper.
 * Hanya aktif saat USE_FIREBASE=true, fallback ke fetchFn polling jika false.
 *
 * @param {Function} subscribeFn  - fungsi yang menerima callback(data[]) dan return unsubscribe()
 * @param {Function} fetchFn      - fallback untuk dev mode
 * @param {number}   intervalMs   - polling interval dev mode
 */
export function useRealtimeFirestore(subscribeFn, fetchFn, intervalMs = 30000) {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    let unsubscribe = null;
    let timer       = null;
    let mounted     = true;

    if (USE_FIREBASE) {
      // Firebase realtime
      try {
        unsubscribe = subscribeFn((newData) => {
          if (mounted) {
            setData(newData);
            setLoading(false);
          }
        });
      } catch (err) {
        if (mounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    } else {
      // Dev mode: fetch once then poll
      const poll = async (silent = false) => {
        if (!silent && mounted) setLoading(true);
        try {
          const result = await fetchFn();
          if (mounted) {
            setData(result);
            setError(null);
          }
        } catch (err) {
          if (mounted) setError(err.message);
        } finally {
          if (mounted && !silent) setLoading(false);
        }
      };
      poll();
      if (intervalMs > 0) {
        timer = setInterval(() => poll(true), intervalMs);
      }
    }

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
      if (timer) clearInterval(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  return { data, loading, error, refresh, setData };
}
