export const PEOPLE = ["Addi", "Jess", "Jonny", "Josh", "Matt"] as const;
export type Person = (typeof PEOPLE)[number];

export const DRINK_KINDS = ["beer", "wine", "spirit", "other"] as const;
export type DrinkKind = (typeof DRINK_KINDS)[number];

export const QUANTITY_UNITS = ["pint", "ml"] as const;
export type QuantityUnit = (typeof QUANTITY_UNITS)[number];

export interface Entry {
  id: string;
  person: Person;
  timestamp: number;
  photo?: Blob;
  kind?: DrinkKind;
  name?: string;
  quantityValue?: number;
  quantityUnit?: QuantityUnit;
  abv?: number;
}
