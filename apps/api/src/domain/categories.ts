/** Catégories possibles d'un événement : la liste fait autorité (base + API + web). */
export const CATEGORIES = [
  "musique",
  "humour",
  "sport",
  "exposition",
  "theatre",
] as const;

export type Category = (typeof CATEGORIES)[number];

export function isCategory(value: unknown): value is Category {
  return (
    typeof value === "string" &&
    (CATEGORIES as readonly string[]).includes(value)
  );
}
