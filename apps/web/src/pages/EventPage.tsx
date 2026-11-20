import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError, fetchEvent, type EventItem } from "../api";
import { categoryLabel } from "../categories";
import {
  availabilityLabel,
  availabilityOf,
  formatDate,
  formatPrice,
} from "../format";
import { AvailabilityMeter } from "../components/AvailabilityMeter";
import { CategoryIcon } from "../components/CategoryIcon";

type Status = "loading" | "ready" | "notfound" | "error";

export function EventPage() {
  const { id } = useParams<{ id: string }>();
  const eventId = Number(id);
  const [event, setEvent] = useState<EventItem | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const load = useCallback(async () => {
    if (!Number.isInteger(eventId) || eventId <= 0) {
      setStatus("notfound");
      return;
    }
    setStatus("loading");
    try {
      setEvent(await fetchEvent(eventId));
      setStatus("ready");
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setStatus("notfound");
      } else {
        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : "Impossible de charger cet événement.",
        );
        setStatus("error");
      }
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (status === "loading") return <p className="loading">Chargement de l'événement…</p>;

  if (status === "notfound") {
    return (
      <div role="alert" className="error">
        <p>Événement introuvable.</p>
        <Link className="btn" to="/evenements">
          Retour aux événements
        </Link>
      </div>
    );
  }

  if (status === "error" || !event) {
    return (
      <div role="alert" className="error">
        <p>{errorMessage}</p>
        <button type="button" onClick={() => void load()}>
          Réessayer
        </button>
      </div>
    );
  }

  const state = availabilityOf(event.remaining, event.capacity);
  const longParagraphs = event.longDescription
    .split(/\n\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <>
      <nav className="breadcrumb" aria-label="Fil d'Ariane">
        <Link to="/evenements">Événements</Link>
        <span aria-hidden="true">›</span>
        <span>{event.name}</span>
      </nav>

      <article className={`card detail cat-${event.category}`}>
        <div className="detail-media">
          <CategoryIcon category={event.category} className="detail-media-icon" />
          <p className="badge">{categoryLabel(event.category)}</p>
        </div>
        <div className="detail-body">
          <h1>{event.name}</h1>
          <ul className="meta-chips">
            <li className="meta-chip">{formatDate(event.startsAt)}</li>
            {event.venue && <li className="meta-chip">{event.venue}</li>}
          </ul>
          {event.description && <p className="description">{event.description}</p>}
          {longParagraphs.length > 0 && (
            <>
              <h2 className="detail-section-title">En détail</h2>
              <div className="detail-long">
                {longParagraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </>
          )}
          {event.prices.length > 0 && (
            <>
              <h2 className="detail-section-title">Tarifs</h2>
              <ul className="price-list">
                {event.prices.map((price) => (
                  <li key={price.label}>
                    <span>{price.label}</span>
                    <strong>{formatPrice(price.amountCents)}</strong>
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className="detail-availability">
            <p className={`availability ${state}`}>
              {availabilityLabel(event.remaining, event.capacity)}
              {event.capacity > 0 ? ` sur ${event.capacity}` : ""}
            </p>
            <AvailabilityMeter
              remaining={event.remaining}
              capacity={event.capacity}
            />
          </div>
          <div className="actions">
            {state === "soldout" ? (
              <button type="button" className="btn" disabled>
                Complet
              </button>
            ) : (
              <Link className="btn btn-lg" to={`/evenements/${event.id}/reserver`}>
                Réserver
              </Link>
            )}
          </div>
        </div>
      </article>
    </>
  );
}
