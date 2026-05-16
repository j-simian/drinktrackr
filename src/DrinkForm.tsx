import { useEffect, useRef, useState } from "react";
import {
  DRINK_KINDS,
  PEOPLE,
  type DrinkKind,
  type Entry,
  type Person,
  type QuantityUnit,
} from "./types";

export interface DrinkFormValues {
  person: Person | null;
  photo: File | Blob | null;
  photoTouched: boolean;
  kind: DrinkKind | "";
  name: string;
  quantityValue: string;
  quantityUnit: QuantityUnit;
  abv: string;
}

export function entryFieldsFromValues(
  values: DrinkFormValues,
): Partial<
  Pick<Entry, "photo" | "kind" | "name" | "quantityValue" | "quantityUnit" | "abv">
> {
  const quantityNum = values.quantityValue
    ? parseFloat(values.quantityValue)
    : NaN;
  const abvNum = values.abv ? parseFloat(values.abv) : NaN;
  const hasQuantity = Number.isFinite(quantityNum);
  const fields: Partial<
    Pick<Entry, "photo" | "kind" | "name" | "quantityValue" | "quantityUnit" | "abv">
  > = {
    kind: values.kind || undefined,
    name: values.name.trim() || undefined,
    quantityValue: hasQuantity ? quantityNum : undefined,
    quantityUnit: hasQuantity ? values.quantityUnit : undefined,
    abv: Number.isFinite(abvNum) ? abvNum : undefined,
  };
  if (values.photoTouched) {
    fields.photo = values.photo ?? undefined;
  }
  return fields;
}

interface Props {
  initial?: Entry;
  submitLabel: string;
  savingLabel?: string;
  savedLabel?: string;
  onSubmit: (values: DrinkFormValues) => Promise<void>;
  onCancel?: () => void;
  resetOnSubmit?: boolean;
}

function emptyValues(): DrinkFormValues {
  return {
    person: null,
    photo: null,
    photoTouched: false,
    kind: "",
    name: "",
    quantityValue: "",
    quantityUnit: "pint",
    abv: "",
  };
}

function valuesFromEntry(entry: Entry): DrinkFormValues {
  return {
    person: entry.person,
    photo: entry.photo ?? null,
    photoTouched: false,
    kind: entry.kind ?? "",
    name: entry.name ?? "",
    quantityValue: entry.quantityValue != null ? String(entry.quantityValue) : "",
    quantityUnit: entry.quantityUnit ?? "pint",
    abv: entry.abv != null ? String(entry.abv) : "",
  };
}

export function DrinkForm({
  initial,
  submitLabel,
  savingLabel = "Saving…",
  savedLabel,
  onSubmit,
  onCancel,
  resetOnSubmit = false,
}: Props) {
  const [values, setValues] = useState<DrinkFormValues>(
    initial ? valuesFromEntry(initial) : emptyValues(),
  );
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!values.photo) {
      setPhotoUrl(null);
      return;
    }
    const url = URL.createObjectURL(values.photo);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [values.photo]);

  function patch(partial: Partial<DrinkFormValues>) {
    setValues((v) => ({ ...v, ...partial }));
  }

  async function handleSubmit() {
    if (!values.person || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit(values);
      if (resetOnSubmit) {
        setValues(emptyValues());
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
      if (savedLabel) {
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 1500);
      }
    } catch (err) {
      console.error("Save failed", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <label className="field-label">Who</label>
      <div className="people">
        {PEOPLE.map((p) => (
          <button
            key={p}
            type="button"
            className={`person-btn ${values.person === p ? "selected" : ""}`}
            aria-pressed={values.person === p}
            onClick={() => patch({ person: p })}
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
          {values.photo ? "Retake photo" : "Take photo"}
        </button>
        {photoUrl && (
          <img src={photoUrl} alt="preview" className="photo-preview" />
        )}
        {values.photo && (
          <button
            type="button"
            className="photo-clear"
            aria-label="Remove photo"
            onClick={() => {
              patch({ photo: null, photoTouched: true });
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          >
            ×
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={(e) =>
            patch({ photo: e.target.files?.[0] ?? null, photoTouched: true })
          }
        />
      </div>

      <label className="field-label" htmlFor="kind">
        Kind
      </label>
      <select
        id="kind"
        value={values.kind}
        onChange={(e) => patch({ kind: e.target.value as DrinkKind | "" })}
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
        value={values.name}
        onChange={(e) => patch({ name: e.target.value })}
        placeholder="e.g. Guinness"
      />

      <label className="field-label">Quantity</label>
      <div className="quantity-row">
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          value={values.quantityValue}
          onChange={(e) => patch({ quantityValue: e.target.value })}
          placeholder="0"
        />
        <div className="unit-toggle">
          <button
            type="button"
            className={values.quantityUnit === "pint" ? "selected" : ""}
            aria-pressed={values.quantityUnit === "pint"}
            onClick={() => patch({ quantityUnit: "pint" })}
          >
            pint
          </button>
          <button
            type="button"
            className={values.quantityUnit === "ml" ? "selected" : ""}
            aria-pressed={values.quantityUnit === "ml"}
            onClick={() => patch({ quantityUnit: "ml" })}
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
        value={values.abv}
        onChange={(e) => patch({ abv: e.target.value })}
        placeholder="e.g. 4.2"
      />

      <div className="form-actions">
        {onCancel && (
          <button type="button" className="cancel-btn" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button
          type="button"
          className="save-btn"
          disabled={!values.person || saving}
          onClick={handleSubmit}
        >
          {justSaved && savedLabel
            ? savedLabel
            : saving
              ? savingLabel
              : submitLabel}
        </button>
      </div>
      {error && <p className="save-error">Save failed: {error}</p>}
    </>
  );
}
