/** Formate une date ISO à l'heure de Paris, quel que soit le fuseau du navigateur. */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
}

export type Availability = "available" | "low" | "soldout";

/** Dernières places : sous 10 % de la capacité (au moins 1 place restante). */
export function availabilityOf(
  remaining: number,
  capacity: number,
): Availability {
  if (remaining <= 0) return "soldout";
  return remaining <= Math.max(1, Math.ceil(capacity * 0.1))
    ? "low"
    : "available";
}

export function availabilityLabel(remaining: number, capacity: number): string {
  const state = availabilityOf(remaining, capacity);
  if (state === "soldout") return "Complet";
  const places =
    remaining > 1 ? `${remaining} places restantes` : "1 place restante";
  return state === "low" ? `Dernières places : ${places}` : places;
}

/** Clé d'idempotence : UUID aléatoire, valide pour le format exigé par l'API (8 à 128 caractères). */
export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}
