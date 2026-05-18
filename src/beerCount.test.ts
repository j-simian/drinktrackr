import { describe, expect, it } from "vitest";
import {
  beersByDate,
  beersByPerson,
  beersForEntry,
  drinkDayKey,
  totalBeers,
} from "./beerCount";
import type { Entry } from "./types";

function entry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: "id",
    person: "Addi",
    timestamp: 0,
    kind: "beer",
    ...overrides,
  };
}

describe("beersForEntry", () => {
  it("returns 0 for non-beer kinds", () => {
    expect(beersForEntry(entry({ kind: "wine" }))).toBe(0);
    expect(beersForEntry(entry({ kind: "spirit" }))).toBe(0);
    expect(beersForEntry(entry({ kind: "other" }))).toBe(0);
  });

  it("returns 0 for entries without a kind", () => {
    expect(beersForEntry(entry({ kind: undefined }))).toBe(0);
  });

  it("returns 1 for a beer with no quantity specified", () => {
    expect(beersForEntry(entry())).toBe(1);
  });

  it("returns 1 for a beer measured in pints regardless of value", () => {
    expect(
      beersForEntry(entry({ quantityValue: 0.5, quantityUnit: "pint" })),
    ).toBe(1);
    expect(
      beersForEntry(entry({ quantityValue: 2, quantityUnit: "pint" })),
    ).toBe(1);
  });

  it("returns 2 for ml quantities >= 1000", () => {
    expect(
      beersForEntry(entry({ quantityValue: 1000, quantityUnit: "ml" })),
    ).toBe(2);
    expect(
      beersForEntry(entry({ quantityValue: 1500, quantityUnit: "ml" })),
    ).toBe(2);
  });

  it("returns 0 for ml quantities <= 100", () => {
    expect(
      beersForEntry(entry({ quantityValue: 100, quantityUnit: "ml" })),
    ).toBe(0);
    expect(
      beersForEntry(entry({ quantityValue: 50, quantityUnit: "ml" })),
    ).toBe(0);
    expect(
      beersForEntry(entry({ quantityValue: 0, quantityUnit: "ml" })),
    ).toBe(0);
  });

  it("returns 1 for ml quantities strictly between 100 and 1000", () => {
    expect(
      beersForEntry(entry({ quantityValue: 101, quantityUnit: "ml" })),
    ).toBe(1);
    expect(
      beersForEntry(entry({ quantityValue: 500, quantityUnit: "ml" })),
    ).toBe(1);
    expect(
      beersForEntry(entry({ quantityValue: 999, quantityUnit: "ml" })),
    ).toBe(1);
  });

  it("ignores ml thresholds for non-beer kinds", () => {
    expect(
      beersForEntry(
        entry({ kind: "wine", quantityValue: 1500, quantityUnit: "ml" }),
      ),
    ).toBe(0);
    expect(
      beersForEntry(
        entry({ kind: "spirit", quantityValue: 30, quantityUnit: "ml" }),
      ),
    ).toBe(0);
  });
});

describe("totalBeers", () => {
  it("returns 0 for an empty list", () => {
    expect(totalBeers([])).toBe(0);
  });

  it("sums beer counts across mixed entries", () => {
    const entries: Entry[] = [
      entry({ id: "1" }),
      entry({ id: "2", quantityValue: 1000, quantityUnit: "ml" }),
      entry({ id: "3", quantityValue: 50, quantityUnit: "ml" }),
      entry({ id: "4", kind: "wine", quantityValue: 175, quantityUnit: "ml" }),
      entry({ id: "5", quantityValue: 1, quantityUnit: "pint" }),
    ];
    expect(totalBeers(entries)).toBe(1 + 2 + 0 + 0 + 1);
  });
});

describe("beersByPerson", () => {
  it("returns an empty map for no entries", () => {
    expect(beersByPerson([]).size).toBe(0);
  });

  it("sums beers per person and omits people with no beers", () => {
    const entries: Entry[] = [
      entry({ id: "1", person: "Addi" }),
      entry({
        id: "2",
        person: "Addi",
        quantityValue: 1000,
        quantityUnit: "ml",
      }),
      entry({ id: "3", person: "Jess" }),
      entry({ id: "4", person: "Jess", kind: "wine" }),
      entry({
        id: "5",
        person: "Jonny",
        quantityValue: 50,
        quantityUnit: "ml",
      }),
    ];
    const result = beersByPerson(entries);
    expect(result.get("Addi")).toBe(3);
    expect(result.get("Jess")).toBe(1);
    expect(result.has("Jonny")).toBe(false);
    expect(result.has("Matt")).toBe(false);
  });
});

describe("drinkDayKey", () => {
  it("treats 2am as the previous day", () => {
    const ts = new Date(2026, 4, 18, 2, 0, 0).getTime();
    expect(drinkDayKey(ts)).toBe("2026-05-17");
  });

  it("treats 4am exactly as the new day", () => {
    const ts = new Date(2026, 4, 18, 4, 0, 0).getTime();
    expect(drinkDayKey(ts)).toBe("2026-05-18");
  });

  it("treats 3:59am as the previous day", () => {
    const ts = new Date(2026, 4, 18, 3, 59, 0).getTime();
    expect(drinkDayKey(ts)).toBe("2026-05-17");
  });

  it("treats afternoon as the same calendar day", () => {
    const ts = new Date(2026, 4, 18, 15, 0, 0).getTime();
    expect(drinkDayKey(ts)).toBe("2026-05-18");
  });

  it("respects a custom reset hour", () => {
    const ts = new Date(2026, 4, 18, 5, 0, 0).getTime();
    expect(drinkDayKey(ts, 6)).toBe("2026-05-17");
  });
});

describe("beersByDate", () => {
  it("groups beers by drink day with the 4am reset", () => {
    const entries: Entry[] = [
      entry({ id: "1", timestamp: new Date(2026, 4, 18, 22, 0).getTime() }),
      entry({ id: "2", timestamp: new Date(2026, 4, 19, 1, 30).getTime() }),
      entry({ id: "3", timestamp: new Date(2026, 4, 19, 4, 0).getTime() }),
      entry({ id: "4", timestamp: new Date(2026, 4, 19, 20, 0).getTime() }),
    ];
    const result = beersByDate(entries);
    expect(result.get("2026-05-18")).toBe(2);
    expect(result.get("2026-05-19")).toBe(2);
  });

  it("ignores non-beer entries", () => {
    const entries: Entry[] = [
      entry({ id: "1", timestamp: new Date(2026, 4, 18, 12, 0).getTime() }),
      entry({
        id: "2",
        kind: "wine",
        timestamp: new Date(2026, 4, 18, 13, 0).getTime(),
      }),
    ];
    const result = beersByDate(entries);
    expect(result.get("2026-05-18")).toBe(1);
    expect(result.size).toBe(1);
  });
});
