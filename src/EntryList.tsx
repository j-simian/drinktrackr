import { useEffect, useMemo, useState } from "react";
import { deleteEntry, getEntries, saveEntry } from "./db";
import {
  DrinkForm,
  entryFieldsFromValues,
  timestampFromValues,
  type DrinkFormValues,
} from "./DrinkForm";
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
  const [editing, setEditing] = useState<Entry | null>(null);

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

  async function handleEditSubmit(values: DrinkFormValues) {
    if (!editing || !values.person) return;
    const ts = timestampFromValues(values);
    await saveEntry({
      ...editing,
      person: values.person,
      timestamp: ts ?? editing.timestamp,
      ...entryFieldsFromValues(values),
    });
    setEditing(null);
    onChange();
  }

  return (
    <>
      <section className="entries-section">
        <h2>Recent</h2>
        {entries.length === 0 ? (
          <p className="empty">No bevs logged yet.</p>
        ) : (
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
                <div className="entry-actions">
                  <button
                    type="button"
                    className="entry-edit"
                    aria-label="Edit entry"
                    onClick={() => setEditing(entry)}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="entry-delete"
                    aria-label="Delete entry"
                    onClick={() => handleDelete(entry.id)}
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editing && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Edit entry"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditing(null);
          }}
        >
          <div className="modal card">
            <div className="modal-header">
              <h3>Edit entry</h3>
              <button
                type="button"
                className="modal-close"
                aria-label="Close"
                onClick={() => setEditing(null)}
              >
                ×
              </button>
            </div>
            <DrinkForm
              key={editing.id}
              initial={editing}
              submitLabel="Save changes"
              onSubmit={handleEditSubmit}
              onCancel={() => setEditing(null)}
            />
          </div>
        </div>
      )}
    </>
  );
}
