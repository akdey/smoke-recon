import { useState, useEffect } from 'react';
import { WatchlistResponse } from '../types';

export function useWatchlist(
  days: number, 
  minMentions: number,
  wRedditBody: number = 0.45,
  wRedditNested: number = 0.20,
  wTwitter: number = 0.25,
  wBoards: number = 0.10
) {
  const [data, setData] = useState<WatchlistResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    const apiBase = import.meta.env.VITE_API_BASE_URL || '';
    const query = new URLSearchParams({
      days: days.toString(),
      min_mentions: minMentions.toString(),
      w_reddit_body: wRedditBody.toString(),
      w_reddit_nested: wRedditNested.toString(),
      w_twitter: wTwitter.toString(),
      w_boards: wBoards.toString()
    });

    fetch(`${apiBase}/api/features/early-smoke/watchlist?${query.toString()}`)
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
  }, [days, minMentions, wRedditBody, wRedditNested, wTwitter, wBoards]);

  return { data, loading, error };
}
