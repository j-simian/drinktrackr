import { useState } from "react";
import {
  DrinkForm,
  entryFieldsFromValues,
  type DrinkFormValues,
} from "./DrinkForm";
import { randomId, saveEntry } from "./db";
import { EntryList } from "./EntryList";
import { BeerCounter } from "./BeerCounter";

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

  return (
    <div className="app">
      <header>
        <h1>Bev Log</h1>
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
