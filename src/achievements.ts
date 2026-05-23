import type { Entry, Person } from "./types";
import { PEOPLE } from "./types";
import { beersForEntry, drinkDayKey } from "./beerCount";
import {
  countByKind,
  daysWithAllFive,
  drinkingDays,
  largestSinglePour,
  longestStreak,
  maxDaySpanHours,
  mostInRollingWindow,
  roundOfFive,
  shiftedHour,
  uniqueDrinkNames,
  uniqueSpiritNames,
  volumeMl,
} from "./stats";

export interface PersonalResult {
  unlocked: boolean;
  progress?: number;
  total?: number;
}

export interface GroupResult {
  unlocked: boolean;
  detail?: string;
}

export interface ComparativeResult {
  winners: Person[];
  value: number;
  ranking: { person: Person; value: number }[];
  formatValue(value: number): string;
}

export interface PersonalAchievement {
  kind: "personal";
  id: string;
  emoji: string;
  label: string;
  description: string;
  evaluate(entries: Entry[], person: Person): PersonalResult;
}

export interface GroupAchievement {
  kind: "group";
  id: string;
  emoji: string;
  label: string;
  description: string;
  evaluate(entries: Entry[]): GroupResult;
}

export interface ComparativeAchievement {
  kind: "comparative";
  id: string;
  emoji: string;
  label: string;
  description: string;
  evaluate(entries: Entry[]): ComparativeResult;
}

export type Achievement =
  | PersonalAchievement
  | GroupAchievement
  | ComparativeAchievement;

function entriesFor(entries: Entry[], person: Person): Entry[] {
  return entries.filter((e) => e.person === person);
}

function rank(
  entries: Entry[],
  metric: (es: Entry[]) => number,
): ComparativeResult {
  const ranking = PEOPLE.map((p) => ({
    person: p,
    value: metric(entriesFor(entries, p)),
  })).sort((a, b) => b.value - a.value || a.person.localeCompare(b.person));
  const top = ranking[0]?.value ?? 0;
  const winners = top > 0 ? ranking.filter((r) => r.value === top).map((r) => r.person) : [];
  return {
    winners,
    value: top,
    ranking,
    formatValue: (v) => `${v}`,
  };
}

