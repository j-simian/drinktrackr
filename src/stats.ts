import type { DrinkKind, Entry, Person } from "./types";
import { getPeople } from "./people";
import { beersForEntry, drinkDayKey } from "./beerCount";

const ML_PER_PINT = 568;

const DEFAULT_ABV: Record<DrinkKind, number> = {
  beer: 4.5,
  wine: 12,
  spirit: 40,
  other: 5,
};

export function volumeMl(entry: Entry): number {
  if (entry.quantityValue == null) return 0;
  if (entry.quantityUnit === "pint") return entry.quantityValue * ML_PER_PINT;
  if (entry.quantityUnit === "ml") return entry.quantityValue;
  return 0;
}

// UK alcohol units: 10ml of pure ethanol per unit.
// units = volume_ml * abv_percent / 1000
export function unitsForEntry(entry: Entry): number {
  const ml = volumeMl(entry);
  if (ml === 0) return 0;
  const abv = entry.abv ?? (entry.kind ? DEFAULT_ABV[entry.kind] : undefined);
  if (abv == null) return 0;
  return (ml * abv) / 1000;
}

export function totalUnits(entries: Entry[]): number {
  return entries.reduce((sum, e) => sum + unitsForEntry(e), 0);
}

export function entriesByPerson(entries: Entry[]): Map<Person, Entry[]> {
  const map = new Map<Person, Entry[]>();
  for (const p of getPeople()) map.set(p, []);
  for (const e of entries) {
    let list = map.get(e.person);
    if (!list) {
      list = [];
      map.set(e.person, list);
    }
    list.push(e);
  }
  return map;
}

export function countByPerson(
  entries: Entry[],
  predicate?: (e: Entry) => boolean,
): Map<Person, number> {
  const map = new Map<Person, number>();
  for (const p of getPeople()) map.set(p, 0);
  for (const e of entries) {
    if (predicate && !predicate(e)) continue;
    map.set(e.person, (map.get(e.person) ?? 0) + 1);
  }
  return map;
}

export function unitsByPerson(entries: Entry[]): Map<Person, number> {
  const map = new Map<Person, number>();
  for (const p of getPeople()) map.set(p, 0);
  for (const e of entries) {
    map.set(e.person, (map.get(e.person) ?? 0) + unitsForEntry(e));
  }
  return map;
}

export interface KindCounts {
  beer: number;
  wine: number;
  spirit: number;
  other: number;
}

export function countByKind(entries: Entry[]): KindCounts {
  const counts: KindCounts = { beer: 0, wine: 0, spirit: 0, other: 0 };
  for (const e of entries) {
    if (!e.kind) continue;
    counts[e.kind] += 1;
  }
  return counts;
}

export function entriesByDay(entries: Entry[]): Map<string, Entry[]> {
  const map = new Map<string, Entry[]>();
  for (const e of entries) {
    const key = drinkDayKey(e.timestamp);
    const list = map.get(key) ?? [];
    list.push(e);
    map.set(key, list);
  }
  return map;
}

// Returns one row per drink-day, sorted ascending by key. Each row has a count
// per person plus a total. Useful for stacked daily charts.
export interface DailyRow {
  key: string;
  total: number;
  byPerson: Record<Person, number>;
}

export function dailyHistory(entries: Entry[]): DailyRow[] {
  const map = new Map<string, DailyRow>();
  for (const e of entries) {
    const key = drinkDayKey(e.timestamp);
    let row = map.get(key);
    if (!row) {
      row = {
        key,
        total: 0,
        byPerson: Object.fromEntries(getPeople().map((p) => [p, 0])) as Record<
          Person,
          number
        >,
      };
      map.set(key, row);
    }
    row.byPerson[e.person] = (row.byPerson[e.person] ?? 0) + 1;
    row.total += 1;
  }
  return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
}

