import type { EventItem } from "../api";
import { availabilityLabel, availabilityOf, formatDate } from "../format";

interface Props {
  event: EventItem;
  onSelect: (event: EventItem) => void;
}

export function EventCard({ event, onSelect }: Props) {
  const state = availabilityOf(event.remaining, event.capacity);

  return (
    <article className="card" aria-label={event.name}>
      <h2>{event.name}</h2>
      <p className="meta">
        {formatDate(event.startsAt)}
        {event.venue ? ` · ${event.venue}` : ""}
      </p>
      {event.description && <p>{event.description}</p>}
      <p className={`availability ${state}`}>
        {availabilityLabel(event.remaining, event.capacity)}
      </p>
      <button
        type="button"
        onClick={() => onSelect(event)}
        disabled={state === "soldout"}
      >
        {state === "soldout" ? "Complet" : "Réserver"}
      </button>
    </article>
  );
}
