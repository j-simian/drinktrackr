import { describe, expect, it } from "vitest";
import { beersForEntry, totalBeers } from "./beerCount";
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
