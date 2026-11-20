import { availabilityOf } from "../format";

interface Props {
  remaining: number;
  capacity: number;
}

/**
 * Jauge de disponibilité. Élément <meter> stylé uniquement via la feuille de
 * style (pseudo-éléments ::-webkit-meter-* / ::-moz-meter-bar) : aucun attribut
 * style inline, requis par la CSP (style-src 'self').
 */
export function AvailabilityMeter({ remaining, capacity }: Props) {
  const state = availabilityOf(remaining, capacity);
  const max = Math.max(1, capacity);
  return (
    <meter
      className={`meter ${state}`}
      min={0}
      max={max}
      low={Math.max(1, Math.ceil(max * 0.1))}
      high={Math.ceil(max * 0.9)}
      optimum={max}
      value={Math.max(0, Math.min(remaining, max))}
      aria-label="Jauge : places restantes par rapport à la capacité"
    />
  );
}
