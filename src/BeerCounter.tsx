import { useEffect, useState } from "react";
import { getEntries } from "./db";
import { totalBeers } from "./beerCount";
import { BeerStatsModal } from "./BeerStatsModal";
import type { Entry } from "./types";

interface Props {
  refreshKey: number;
}

const GOAL = 100;

export function BeerCounter({ refreshKey }: Props) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getEntries().then((list) => {
      if (cancelled) return;
      setEntries(list);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const count = totalBeers(entries);
  const pct = Math.min(100, (count / GOAL) * 100);

  return (
    <>
      <button
        type="button"
        className="beer-counter"
        aria-label={`${count} of ${GOAL} beers. Tap for stats.`}
        onClick={() => setShowStats(true)}
      >
        <div className="beer-counter-row">
          <span className="beer-counter-label">🍺 Beers</span>
          <span className="beer-counter-value">
            <strong>{count}</strong>
            <span className="beer-counter-goal">/{GOAL}</span>
          </span>
        </div>
        <div className="beer-counter-bar" aria-hidden="true">
          <div className="beer-counter-fill" style={{ width: `${pct}%` }} />
        </div>
      </button>
      {showStats && (
        <BeerStatsModal
          entries={entries}
          onClose={() => setShowStats(false)}
        />
      )}
    </>
  );
}
