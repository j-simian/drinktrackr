import { useState } from "react";
import {
  DrinkForm,
  entryFieldsFromValues,
  type DrinkFormValues,
} from "./DrinkForm";
import { randomId, saveEntry } from "./db";
import { EntryList } from "./EntryList";

export function App() {
  const [refreshCount, setRefreshCount] = useState(0);

  async function handleCreate(values: DrinkFormValues) {
    if (!values.person) return;
    await saveEntry({
      id: randomId(),
      person: values.person,
      timestamp: Date.now(),
      ...entryFieldsFromValues(values),
    });
    setRefreshCount((c) => c + 1);
  }

  return (
    <div className="app">
      <header>
        <h1>Bev Log</h1>
      </header>

      <section className="card">
        <DrinkForm
          submitLabel="Save"
          savedLabel="Saved ✓"
          onSubmit={handleCreate}
          resetOnSubmit
        />
      </section>

      <EntryList
        refreshKey={refreshCount}
        onChange={() => setRefreshCount((c) => c + 1)}
      />
    </div>
  );
}
