/** Catégories des événements : même liste que l'API (src/domain/categories.ts côté API). */
export const CATEGORIES = [
  { id: "musique", label: "Musique" },
  { id: "humour", label: "Humour" },
  { id: "sport", label: "Sport" },
  { id: "exposition", label: "Exposition" },
  { id: "theatre", label: "Théâtre" },
] as const;

export type Category = (typeof CATEGORIES)[number]["id"];

/** Libellé affiché pour une catégorie (repli sur la valeur brute si inconnue). */
export function categoryLabel(category: string): string {
  return CATEGORIES.find((c) => c.id === category)?.label ?? category;
}
