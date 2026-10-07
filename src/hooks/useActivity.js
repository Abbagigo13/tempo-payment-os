import { useCallback, useState } from "react";

let nextId = 1;

export function useActivity() {
  const [events, setEvents] = useState([]);

  const record = useCallback((type, payload) => {
    const event = {
      id: `EVT-${nextId++}`,
      type,
      payload,
      timestamp: new Date().toISOString(),
    };
    setEvents((current) => [event, ...current]);
    return event;
  }, []);

  const clear = useCallback(() => setEvents([]), []);

  return { events, record, clear };
}