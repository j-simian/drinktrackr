import { describe, expect, it } from "vitest";
import type { Entry } from "./types";
import {
  COMPARATIVE_ACHIEVEMENTS,
  GROUP_ACHIEVEMENTS,
  PERSONAL_ACHIEVEMENTS,
} from "./achievements";

function entry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: "id",
    person: "Naman",
    timestamp: new Date(2026, 4, 18, 12, 0).getTime(),
    kind: "beer",
    quantityValue: 500,
    quantityUnit: "ml",
    ...overrides,
  };
}

function findPersonal(id: string) {
  const a = PERSONAL_ACHIEVEMENTS.find((x) => x.id === id);
  if (!a) throw new Error(`missing personal achievement ${id}`);
  return a;
}

function findGroup(id: string) {
  const a = GROUP_ACHIEVEMENTS.find((x) => x.id === id);
  if (!a) throw new Error(`missing group achievement ${id}`);
  return a;
}

function findComparative(id: string) {
  const a = COMPARATIVE_ACHIEVEMENTS.find((x) => x.id === id);
  if (!a) throw new Error(`missing comparative achievement ${id}`);
  return a;
}

describe("personal: century-club", () => {
  it("tracks beer progress for a person", () => {
    const ach = findPersonal("century-club");
    const entries: Entry[] = [
      entry({ id: "1", person: "Naman" }),
      entry({ id: "2", person: "Naman" }),
      entry({ id: "3", person: "Jess" }),
    ];
    const result = ach.evaluate(entries, "Naman");
    expect(result.progress).toBe(2);
    expect(result.total).toBe(100);
    expect(result.unlocked).toBe(false);
  });

  it("unlocks at 100", () => {
    const ach = findPersonal("century-club");
    const entries: Entry[] = Array.from({ length: 100 }, (_, i) =>
      entry({ id: String(i), person: "Naman" }),
    );
    expect(ach.evaluate(entries, "Naman").unlocked).toBe(true);
  });
});

describe("personal: variety-pack", () => {
  it("unlocks when all four kinds are logged", () => {
    const ach = findPersonal("variety-pack");
    const entries: Entry[] = [
      entry({ id: "1", kind: "beer" }),
      entry({ id: "2", kind: "wine" }),
      entry({ id: "3", kind: "spirit" }),
      entry({ id: "4", kind: "other" }),
    ];
    expect(ach.evaluate(entries, "Naman").unlocked).toBe(true);
  });

  it("reports partial progress", () => {
    const ach = findPersonal("variety-pack");
    const entries: Entry[] = [
      entry({ id: "1", kind: "beer" }),
      entry({ id: "2", kind: "wine" }),
    ];
    const result = ach.evaluate(entries, "Naman");
    expect(result.unlocked).toBe(false);
    expect(result.progress).toBe(2);
  });
});

describe("group: squad-goals", () => {
  it("unlocks when everyone logs on the same day", () => {
    const ach = findGroup("squad-goals");
    const t = new Date(2026, 4, 18, 12).getTime();
    const entries: Entry[] = [
      entry({ id: "1", person: "Naman", timestamp: t }),
      entry({ id: "2", person: "Jess", timestamp: t }),
      entry({ id: "3", person: "Ross", timestamp: t }),
      entry({ id: "4", person: "Duncan", timestamp: t }),
      entry({ id: "5", person: "Chaz", timestamp: t }),
      entry({ id: "6", person: "Kash", timestamp: t }),
      entry({ id: "7", person: "Tess", timestamp: t }),
      entry({ id: "8", person: "Emma", timestamp: t }),
      entry({ id: "9", person: "Niamh", timestamp: t }),
    ];
    const result = ach.evaluate(entries);
    expect(result.unlocked).toBe(true);
    expect(result.detail).toContain("1");
  });

  it("does not unlock when someone is missing", () => {
    const ach = findGroup("squad-goals");
    const t = new Date(2026, 4, 18, 12).getTime();
    const entries: Entry[] = [
      entry({ id: "1", person: "Naman", timestamp: t }),
      entry({ id: "2", person: "Jess", timestamp: t }),
      entry({ id: "3", person: "Ross", timestamp: t }),
      entry({ id: "4", person: "Duncan", timestamp: t }),
      entry({ id: "5", person: "Chaz", timestamp: t }),
    ];
    expect(ach.evaluate(entries).unlocked).toBe(false);
  });
});

describe("comparative: top-of-league", () => {
  it("returns the person with the most drinks", () => {
    const ach = findComparative("top-of-league");
    const t = new Date(2026, 4, 18, 12).getTime();
    const entries: Entry[] = [
      entry({ id: "1", person: "Naman", timestamp: t }),
      entry({ id: "2", person: "Jess", timestamp: t }),
      entry({ id: "3", person: "Jess", timestamp: t + 1000 }),
      entry({ id: "4", person: "Jess", timestamp: t + 2000 }),
    ];
    const result = ach.evaluate(entries);
    expect(result.winners).toEqual(["Jess"]);
    expect(result.value).toBe(3);
  });

  it("handles ties by listing all winners", () => {
    const ach = findComparative("top-of-league");
    const t = new Date(2026, 4, 18, 12).getTime();
    const entries: Entry[] = [
      entry({ id: "1", person: "Naman", timestamp: t }),
      entry({ id: "2", person: "Jess", timestamp: t }),
    ];
    const result = ach.evaluate(entries);
    expect(result.winners.length).toBe(2);
    expect(result.winners).toContain("Naman");
    expect(result.winners).toContain("Jess");
  });

  it("returns empty winners when there are no entries", () => {
    const ach = findComparative("top-of-league");
    expect(ach.evaluate([]).winners).toEqual([]);
  });
});

describe("comparative: speed-demon", () => {
  it("awards the person with the densest 1-hour burst", () => {
    const ach = findComparative("speed-demon");
    const t = new Date(2026, 4, 18, 20).getTime();
    const entries: Entry[] = [
      entry({ id: "1", person: "Jess", timestamp: t }),
      entry({ id: "2", person: "Jess", timestamp: t + 5 * 60_000 }),
      entry({ id: "3", person: "Jess", timestamp: t + 10 * 60_000 }),
      entry({ id: "4", person: "Naman", timestamp: t }),
    ];
    const result = ach.evaluate(entries);
    expect(result.winners).toEqual(["Jess"]);
    expect(result.value).toBe(3);
  });
});
