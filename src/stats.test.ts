import { describe, expect, it } from "vitest";
import type { Entry } from "./types";
import {
  biggestDay,
  countByKind,
  dailyHistory,
  daysWithAllFive,
  largestSinglePour,
  longestStreak,
  maxDaySpanHours,
  mostInRollingWindow,
  roundOfFive,
  topDrinkNames,
  totalUnits,
  uniqueDrinkNames,
  uniqueSpiritNames,
  unitsForEntry,
  volumeMl,
} from "./stats";

function entry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: "id",
    person: "Naman",
    timestamp: new Date(2026, 4, 18, 12, 0, 0).getTime(),
    kind: "beer",
    quantityValue: 500,
    quantityUnit: "ml",
    ...overrides,
  };
}

describe("volumeMl", () => {
  it("returns ml when unit is ml", () => {
    expect(volumeMl(entry({ quantityValue: 330, quantityUnit: "ml" }))).toBe(
      330,
    );
  });

  it("converts pints to ml using 568ml per pint", () => {
    expect(volumeMl(entry({ quantityValue: 1, quantityUnit: "pint" }))).toBe(
      568,
    );
    expect(volumeMl(entry({ quantityValue: 0.5, quantityUnit: "pint" }))).toBe(
      284,
    );
  });

  it("returns 0 when no quantity", () => {
    expect(volumeMl(entry({ quantityValue: undefined }))).toBe(0);
  });
});

describe("unitsForEntry", () => {
  it("uses provided ABV when present", () => {
    const u = unitsForEntry(
      entry({ quantityValue: 500, quantityUnit: "ml", abv: 5 }),
    );
    expect(u).toBeCloseTo(2.5);
  });

  it("falls back to beer default when ABV missing", () => {
    const u = unitsForEntry(
      entry({ kind: "beer", quantityValue: 500, quantityUnit: "ml" }),
    );
    expect(u).toBeCloseTo(2.25);
  });

  it("falls back to spirit default when ABV missing", () => {
    const u = unitsForEntry(
      entry({ kind: "spirit", quantityValue: 50, quantityUnit: "ml" }),
    );
    expect(u).toBeCloseTo(2);
  });

  it("returns 0 with no kind or abv", () => {
    expect(
      unitsForEntry(
        entry({ kind: undefined, quantityValue: 500, quantityUnit: "ml" }),
      ),
    ).toBe(0);
  });
});

describe("totalUnits", () => {
  it("sums units across entries", () => {
    const entries = [
      entry({ id: "a", quantityValue: 500, quantityUnit: "ml", abv: 5 }),
      entry({ id: "b", quantityValue: 50, quantityUnit: "ml", kind: "spirit" }),
    ];
    expect(totalUnits(entries)).toBeCloseTo(2.5 + 2);
  });
});

describe("countByKind", () => {
  it("counts each kind", () => {
    const entries = [
      entry({ id: "1", kind: "beer" }),
      entry({ id: "2", kind: "beer" }),
      entry({ id: "3", kind: "wine" }),
      entry({ id: "4", kind: "spirit" }),
      entry({ id: "5", kind: "other" }),
      entry({ id: "6", kind: undefined }),
    ];
    expect(countByKind(entries)).toEqual({
      beer: 2,
      wine: 1,
      spirit: 1,
      other: 1,
    });
  });
});

describe("longestStreak", () => {
  it("returns 0 for no entries", () => {
    expect(longestStreak([])).toBe(0);
  });

  it("counts consecutive drink-days", () => {
    const entries = [
      entry({ id: "a", timestamp: new Date(2026, 4, 16, 12).getTime() }),
      entry({ id: "b", timestamp: new Date(2026, 4, 17, 12).getTime() }),
      entry({ id: "c", timestamp: new Date(2026, 4, 18, 12).getTime() }),
      entry({ id: "d", timestamp: new Date(2026, 4, 20, 12).getTime() }),
    ];
    expect(longestStreak(entries)).toBe(3);
  });

  it("treats 2am as previous drink-day", () => {
    const entries = [
      entry({ id: "a", timestamp: new Date(2026, 4, 16, 22).getTime() }),
      entry({ id: "b", timestamp: new Date(2026, 4, 17, 2).getTime() }),
    ];
    expect(longestStreak(entries)).toBe(1);
  });
});

