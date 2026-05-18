import type { Entry, Person } from "./types";

export function beersForEntry(entry: Entry): number {
  if (entry.kind !== "beer") return 0;
  if (entry.quantityUnit === "ml" && entry.quantityValue != null) {
    if (entry.quantityValue >= 1000) return 2;
    if (entry.quantityValue <= 100) return 0;
  }
  return 1;
}

export function totalBeers(entries: Entry[]): number {
  return entries.reduce((sum, e) => sum + beersForEntry(e), 0);
}

export function beersByPerson(entries: Entry[]): Map<Person, number> {
  const result = new Map<Person, number>();
  for (const e of entries) {
    const count = beersForEntry(e);
    if (count === 0) continue;
    result.set(e.person, (result.get(e.person) ?? 0) + count);
  }
  return result;
}

// A "drink day" starts at resetHour local time, so a beer at 2am counts
// toward the previous calendar day. Returns a YYYY-MM-DD key.
export function drinkDayKey(timestamp: number, resetHour = 4): string {
  const shifted = new Date(timestamp - resetHour * 60 * 60 * 1000);
  const y = shifted.getFullYear();
  const m = String(shifted.getMonth() + 1).padStart(2, "0");
  const d = String(shifted.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function beersByDate(
  entries: Entry[],
  resetHour = 4,
): Map<string, number> {
  const result = new Map<string, number>();
  for (const e of entries) {
    const count = beersForEntry(e);
    if (count === 0) continue;
    const key = drinkDayKey(e.timestamp, resetHour);
    result.set(key, (result.get(key) ?? 0) + count);
  }
  return result;
}
