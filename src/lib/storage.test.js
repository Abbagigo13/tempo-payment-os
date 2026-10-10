import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { loadStored, saveStored, clearStored } from "./storage";

// A fake localStorage kept in memory, so the tests never touch real
// browser data (and work without a browser).
function makeFakeStorage() {
  const data = new Map();
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => {
      data.set(key, String(value));
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

let fake;

beforeEach(() => {
  fake = makeFakeStorage();
  vi.stubGlobal("window", { localStorage: fake });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("storage helpers", () => {
  it("returns the fallback when nothing is saved", () => {
    expect(loadStored("missing", ["fallback"])).toEqual(["fallback"]);
  });

  it("saves a value and loads it back", () => {
    saveStored("list", [1, 2, 3]);
    expect(loadStored("list", [])).toEqual([1, 2, 3]);
  });

  it("stores values under a prefixed key", () => {
    saveStored("payments:v1", [{ id: "A" }]);
    expect(fake.data.has("tempo-payment-os:payments:v1")).toBe(true);
  });

  it("returns the fallback when the saved data is damaged", () => {
    fake.setItem("tempo-payment-os:broken", "{not valid json");
    expect(loadStored("broken", "fallback")).toBe("fallback");
  });

  it("returns the fallback when the validator rejects the data", () => {
    saveStored("payments:v1", { not: "a list" });
    const isList = (value) => Array.isArray(value);
    expect(loadStored("payments:v1", [], isList)).toEqual([]);
  });

  it("returns the saved value when the validator accepts it", () => {
    saveStored("payments:v1", [{ id: "A" }]);
    const isList = (value) => Array.isArray(value);
    expect(loadStored("payments:v1", [], isList)).toEqual([{ id: "A" }]);
  });

  it("clearStored removes a saved value", () => {
    saveStored("list", [1]);
    clearStored("list");
    expect(loadStored("list", "gone")).toBe("gone");
  });

  it("saveStored does not throw when storage is full or blocked", () => {
    fake.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    expect(() => saveStored("list", [1])).not.toThrow();
  });

  it("loadStored returns the fallback when storage is blocked", () => {
    fake.getItem = () => {
      throw new Error("SecurityError");
    };
    expect(loadStored("list", "fallback")).toBe("fallback");
  });
});