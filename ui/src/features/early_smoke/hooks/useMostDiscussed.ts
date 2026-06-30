import { useState, useEffect } from 'react';
import { MostDiscussedEntry } from '../types';

export function useMostDiscussed(
  days: number,
  wRedditBody: number = 0.45,
  wRedditNested: number = 0.20,
  wTwitter: number = 0.25,
  wBoards: number = 0.10
) {
  const [data, setData] = useState<MostDiscussedEntry[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    const apiBase = import.meta.env.VITE_API_BASE_URL || '';
    const query = new URLSearchParams({
      days: days.toString(),
      w_reddit_body: wRedditBody.toString(),
      w_reddit_nested: wRedditNested.toString(),
      w_twitter: wTwitter.toString(),
      w_boards: wBoards.toString()
    });
    
    fetch(`${apiBase}/api/features/early-smoke/most-discussed?${query.toString()}`)
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
  }, [days, wRedditBody, wRedditNested, wTwitter, wBoards]);

  return { data, loading, error };
}
