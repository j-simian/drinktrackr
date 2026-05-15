import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Entry } from "./types";

interface BevLogDB extends DBSchema {
  entries: {
    key: string;
    value: Entry;
    indexes: { "by-timestamp": number };
  };
}

let dbPromise: Promise<IDBPDatabase<BevLogDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<BevLogDB>("bevlog", 1, {
      upgrade(db) {
        const store = db.createObjectStore("entries", { keyPath: "id" });
        store.createIndex("by-timestamp", "timestamp");
      },
    });
  }
  return dbPromise;
}

export async function saveEntry(entry: Entry): Promise<void> {
  const db = await getDb();
  await db.put("entries", entry);
}

export async function getEntries(): Promise<Entry[]> {
  const db = await getDb();
  const entries = await db.getAllFromIndex("entries", "by-timestamp");
  return entries.reverse();
}

export async function deleteEntry(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("entries", id);
}

export function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
