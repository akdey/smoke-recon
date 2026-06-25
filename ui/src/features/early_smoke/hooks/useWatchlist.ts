import { useState, useEffect } from 'react';
import { WatchlistResponse } from '../types';

export function useWatchlist(days: number, minMentions: number) {
  const [data, setData] = useState<WatchlistResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    const apiBase = import.meta.env.VITE_API_BASE_URL || '';
    fetch(`${apiBase}/api/features/early-smoke/watchlist?days=${days}&min_mentions=${minMentions}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch watchlist details: ${res.statusText}`);
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
  }, [days, minMentions]);

  return { data, loading, error };
}
