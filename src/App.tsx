import { useRef, useState } from "react";
import {
  PEOPLE,
  DRINK_KINDS,
  type DrinkKind,
  type Person,
  type QuantityUnit,
} from "./types";
import { randomId, saveEntry } from "./db";
import { EntryList } from "./EntryList";

export function App() {
  const [person, setPerson] = useState<Person | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [kind, setKind] = useState<DrinkKind | "">("");
  const [name, setName] = useState("");
  const [quantityValue, setQuantityValue] = useState("");
  const [quantityUnit, setQuantityUnit] = useState<QuantityUnit>("pint");
  const [abv, setAbv] = useState("");
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoUrl = photo ? URL.createObjectURL(photo) : null;

  function resetForm() {
    setPerson(null);
    setPhoto(null);
    setKind("");
    setName("");
    setQuantityValue("");
    setQuantityUnit("pint");
    setAbv("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSave() {
    if (!person || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const quantityNum = quantityValue ? parseFloat(quantityValue) : undefined;
      const abvNum = abv ? parseFloat(abv) : undefined;
      await saveEntry({
        id: randomId(),
        person,
        timestamp: Date.now(),
        photo: photo ?? undefined,
        kind: kind || undefined,
        name: name.trim() || undefined,
        quantityValue: Number.isFinite(quantityNum) ? quantityNum : undefined,
        quantityUnit: quantityNum ? quantityUnit : undefined,
        abv: Number.isFinite(abvNum) ? abvNum : undefined,
      });
      resetForm();
      setJustSaved(true);
      setRefreshCount((c) => c + 1);
      setTimeout(() => setJustSaved(false), 1500);
    } catch (err) {
      console.error("Save failed", err);
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app">
      <header>
        <h1>Bev Log</h1>
      </header>

      <section className="card">
        <label className="field-label">Who</label>
        <div className="people">
          {PEOPLE.map((p) => (
            <button
              key={p}
              type="button"
              className={`person-btn ${person === p ? "selected" : ""}`}
              aria-pressed={person === p}
              onClick={() => setPerson(p)}
            >
              {p}
            </button>
          ))}
        </div>

        <label className="field-label">Photo</label>
        <div className="photo-row">
          <button
            type="button"
            className="photo-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            {photo ? "Retake photo" : "Take photo"}
          </button>
          {photoUrl && (
            <img src={photoUrl} alt="preview" className="photo-preview" />
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          />
        </div>

        <label className="field-label" htmlFor="kind">
          Kind
        </label>
        <select
          id="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as DrinkKind | "")}
        >
          <option value="">—</option>
          {DRINK_KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>

        <label className="field-label" htmlFor="name">
          Drink name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Guinness"
        />

        <label className="field-label">Quantity</label>
        <div className="quantity-row">
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={quantityValue}
            onChange={(e) => setQuantityValue(e.target.value)}
            placeholder="0"
          />
          <div className="unit-toggle">
            <button
              type="button"
              className={quantityUnit === "pint" ? "selected" : ""}
              aria-pressed={quantityUnit === "pint"}
              onClick={() => setQuantityUnit("pint")}
            >
              pint
            </button>
            <button
              type="button"
              className={quantityUnit === "ml" ? "selected" : ""}
              aria-pressed={quantityUnit === "ml"}
              onClick={() => setQuantityUnit("ml")}
            >
              ml
            </button>
          </div>
        </div>

        <label className="field-label" htmlFor="abv">
          ABV %
        </label>
        <input
          id="abv"
          type="number"
          inputMode="decimal"
          step="0.1"
          value={abv}
          onChange={(e) => setAbv(e.target.value)}
          placeholder="e.g. 4.2"
        />

        <button
          type="button"
          className="save-btn"
          disabled={!person || saving}
          onClick={handleSave}
        >
          {justSaved ? "Saved ✓" : saving ? "Saving…" : "Save"}
        </button>
        {saveError && <p className="save-error">Save failed: {saveError}</p>}
      </section>

      <EntryList
        refreshKey={refreshCount}
        onChange={() => setRefreshCount((c) => c + 1)}
      />
    </div>
  );
}
