import { useMemo } from "react";
import { beersByDate, beersByPerson, drinkDayKey } from "./beerCount";
import type { Entry } from "./types";

interface Props {
  entries: Entry[];
  onClose: () => void;
}

function formatDayLabel(key: string, todayKey: string): string {
  if (key === todayKey) return "Today";
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const todayParts = todayKey.split("-").map(Number);
  const today = new Date(todayParts[0], todayParts[1] - 1, todayParts[2]);
  const diffDays = Math.round(
    (today.getTime() - date.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function BeerStatsModal({ entries, onClose }: Props) {
  const byPerson = useMemo(() => {
    return Array.from(beersByPerson(entries).entries()).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    );
  }, [entries]);

  const byDate = useMemo(() => {
    return Array.from(beersByDate(entries).entries()).sort((a, b) =>
      b[0].localeCompare(a[0]),
    );
  }, [entries]);

  const todayKey = drinkDayKey(Date.now());

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Beer stats"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal card">
        <div className="modal-header">
          <h3>🍺 Beer stats</h3>
          <button
            type="button"
            className="modal-close"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="stats-section">
          <h4 className="stats-heading">By person</h4>
          {byPerson.length === 0 ? (
            <p className="empty">No beers logged yet.</p>
          ) : (
            <ul className="stats-list">
              {byPerson.map(([person, count]) => (
                <li key={person} className="stats-row">
                  <span>{person}</span>
                  <strong>{count}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="stats-section">
          <h4 className="stats-heading">By date</h4>
          {byDate.length === 0 ? (
            <p className="empty">No beers logged yet.</p>
          ) : (
            <ul className="stats-list">
              {byDate.map(([key, count]) => (
                <li key={key} className="stats-row">
                  <span>{formatDayLabel(key, todayKey)}</span>
                  <strong>{count}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
