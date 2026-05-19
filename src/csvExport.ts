import type { Entry } from "./types";

const COLUMNS = [
  "id",
  "person",
  "timestamp",
  "kind",
  "name",
  "quantityValue",
  "quantityUnit",
  "abv",
  "hasPhoto",
] as const;

function escapeCell(value: unknown): string {
  if (value == null) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function entriesToCsv(entries: Entry[]): string {
  const rows = [COLUMNS.join(",")];
  for (const e of entries) {
    rows.push(
      [
        e.id,
        e.person,
        new Date(e.timestamp).toISOString(),
        e.kind ?? "",
        e.name ?? "",
        e.quantityValue ?? "",
        e.quantityUnit ?? "",
        e.abv ?? "",
        e.photo ? "yes" : "no",
      ]
        .map(escapeCell)
        .join(","),
    );
  }
  return rows.join("\n");
}

export function downloadCsv(entries: Entry[]): void {
  const csv = entriesToCsv(entries);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `bevlog-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
