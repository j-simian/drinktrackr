import { useEffect, useMemo, useState } from "react";
import { deleteEntry, getEntries } from "./db";
import type { Entry } from "./types";

interface Props {
  refreshKey: number;
  onChange: () => void;
}

function formatRelative(ts: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(ts).toLocaleDateString();
}

function describeDrink(entry: Entry): string {
  const parts: string[] = [];
  if (entry.name) parts.push(entry.name);
  if (entry.kind) parts.push(entry.kind);
  if (entry.quantityValue != null) {
    parts.push(
      `${entry.quantityValue}${entry.quantityUnit === "pint" ? " pt" : " ml"}`,
    );
  }
  if (entry.abv != null) parts.push(`${entry.abv}%`);
  return parts.join(" · ") || "—";
}

export function EntryList({ refreshKey, onChange }: Props) {
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    let cancelled = false;
    getEntries().then((list) => {
      if (!cancelled) setEntries(list);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const photoUrls = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of entries) {
      if (e.photo) map.set(e.id, URL.createObjectURL(e.photo));
    }
    return map;
  }, [entries]);

  useEffect(() => {
    return () => {
      for (const url of photoUrls.values()) URL.revokeObjectURL(url);
    };
  }, [photoUrls]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this entry?")) return;
    await deleteEntry(id);
    onChange();
  }

  if (entries.length === 0) {
    return (
      <section className="entries-section">
        <h2>Recent</h2>
        <p className="empty">No bevs logged yet.</p>
      </section>
    );
  }

  return (
    <section className="entries-section">
      <h2>Recent</h2>
      <ul className="entries">
        {entries.map((entry) => (
          <li key={entry.id} className="entry">
            {photoUrls.get(entry.id) ? (
              <img
                src={photoUrls.get(entry.id)}
                alt=""
                className="entry-thumb"
              />
            ) : (
              <div className="entry-thumb placeholder" aria-hidden="true" />
            )}
            <div className="entry-body">
              <div className="entry-top">
                <strong>{entry.person}</strong>
                <span className="entry-time">
                  {formatRelative(entry.timestamp)}
                </span>
              </div>
              <div className="entry-desc">{describeDrink(entry)}</div>
            </div>
            <button
              type="button"
              className="entry-delete"
              aria-label="Delete entry"
              onClick={() => handleDelete(entry.id)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
