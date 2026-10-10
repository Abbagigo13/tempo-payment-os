// src/lib/storage.js
//
// Small wrapper around localStorage. Every function is safe to call
// when storage is unavailable (private mode, blocked, full) or when
// the saved data is damaged: it falls back instead of throwing.

const PREFIX = "tempo-payment-os:";

export function loadStored(key, fallback, isValid) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    if (isValid && !isValid(parsed)) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

export function saveStored(key, value) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage full or blocked. The app keeps working in memory.
  }
}

export function clearStored(key) {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    // Ignore.
  }
}