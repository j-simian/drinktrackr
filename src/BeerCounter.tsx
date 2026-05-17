import { useEffect, useState } from "react";
import { getEntries } from "./db";
import { totalBeers } from "./beerCount";

interface Props {
  refreshKey: number;
}

const GOAL = 100;

export function BeerCounter({ refreshKey }: Props) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getEntries().then((list) => {
      if (cancelled) return;
      setCount(totalBeers(list));
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const pct = Math.min(100, (count / GOAL) * 100);

  return (
    <div
      className="beer-counter"
      role="status"
      aria-label={`${count} of ${GOAL} beers`}
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
    </div>
  );
}