describe("mostInRollingWindow", () => {
  it("returns 0 when person has no entries", () => {
    expect(mostInRollingWindow([], "Naman", 60 * 60 * 1000)).toEqual({
      count: 0,
      startTs: null,
    });
  });

  it("finds the densest 1-hour burst", () => {
    const t0 = new Date(2026, 4, 18, 20, 0).getTime();
    const entries: Entry[] = [
      entry({ id: "a", person: "Jess", timestamp: t0 }),
      entry({ id: "b", person: "Jess", timestamp: t0 + 10 * 60 * 1000 }),
      entry({ id: "c", person: "Jess", timestamp: t0 + 20 * 60 * 1000 }),
      entry({ id: "d", person: "Jess", timestamp: t0 + 30 * 60 * 1000 }),
      entry({ id: "e", person: "Jess", timestamp: t0 + 90 * 60 * 1000 }),
    ];
    const result = mostInRollingWindow(entries, "Jess", 60 * 60 * 1000);
    expect(result.count).toBe(4);
    expect(result.startTs).toBe(t0);
  });
});

describe("topDrinkNames", () => {
  it("ranks names case-insensitively", () => {
    const entries = [
      entry({ id: "1", name: "Pilsner Urquell" }),
      entry({ id: "2", name: "pilsner urquell" }),
      entry({ id: "3", name: "Kozel" }),
      entry({ id: "4", name: "PILSNER URQUELL" }),
      entry({ id: "5", name: "Kozel" }),
      entry({ id: "6" }),
    ];
    const top = topDrinkNames(entries, 5);
    expect(top[0]).toEqual({ name: "Pilsner Urquell", count: 3 });
    expect(top[1]).toEqual({ name: "Kozel", count: 2 });
  });
});

describe("uniqueDrinkNames / uniqueSpiritNames", () => {
  it("counts unique names case-insensitively", () => {
    const entries = [
      entry({ id: "1", name: "Pilsner" }),
      entry({ id: "2", name: "PILSNER" }),
      entry({ id: "3", name: "Kozel" }),
    ];
    expect(uniqueDrinkNames(entries)).toBe(2);
  });

  it("counts unique spirit names only", () => {
    const entries = [
      entry({ id: "1", kind: "spirit", name: "Jameson" }),
      entry({ id: "2", kind: "spirit", name: "JD Honey" }),
      entry({ id: "3", kind: "beer", name: "Kozel" }),
    ];
    expect(uniqueSpiritNames(entries)).toBe(2);
  });
});

describe("dailyHistory", () => {
  it("groups entries per day with per-person counts", () => {
    const entries: Entry[] = [
      entry({ id: "1", person: "Naman", timestamp: new Date(2026, 4, 18, 12).getTime() }),
      entry({ id: "2", person: "Jess", timestamp: new Date(2026, 4, 18, 13).getTime() }),
      entry({ id: "3", person: "Naman", timestamp: new Date(2026, 4, 19, 14).getTime() }),
    ];
    const rows = dailyHistory(entries);
    expect(rows).toHaveLength(2);
    expect(rows[0].key).toBe("2026-05-18");
    expect(rows[0].total).toBe(2);
    expect(rows[0].byPerson.Naman).toBe(1);
    expect(rows[0].byPerson.Jess).toBe(1);
    expect(rows[1].byPerson.Naman).toBe(1);
  });
});

describe("daysWithAllFive", () => {
  it("returns days where every person logged a drink", () => {
    const day1 = new Date(2026, 4, 18, 12).getTime();
    const day2 = new Date(2026, 4, 19, 12).getTime();
    const entries: Entry[] = [
      entry({ id: "1", person: "Naman", timestamp: day1 }),
      entry({ id: "2", person: "Jess", timestamp: day1 }),
      entry({ id: "3", person: "Ross", timestamp: day1 }),
      entry({ id: "4", person: "Duncan", timestamp: day1 }),
      entry({ id: "5", person: "Chaz", timestamp: day1 }),
      entry({ id: "6", person: "Kash", timestamp: day1 }),
      entry({ id: "7", person: "Naman", timestamp: day2 }),
    ];
    expect(daysWithAllFive(entries)).toEqual(["2026-05-18"]);
  });
});

