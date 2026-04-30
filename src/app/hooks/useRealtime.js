/**
 * useRealtime — hook untuk data realtime via Firebase onSnapshot.
 */

import { useState, useEffect, useCallback } from 'react';

export function useRealtime(fetchFn, deps = []) {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchFn();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFn, ...deps]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(() => load(), [load]);

  return { data, loading, error, refresh, setData };
}

/**
 * useRealtimeFirestore — Firebase onSnapshot wrapper (always Firebase in production).
 *
 * @param {Function} subscribeFn  - fungsi yang menerima callback(data[]) dan return unsubscribe()
 * @param {Function} fetchFn      - digunakan untuk manual refresh
 */
export function useRealtimeFirestore(subscribeFn, fetchFn) {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    setLoading(true);
    let isFirst = true;

    const unsubscribe = subscribeFn((newData) => {
      setData(newData);
      setError(null);
      if (isFirst) { setLoading(false); isFirst = false; }
    }, (err) => {
      setError(err.message);
      setLoading(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