// Longest run of consecutive drink-days (any drink counts).
export function longestStreak(entries: Entry[]): number {
  const dayKeys = new Set<string>();
  for (const e of entries) dayKeys.add(drinkDayKey(e.timestamp));
  if (dayKeys.size === 0) return 0;
  const sorted = Array.from(dayKeys).sort();
  let best = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (isNextDay(sorted[i - 1], sorted[i])) {
      current += 1;
      if (current > best) best = current;
    } else {
      current = 1;
    }
  }
  return best;
}

function isNextDay(a: string, b: string): boolean {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const dateA = new Date(ay, am - 1, ad);
  const dateB = new Date(by, bm - 1, bd);
  const diff = Math.round(
    (dateB.getTime() - dateA.getTime()) / (24 * 60 * 60 * 1000),
  );
  return diff === 1;
}

export function drinkingDays(entries: Entry[]): number {
  const dayKeys = new Set<string>();
  for (const e of entries) dayKeys.add(drinkDayKey(e.timestamp));
  return dayKeys.size;
}

function normaliseName(name: string | undefined): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  return trimmed.toLowerCase();
}

export interface NamedCount {
  name: string;
  count: number;
}

export function topDrinkNames(entries: Entry[], n = 5): NamedCount[] {
  const map = new Map<string, { name: string; count: number }>();
  for (const e of entries) {
    const key = normaliseName(e.name);
    if (!key) continue;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(key, { name: e.name!.trim(), count: 1 });
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, n);
}

export function uniqueDrinkNames(entries: Entry[]): number {
  const set = new Set<string>();
  for (const e of entries) {
    const key = normaliseName(e.name);
    if (key) set.add(key);
  }
  return set.size;
}

// Earliest & latest hours observed (local time).
export function hourBounds(entries: Entry[]): {
  earliest: number | null;
  latest: number | null;
} {
  let earliest: number | null = null;
  let latest: number | null = null;
  for (const e of entries) {
    const hour = new Date(e.timestamp).getHours();
    if (earliest === null || hour < earliest) earliest = hour;
    if (latest === null || hour > latest) latest = hour;
  }
  return { earliest, latest };
}

// "Latest" by drink-day shift: hours 0-3 belong to the previous day and should
// rank later than 23. Returns a comparable number where 4 = 0, 27 = 3.
export function shiftedHour(timestamp: number): number {
  const h = new Date(timestamp).getHours();
  return h < 4 ? h + 24 : h;
}

export function latestShiftedHour(entries: Entry[]): number | null {
  let latest: number | null = null;
  for (const e of entries) {
    const s = shiftedHour(e.timestamp);
    if (latest === null || s > latest) latest = s;
  }
  return latest;
}

export function earliestHour(entries: Entry[]): number | null {
  let earliest: number | null = null;
  for (const e of entries) {
    const s = shiftedHour(e.timestamp);
    // Only count "morning-ish" hours (>= 4) as earliest candidates.
    if (s < 4) continue;
    if (earliest === null || s < earliest) earliest = s;
  }
  return earliest;
}

// Most drinks logged by a single person in any rolling window of `windowMs`.
// Returns the max count and the window start timestamp.
export function mostInRollingWindow(
  entries: Entry[],
  person: Person,
  windowMs: number,
): { count: number; startTs: number | null } {
  const times = entries
    .filter((e) => e.person === person)
    .map((e) => e.timestamp)
    .sort((a, b) => a - b);
  if (times.length === 0) return { count: 0, startTs: null };
  let best = 1;
  let bestStart = times[0];
  let left = 0;
  for (let right = 0; right < times.length; right++) {
    while (times[right] - times[left] > windowMs) left++;
    const count = right - left + 1;
    if (count > best) {
      best = count;
      bestStart = times[left];
    }
  }
  return { count: best, startTs: bestStart };
}