const PERSONAL: PersonalAchievement[] = [
  {
    kind: "personal",
    id: "first-sip",
    emoji: "🍻",
    label: "First Sip",
    description: "Log your first drink.",
    evaluate(entries, person) {
      const n = entriesFor(entries, person).length;
      return { unlocked: n > 0, progress: Math.min(n, 1), total: 1 };
    },
  },
  {
    kind: "personal",
    id: "century-club",
    emoji: "🍺",
    label: "Century Club",
    description: "Reach 100 beers.",
    evaluate(entries, person) {
      const n = entriesFor(entries, person).reduce(
        (sum, e) => sum + beersForEntry(e),
        0,
      );
      return { unlocked: n >= 100, progress: n, total: 100 };
    },
  },
  {
    kind: "personal",
    id: "variety-pack",
    emoji: "🌈",
    label: "Variety Pack",
    description: "Log a beer, wine, spirit and 'other' drink.",
    evaluate(entries, person) {
      const kinds = countByKind(entriesFor(entries, person));
      const distinct =
        (kinds.beer > 0 ? 1 : 0) +
        (kinds.wine > 0 ? 1 : 0) +
        (kinds.spirit > 0 ? 1 : 0) +
        (kinds.other > 0 ? 1 : 0);
      return { unlocked: distinct === 4, progress: distinct, total: 4 };
    },
  },
  {
    kind: "personal",
    id: "czech-it-out",
    emoji: "🇨🇿",
    label: "Czech It Out",
    description: "Drink Pilsner Urquell, Kozel and Staropramen.",
    evaluate(entries, person) {
      const names = new Set(
        entriesFor(entries, person)
          .map((e) => e.name?.trim().toLowerCase())
          .filter(Boolean) as string[],
      );
      const hasPilsner = Array.from(names).some((n) =>
        n.includes("pilsner urquell"),
      );
      const hasKozel = Array.from(names).some((n) => n.includes("kozel"));
      const hasStaro = Array.from(names).some((n) =>
        n.includes("staropramen"),
      );
      const hit = (hasPilsner ? 1 : 0) + (hasKozel ? 1 : 0) + (hasStaro ? 1 : 0);
      return { unlocked: hit === 3, progress: hit, total: 3 };
    },
  },
  {
    kind: "personal",
    id: "paparazzi",
    emoji: "📸",
    label: "Paparazzi",
    description: "Snap a photo with 25 drinks.",
    evaluate(entries, person) {
      const n = entriesFor(entries, person).filter((e) => e.photo).length;
      return { unlocked: n >= 25, progress: n, total: 25 };
    },
  },
  {
    kind: "personal",
    id: "night-owl",
    emoji: "🌙",
    label: "Night Owl",
    description: "Log a drink between 1am and 4am.",
    evaluate(entries, person) {
      const hit = entriesFor(entries, person).some((e) => {
        const h = new Date(e.timestamp).getHours();
        return h >= 1 && h < 4;
      });
      return { unlocked: hit, progress: hit ? 1 : 0, total: 1 };
    },
  },
  {
    kind: "personal",
    id: "early-bird",
    emoji: "🌅",
    label: "Early Bird",
    description: "Log a drink before 10am.",
    evaluate(entries, person) {
      const hit = entriesFor(entries, person).some((e) => {
        const h = new Date(e.timestamp).getHours();
        return h >= 4 && h < 10;
      });
      return { unlocked: hit, progress: hit ? 1 : 0, total: 1 };
    },
  },
  {
    kind: "personal",
    id: "three-in-a-row",
    emoji: "🔥",
    label: "Three in a Row",
    description: "Drink three days in a row.",
    evaluate(entries, person) {
      const streak = longestStreak(entriesFor(entries, person));
      return { unlocked: streak >= 3, progress: streak, total: 3 };
    },
  },
  {
    kind: "personal",
    id: "marathon",
    emoji: "💪",
    label: "Marathon",
    description: "Log 10 drinks in a single day.",
    evaluate(entries, person) {
      const counts = new Map<string, number>();
      for (const e of entriesFor(entries, person)) {
        const k = drinkDayKey(e.timestamp);
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
      const best = Math.max(0, ...counts.values());
      return { unlocked: best >= 10, progress: best, total: 10 };
    },
  },
  {
    kind: "personal",
    id: "globetrotter",
    emoji: "🌍",
    label: "Globetrotter",
    description: "Try 15 unique drinks.",
    evaluate(entries, person) {
      const n = uniqueDrinkNames(entriesFor(entries, person));
      return { unlocked: n >= 15, progress: n, total: 15 };
    },
  },
  {
    kind: "personal",
    id: "heavy-pour",
    emoji: "🍾",
    label: "Heavy Pour",
    description: "Log a single drink of 1 litre or more.",
    evaluate(entries, person) {
      const hit = entriesFor(entries, person).some((e) => volumeMl(e) >= 1000);
      return { unlocked: hit, progress: hit ? 1 : 0, total: 1 };
    },
  },
  {
    kind: "personal",
    id: "mixologist",
    emoji: "🧪",
    label: "Mixologist",
    description: "Try 5 different spirits.",
    evaluate(entries, person) {
      const n = uniqueSpiritNames(entriesFor(entries, person));
      return { unlocked: n >= 5, progress: n, total: 5 };
    },
  },
  {
    kind: "personal",
    id: "sommelier",
    emoji: "🍷",
    label: "Sommelier",
    description: "Log 5 wines.",
    evaluate(entries, person) {
      const n = entriesFor(entries, person).filter((e) => e.kind === "wine")
        .length;
      return { unlocked: n >= 5, progress: n, total: 5 };
    },
  },
];

const GROUP: GroupAchievement[] = [
  {
    kind: "group",
    id: "squad-goals",
    emoji: "🥂",
    label: "Squad Goals",
    description: "Everyone logged a drink on the same day.",
    evaluate(entries) {
      const days = daysWithAllFive(entries);
      return {
        unlocked: days.length > 0,
        detail: days.length ? `${days.length} day${days.length === 1 ? "" : "s"}` : undefined,
      };
    },
  },
  {
    kind: "group",
    id: "round-of-five",
    emoji: "🎉",
    label: "Round of Five",
    description: "Everyone ordered the same drink within 10 minutes.",
    evaluate(entries) {
      const hit = roundOfFive(entries, 10 * 60 * 1000);
      return { unlocked: hit };
    },
  },
  {
    kind: "group",
    id: "all-nighter",
    emoji: "🌃",
    label: "All-Nighter",
    description: "Drinks spanning 12+ hours on a single drink-day.",
    evaluate(entries) {
      const span = maxDaySpanHours(entries);
      return {
        unlocked: span >= 12,
        detail: span > 0 ? `${span.toFixed(1)}h` : undefined,
      };
    },
  },
];

const COMPARATIVE: ComparativeAchievement[] = [
  {
    kind: "comparative",
    id: "top-of-league",
    emoji: "🏆",
    label: "Top of the League",
    description: "Most total drinks.",
    evaluate(entries) {
      const result = rank(entries, (es) => es.length);
      result.formatValue = (v) => `${v} drink${v === 1 ? "" : "s"}`;
      return result;
    },
  },
  {
    kind: "comparative",
    id: "beer-champion",
    emoji: "🍺",
    label: "Beer Champion",
    description: "Most beers logged.",
    evaluate(entries) {
      const result = rank(entries, (es) =>
        es.reduce((sum, e) => sum + beersForEntry(e), 0),
      );
      result.formatValue = (v) => `${v} beer${v === 1 ? "" : "s"}`;
      return result;
    },
  },
  {
    kind: "comparative",
    id: "spirit-animal",
    emoji: "🥃",
    label: "Spirit Animal",
    description: "Most spirits logged.",
    evaluate(entries) {
      const result = rank(
        entries,
        (es) => es.filter((e) => e.kind === "spirit").length,
      );
      result.formatValue = (v) => `${v} shot${v === 1 ? "" : "s"}`;
      return result;
    },
  },
  {
    kind: "comparative",
    id: "wine-connoisseur",
    emoji: "🍷",
    label: "Wine Connoisseur",
    description: "Most wines logged.",
    evaluate(entries) {
      const result = rank(
        entries,
        (es) => es.filter((e) => e.kind === "wine").length,
      );
      result.formatValue = (v) => `${v} glass${v === 1 ? "" : "es"}`;
      return result;
    },
  },
  {
    kind: "comparative",
    id: "speed-demon",
    emoji: "⚡",
    label: "Speed Demon",
    description: "Most drinks in any 1-hour window.",
    evaluate(entries) {
      const ranking = PEOPLE.map((p) => ({
        person: p,
        value: mostInRollingWindow(entries, p, 60 * 60 * 1000).count,
      })).sort(
        (a, b) => b.value - a.value || a.person.localeCompare(b.person),
      );
      const top = ranking[0]?.value ?? 0;
      const winners =
        top > 0 ? ranking.filter((r) => r.value === top).map((r) => r.person) : [];
      return {
        winners,
        value: top,
        ranking,
        formatValue: (v) => `${v} in an hour`,
      };
    },
  },
  {
    kind: "comparative",
    id: "24h-hero",
    emoji: "📅",
    label: "24-Hour Hero",
    description: "Most drinks in any 24-hour window.",
    evaluate(entries) {
      const ranking = PEOPLE.map((p) => ({
        person: p,
        value: mostInRollingWindow(entries, p, 24 * 60 * 60 * 1000).count,
      })).sort(
        (a, b) => b.value - a.value || a.person.localeCompare(b.person),
      );
      const top = ranking[0]?.value ?? 0;
      const winners =
        top > 0 ? ranking.filter((r) => r.value === top).map((r) => r.person) : [];
      return {
        winners,
        value: top,
        ranking,
        formatValue: (v) => `${v} in 24h`,
      };
    },
  },
  {
    kind: "comparative",
    id: "latest-owl",
    emoji: "🌃",
    label: "Latest Owl",
    description: "Latest drink ever logged.",
    evaluate(entries) {
      const ranking = PEOPLE.map((p) => {
        const es = entriesFor(entries, p);
        let latest = -1;
        for (const e of es) {
          const s = shiftedHour(e.timestamp);
          if (s > latest) latest = s;
        }
        return { person: p, value: latest };
      }).sort(
        (a, b) => b.value - a.value || a.person.localeCompare(b.person),
      );
      const top = ranking[0]?.value ?? -1;
      const winners =
        top >= 0 ? ranking.filter((r) => r.value === top).map((r) => r.person) : [];
      return {
        winners,
        value: top,
        ranking,
        formatValue: (v) => {
          if (v < 0) return "—";
          const h = v % 24;
          return `${h.toString().padStart(2, "0")}:00`;
        },
      };
    },
  },
  {
    kind: "comparative",
    id: "earliest-bird",
    emoji: "🌅",
    label: "Earliest Bird",
    description: "Earliest drink of the day.",
    evaluate(entries) {
      const ranking = PEOPLE.map((p) => {
        const es = entriesFor(entries, p);
        let earliest = 99;
        for (const e of es) {
          const h = new Date(e.timestamp).getHours();
          if (h < 4) continue; // belongs to previous drink-day
          if (h < earliest) earliest = h;
        }
        return { person: p, value: earliest };
      })
        .filter((r) => r.value !== 99)
        .sort((a, b) => a.value - b.value || a.person.localeCompare(b.person));
      const top = ranking[0]?.value ?? null;
      const winners =
        top !== null ? ranking.filter((r) => r.value === top).map((r) => r.person) : [];
      return {
        winners,
        value: top ?? 0,
        ranking: ranking.length ? ranking : PEOPLE.map((p) => ({ person: p, value: 0 })),
        formatValue: (v) =>
          v ? `${v.toString().padStart(2, "0")}:00` : "—",
      };
    },
  },
  {
    kind: "comparative",
    id: "heavy-pour-holder",
    emoji: "🍾",
    label: "Heavy Pour Holder",
    description: "Largest single drink.",
    evaluate(entries) {
      const ranking = PEOPLE.map((p) => {
        const largest = largestSinglePour(entriesFor(entries, p));
        return { person: p, value: largest?.ml ?? 0 };
      }).sort(
        (a, b) => b.value - a.value || a.person.localeCompare(b.person),
      );
      const top = ranking[0]?.value ?? 0;
      const winners =
        top > 0 ? ranking.filter((r) => r.value === top).map((r) => r.person) : [];
      return {
        winners,
        value: top,
        ranking,
        formatValue: (v) => `${v} ml`,
      };
    },
  },
  {
    kind: "comparative",
    id: "most-documented",
    emoji: "📸",
    label: "Most Documented",
    description: "Most entries with a photo.",
    evaluate(entries) {
      const result = rank(entries, (es) => es.filter((e) => e.photo).length);
      result.formatValue = (v) => `${v} photo${v === 1 ? "" : "s"}`;
      return result;
    },
  },
  {
    kind: "comparative",
    id: "variety-king",
    emoji: "🌍",
    label: "Variety King",
    description: "Most unique drink names.",
    evaluate(entries) {
      const result = rank(entries, (es) => uniqueDrinkNames(es));
      result.formatValue = (v) => `${v} unique`;
      return result;
    },
  },
  {
    kind: "comparative",
    id: "iron-liver",
    emoji: "🗓️",
    label: "Iron Liver",
    description: "Most drinking days.",
    evaluate(entries) {
      const result = rank(entries, (es) => drinkingDays(es));
      result.formatValue = (v) => `${v} day${v === 1 ? "" : "s"}`;
      return result;
    },
  },
  {
    kind: "comparative",
    id: "streak-king",
    emoji: "🔥",
    label: "Streak King",
    description: "Longest consecutive drinking streak.",
    evaluate(entries) {
      const result = rank(entries, (es) => longestStreak(es));
      result.formatValue = (v) => `${v} day${v === 1 ? "" : "s"}`;
      return result;
    },
  },
];

export const PERSONAL_ACHIEVEMENTS = PERSONAL;
export const GROUP_ACHIEVEMENTS = GROUP;
export const COMPARATIVE_ACHIEVEMENTS = COMPARATIVE;
