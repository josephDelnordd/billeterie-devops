/**
 * Délai avant la prochaine tentative après `attempts` échecs : base, 2×base, 4×base... plafonné.
 * Fonction pure : testable sans horloge.
 */
export function computeBackoffMs(
  attempts: number,
  baseMs: number,
  maxMs: number,
): number {
  if (attempts < 1) return 0;
  // Math.min sur l'exposant : évite un dépassement vers Infinity pour un grand nombre d'essais.
  const delay = baseMs * 2 ** Math.min(attempts - 1, 30);
  return Math.min(delay, maxMs);
}