// Single day with the most drinks for an (optional) person.
export function biggestDay(
  entries: Entry[],
  person?: Person,
): { key: string; count: number } | null {
  const map = new Map<string, number>();
  for (const e of entries) {
    if (person && e.person !== person) continue;
    const k = drinkDayKey(e.timestamp);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  let best: { key: string; count: number } | null = null;
  for (const [key, count] of map) {
    if (!best || count > best.count) best = { key, count };
  }
  return best;
}

export function photoFraction(entries: Entry[]): {
  withPhoto: number;
  total: number;
} {
  let withPhoto = 0;
  for (const e of entries) if (e.photo) withPhoto += 1;
  return { withPhoto, total: entries.length };
}

export function uniqueSpiritNames(entries: Entry[]): number {
  const set = new Set<string>();
  for (const e of entries) {
    if (e.kind !== "spirit") continue;
    const key = normaliseName(e.name);
    if (key) set.add(key);
  }
  return set.size;
}

// Days where everyone in the roster logged at least one drink.
export function daysWithAllFive(entries: Entry[]): string[] {
  const roster = getPeople();
  if (roster.length === 0) return [];
  const byDay = new Map<string, Set<Person>>();
  for (const e of entries) {
    const k = drinkDayKey(e.timestamp);
    let set = byDay.get(k);
    if (!set) {
      set = new Set();
      byDay.set(k, set);
    }
    set.add(e.person);
  }
  const result: string[] = [];
  for (const [k, set] of byDay) {
    if (roster.every((p) => set.has(p))) result.push(k);
  }
  return result.sort();
}

// True if at any moment everyone in the roster logged the same drink name
// within a window of `windowMs`.
export function roundOfFive(entries: Entry[], windowMs: number): boolean {
  const roster = getPeople();
  if (roster.length === 0) return false;
  const byName = new Map<string, Entry[]>();
  for (const e of entries) {
    const key = normaliseName(e.name);
    if (!key) continue;
    const list = byName.get(key) ?? [];
    list.push(e);
    byName.set(key, list);
  }
  for (const list of byName.values()) {
    if (list.length < roster.length) continue;
    const sorted = list.slice().sort((a, b) => a.timestamp - b.timestamp);
    let left = 0;
    const peopleInWindow = new Map<Person, number>();
    for (let right = 0; right < sorted.length; right++) {
      const p = sorted[right].person;
      peopleInWindow.set(p, (peopleInWindow.get(p) ?? 0) + 1);
      while (sorted[right].timestamp - sorted[left].timestamp > windowMs) {
        const lp = sorted[left].person;
        const c = peopleInWindow.get(lp) ?? 0;
        if (c <= 1) peopleInWindow.delete(lp);
        else peopleInWindow.set(lp, c - 1);
        left++;
      }
      if (roster.every((rp) => peopleInWindow.has(rp))) return true;
    }
  }
  return false;
}

// Did anyone have a single drink-day spanning more than `hours` hours?
export function maxDaySpanHours(entries: Entry[]): number {
  const byDay = new Map<string, { min: number; max: number }>();
  for (const e of entries) {
    const k = drinkDayKey(e.timestamp);
    const existing = byDay.get(k);
    if (!existing) byDay.set(k, { min: e.timestamp, max: e.timestamp });
    else {
      if (e.timestamp < existing.min) existing.min = e.timestamp;
      if (e.timestamp > existing.max) existing.max = e.timestamp;
    }
  }
  let best = 0;
  for (const { min, max } of byDay.values()) {
    const span = (max - min) / (60 * 60 * 1000);
    if (span > best) best = span;
  }
  return best;
}

export function totalDrinkCount(entries: Entry[]): number {
  return entries.length;
}

export function beerCount(entries: Entry[]): number {
  return entries.reduce((sum, e) => sum + beersForEntry(e), 0);
}

export function largestSinglePour(
  entries: Entry[],
): { entry: Entry; ml: number } | null {
  let best: { entry: Entry; ml: number } | null = null;
  for (const e of entries) {
    const ml = volumeMl(e);
    if (ml === 0) continue;
    if (!best || ml > best.ml) best = { entry: e, ml };
  }
  return best;
}

// Helpers for kind-specific filters.
export const isBeer = (e: Entry) => e.kind === "beer";
export const isWine = (e: Entry) => e.kind === "wine";
export const isSpirit = (e: Entry) => e.kind === "spirit";
export const isOther = (e: Entry) => e.kind === "other";
