/**
 * useRealtimeData — Firebase onSnapshot wrapper.
 * Production only: selalu pakai Firebase realtime.
 */

import { useState, useEffect, useCallback } from 'react';

export function useRealtimeData(fetchFn, { deps = [] } = {}) {
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

export function useRealtimeFirestore(subscribeFn, fetchFn) {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
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
