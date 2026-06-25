import { useState, useEffect } from 'react';
import { HealthResponse } from '../types';

export function useSystemStatus() {
  const [status, setStatus] = useState<HealthResponse | null>(null);

  useEffect(() => {
    const fetchStatus = () => {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      fetch(`${apiBase}/api/health`)
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error('Health check error');
        })
        .then((data) => setStatus(data))
        .catch((err) => console.warn('System status check skipped:', err));
    };

    fetchStatus();
    // Poll every 15 seconds to keep dashboard alert status fresh
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  return status;
}
