import { useSyncExternalStore } from "react";

const STORAGE_KEY = "bevlog.people";

export const DEFAULT_PEOPLE = [
  "Naman",
  "Ross",
  "Duncan",
  "Chaz",
  "Kash",
  "Jess",
  "Tess",
  "Emma",
  "Niamh",
];

// Stable colours for the original roster so the UI looks unchanged; any other
// name gets a deterministic colour from the palette below.
const KNOWN_COLORS: Record<string, string> = {
  Naman: "#3b82f6",
  Ross: "#e5484d",
  Duncan: "#f5a524",
  Chaz: "#10b981",
  Kash: "#f97316",
  Jess: "#a78bfa",
  Tess: "#ec4899",
  Emma: "#06b6d4",
  Niamh: "#84cc16",
};

const PALETTE = [
  "#3b82f6",
  "#e5484d",
  "#f5a524",
  "#10b981",
  "#f97316",
  "#a78bfa",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#eab308",
  "#14b8a6",
  "#f43f5e",
  "#8b5cf6",
  "#22d3ee",
];

export function colorForPerson(name: string): string {
  if (KNOWN_COLORS[name]) return KNOWN_COLORS[name];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function load(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) {
        return parsed;
      }
    }
  } catch {
    // localStorage may be unavailable (private mode, node tests) — fall back.
  }
  return [...DEFAULT_PEOPLE];
}

let current: string[] = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // ignore
  }
}

function emit() {
  for (const listener of listeners) listener();
}

export function getPeople(): string[] {
  return current;
}

export function addPerson(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;
  if (current.some((p) => p.toLowerCase() === trimmed.toLowerCase())) {
    return false;
  }
  current = [...current, trimmed];
  persist();
  emit();
  return true;
}

export function removePerson(name: string): void {
  if (!current.includes(name)) return;
  current = current.filter((p) => p !== name);
  persist();
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePeople(): string[] {
  return useSyncExternalStore(subscribe, getPeople, getPeople);
}
