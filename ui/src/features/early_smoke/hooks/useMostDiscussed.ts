import { useState, useEffect } from 'react';
import { MostDiscussedEntry } from '../types';

export function useMostDiscussed(days: number) {
  const [data, setData] = useState<MostDiscussedEntry[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    const apiBase = import.meta.env.VITE_API_BASE_URL || '';
    fetch(`${apiBase}/api/features/early-smoke/most-discussed?days=${days}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch most discussed: ${res.statusText}`);
        }
        return res.json();
      })
      .then((payload) => {
        if (active) {
          setData(payload);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || 'An unexpected error occurred.');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [days]);

  return { data, loading, error };
}
