import { useState } from "react";
import {
  DrinkForm,
  entryFieldsFromValues,
  type DrinkFormValues,
} from "./DrinkForm";
import { clearAllData, getEntries, randomId, saveEntry } from "./db";
import { EntryList } from "./EntryList";
import { BeerCounter } from "./BeerCounter";
import { downloadCsv } from "./csvExport";
import { downloadPhotos } from "./photoExport";

export function App() {
  const [refreshCount, setRefreshCount] = useState(0);

  async function handleCreate(values: DrinkFormValues) {
    if (values.people.length === 0) return;
    const timestamp = Date.now();
    const fields = entryFieldsFromValues(values);
    for (const person of values.people) {
      await saveEntry({
        id: randomId(),
        person,
        timestamp,
        ...fields,
      });
    }
    setRefreshCount((c) => c + 1);
  }

  async function handleExport() {
    const entries = await getEntries();
    if (entries.length === 0) {
      alert("No entries to export.");
      return;
    }
    downloadCsv(entries);
  }

  async function handleExportPhotos() {
    const entries = await getEntries();
    const ok = await downloadPhotos(entries);
    if (!ok) alert("No photos to export.");
  }

  async function handleReset() {
    const ok = window.confirm(
      "Reset all data?\n\nThis will permanently delete every logged drink and clear local storage. This can't be undone.",
    );
    if (!ok) return;
    await clearAllData();
    window.location.reload();
  }

  return (
    <div className="app">
      <header>
        <h1>Bev Log</h1>
        <div className="export-actions">
          <button
            type="button"
            className="export-btn"
            onClick={handleExport}
            aria-label="Export entries as CSV"
          >
            Export CSV
          </button>
          <button
            type="button"
            className="export-btn"
            onClick={handleExportPhotos}
            aria-label="Export photos as ZIP"
          >
            Export Photos
          </button>
          <button
            type="button"
            className="export-btn reset-btn"
            onClick={handleReset}
            aria-label="Reset all data"
          >
            Reset
          </button>
        </div>
      </header>

      <BeerCounter refreshKey={refreshCount} />

      <section className="card">
        <DrinkForm
          submitLabel="Save"
          savedLabel="Saved ✓"
          onSubmit={handleCreate}
          resetOnSubmit
          multiSelectPeople
          manageable
        />
      </section>

      <EntryList
        refreshKey={refreshCount}
        onChange={() => setRefreshCount((c) => c + 1)}
      />
    </div>
  );
}
