import { useState } from "react";
import {
  DrinkForm,
  entryFieldsFromValues,
  type DrinkFormValues,
} from "./DrinkForm";
import { getEntries, randomId, saveEntry } from "./db";
import { EntryList } from "./EntryList";
import { BeerCounter } from "./BeerCounter";
import { downloadCsv } from "./csvExport";

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

  return (
    <div className="app">
      <header>
        <h1>Bev Log</h1>
        <button
          type="button"
          className="export-btn"
          onClick={handleExport}
          aria-label="Export entries as CSV"
        >
          Export CSV
        </button>
      </header>

      <BeerCounter refreshKey={refreshCount} />

      <section className="card">
        <DrinkForm
          submitLabel="Save"
          savedLabel="Saved ✓"
          onSubmit={handleCreate}
          resetOnSubmit
          multiSelectPeople
        />
      </section>

      <EntryList
        refreshKey={refreshCount}
        onChange={() => setRefreshCount((c) => c + 1)}
      />
    </div>
  );
}
