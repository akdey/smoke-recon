import { useState, useEffect } from 'react';

export interface ActivityEvent {
  timestamp: string;
  event_type: string; // "system" | "scraper" | "mention" | "media" | "circuit_breaker" | "purge"
  message: string;
  ticker: string | null;
  source: string | null;
  details: any;
}

export function useActivityStream() {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [connected, setConnected] = useState<boolean>(false);

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || '';
    const eventSourceUrl = `${apiBase}/api/features/early-smoke/stream`;

    let eventSource: EventSource | null = null;
    let timer: number | null = null;

    const connect = () => {
      if (eventSource) {
        eventSource.close();
      }

      eventSource = new EventSource(eventSourceUrl);

      eventSource.onopen = () => {
        setConnected(true);
      };

      eventSource.onerror = (e) => {
        console.warn('SSE connection failed/closed, retrying in 5 seconds...', e);
        setConnected(false);
        if (eventSource) {
          eventSource.close();
        }
        timer = window.setTimeout(connect, 5000);
      };

      eventSource.onmessage = (event) => {
        try {
          const newEvent: ActivityEvent = JSON.parse(event.data);
          setActivities((prev) => {
            // Prepend new events to show newest at the top
            const updated = [newEvent, ...prev];
            if (updated.length > 80) {
              updated.pop();
            }
            return updated;
          });
        } catch (err) {
          console.error('Failed to parse SSE event:', err);
        }
      };
    };

    connect();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, []);

  return { activities, connected };
}