describe("roundOfFive", () => {
  it("detects everyone drinking the same drink within the window", () => {
    const t0 = new Date(2026, 4, 18, 20, 0).getTime();
    const entries: Entry[] = [
      entry({ id: "1", person: "Naman", name: "Pilsner Urquell", timestamp: t0 }),
      entry({ id: "2", person: "Jess", name: "Pilsner Urquell", timestamp: t0 + 60_000 }),
      entry({ id: "3", person: "Ross", name: "Pilsner Urquell", timestamp: t0 + 120_000 }),
      entry({ id: "4", person: "Duncan", name: "Pilsner Urquell", timestamp: t0 + 180_000 }),
      entry({ id: "5", person: "Chaz", name: "Pilsner Urquell", timestamp: t0 + 240_000 }),
      entry({ id: "6", person: "Kash", name: "Pilsner Urquell", timestamp: t0 + 300_000 }),
    ];
    expect(roundOfFive(entries, 10 * 60 * 1000)).toBe(true);
  });

  it("returns false when window is too short", () => {
    const t0 = new Date(2026, 4, 18, 20, 0).getTime();
    const entries: Entry[] = [
      entry({ id: "1", person: "Naman", name: "Beer", timestamp: t0 }),
      entry({ id: "2", person: "Jess", name: "Beer", timestamp: t0 + 60_000 }),
      entry({ id: "3", person: "Ross", name: "Beer", timestamp: t0 + 15 * 60_000 }),
      entry({ id: "4", person: "Duncan", name: "Beer", timestamp: t0 + 25 * 60_000 }),
      entry({ id: "5", person: "Chaz", name: "Beer", timestamp: t0 + 35 * 60_000 }),
      entry({ id: "6", person: "Kash", name: "Beer", timestamp: t0 + 45 * 60_000 }),
    ];
    expect(roundOfFive(entries, 10 * 60 * 1000)).toBe(false);
  });

  it("returns false when not everyone joined the round", () => {
    const t0 = new Date(2026, 4, 18, 20, 0).getTime();
    const entries: Entry[] = [
      entry({ id: "1", person: "Naman", name: "Beer", timestamp: t0 }),
      entry({ id: "2", person: "Jess", name: "Beer", timestamp: t0 + 60_000 }),
    ];
    expect(roundOfFive(entries, 10 * 60 * 1000)).toBe(false);
  });
});

describe("biggestDay", () => {
  it("finds the day with the most drinks per person", () => {
    const t1 = new Date(2026, 4, 18, 12).getTime();
    const t2 = new Date(2026, 4, 19, 12).getTime();
    const entries: Entry[] = [
      entry({ id: "1", person: "Naman", timestamp: t1 }),
      entry({ id: "2", person: "Naman", timestamp: t1 + 3600_000 }),
      entry({ id: "3", person: "Naman", timestamp: t2 }),
    ];
    expect(biggestDay(entries, "Naman")).toEqual({
      key: "2026-05-18",
      count: 2,
    });
  });

  it("returns null with no entries", () => {
    expect(biggestDay([], "Naman")).toBeNull();
  });
});

describe("largestSinglePour", () => {
  it("returns the largest volume entry", () => {
    const entries: Entry[] = [
      entry({ id: "1", quantityValue: 500, quantityUnit: "ml" }),
      entry({ id: "2", quantityValue: 1, quantityUnit: "pint" }),
      entry({ id: "3", quantityValue: 1000, quantityUnit: "ml" }),
    ];
    const result = largestSinglePour(entries);
    expect(result?.entry.id).toBe("3");
    expect(result?.ml).toBe(1000);
  });
});

describe("maxDaySpanHours", () => {
  it("returns the longest span across any single drink-day", () => {
    const start = new Date(2026, 4, 18, 12).getTime();
    const entries: Entry[] = [
      entry({ id: "1", timestamp: start }),
      entry({ id: "2", timestamp: start + 13 * 3600_000 }),
    ];
    expect(maxDaySpanHours(entries)).toBeCloseTo(13);
  });
});
