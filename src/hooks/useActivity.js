import { useCallback, useEffect, useState } from "react";
import { loadStored, saveStored } from "../lib/storage";

// Bump the version if the shape of an event ever changes.
const STORAGE_KEY = "activity:v1";

// Keep the feed (and what is saved) to a sensible size.
const MAX_EVENTS = 200;

let counter = 0;

// Unique across reloads: a timestamp plus a per-session counter.
function makeEventId() {
  counter += 1;
  return `EVT-${Date.now().toString(36)}-${counter}`;
}

function isValidEventList(value) {
  return (
    Array.isArray(value) &&
    value.every(
      (e) =>
        e &&
        typeof e.id === "string" &&
        typeof e.type === "string" &&
        typeof e.timestamp === "string"
    )
  );
}

export function useActivity() {
  const [events, setEvents] = useState(() =>
    loadStored(STORAGE_KEY, [], isValidEventList)
  );

  // Save the feed whenever it changes.
  useEffect(() => {
    saveStored(STORAGE_KEY, events);
  }, [events]);

  const record = useCallback((type, payload) => {
    const event = {
      id: makeEventId(),
      type,
      payload,
      timestamp: new Date().toISOString(),
    };
    setEvents((current) => [event, ...current].slice(0, MAX_EVENTS));
    return event;
  }, []);

  const clear = useCallback(() => setEvents([]), []);

  return { events, record, clear };
}