import type { Entry } from "./types";

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
