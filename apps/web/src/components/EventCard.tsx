import { Link } from "react-router-dom";
import type { EventItem } from "../api";
import { categoryLabel } from "../categories";
import {
  availabilityLabel,
  availabilityOf,
  formatDate,
  formatPrice,
  lowestPriceCents,
} from "../format";
import { AvailabilityMeter } from "./AvailabilityMeter";
import { CategoryIcon } from "./CategoryIcon";

interface Props {
  event: EventItem;
}

export function EventCard({ event }: Props) {
  const state = availabilityOf(event.remaining, event.capacity);
  const lowest = lowestPriceCents(event.prices);

  return (
    <article className={`card event-card cat-${event.category}`} aria-label={event.name}>
      <div className="card-media">
        <CategoryIcon category={event.category} className="card-media-icon" />
        <p className="badge">{categoryLabel(event.category)}</p>
      </div>
      <div className="card-body">
        <h2>
          <Link to={`/evenements/${event.id}`}>{event.name}</Link>
        </h2>
        <p className="meta">
          {formatDate(event.startsAt)}
          {event.venue ? ` · ${event.venue}` : ""}
        </p>
        {event.description && <p className="card-desc">{event.description}</p>}
        <div className="card-foot">
          {lowest !== null && (
            <p className="card-price">dès {formatPrice(lowest)}</p>
          )}
          <p className={`availability ${state}`}>
            {availabilityLabel(event.remaining, event.capacity)}
          </p>
          <AvailabilityMeter
            remaining={event.remaining}
            capacity={event.capacity}
          />
          <Link className="btn btn-card" to={`/evenements/${event.id}`}>
            Voir l'événement
          </Link>
        </div>
      </div>
    </article>
  );
}
