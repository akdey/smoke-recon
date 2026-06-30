import { useState, useEffect } from 'react';
import { MentionDetail } from '../types';

export function useMentions(ticker: string | null, days: number) {
  const [data, setData] = useState<MentionDetail[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticker) {
      setData(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    const apiBase = import.meta.env.VITE_API_BASE_URL || '';
    fetch(`${apiBase}/api/features/early-smoke/mentions?ticker=${ticker}&days=${days}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch mentions: ${res.statusText}`);
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
  }, [ticker, days]);

  return { data, loading, error };
}
