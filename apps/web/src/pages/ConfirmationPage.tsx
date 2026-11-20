import { Link, useLocation } from "react-router-dom";
import type { EventItem, Reservation } from "../api";
import { formatDate, formatPrice } from "../format";

interface ConfirmationState {
  reservation: Reservation;
  replayed: boolean;
  event: EventItem;
}

function isConfirmationState(value: unknown): value is ConfirmationState {
  if (typeof value !== "object" || value === null) return false;
  const state = value as Record<string, unknown>;
  return (
    typeof state.reservation === "object" &&
    typeof state.event === "object" &&
    typeof state.replayed === "boolean"
  );
}

/** Grande coche blanche dans un cercle dégradé (SVG inline, autorisé par la CSP). */
function CheckMark() {
  return (
    <div className="check-circle" aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        focusable="false"
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </div>
  );
}

export function ConfirmationPage() {
  const location = useLocation();
  const state = isConfirmationState(location.state) ? location.state : null;

  if (!state) {
    // Arrivée directe sur /confirmation (rafraîchissement, lien partagé) :
    // l'état de navigation n'existe plus, on propose de repartir du catalogue.
    return (
      <div className="card confirmation">
        <h1>Confirmation de réservation</h1>
        <p>
          Aucune réservation n'est en cours de consultation. Retrouvez les
          événements à venir depuis le catalogue.
        </p>
        <Link className="btn" to="/evenements">
          Voir les événements
        </Link>
      </div>
    );
  }

  const { reservation, replayed, event } = state;

  return (
    <div className="card confirmation" role="status">
      <CheckMark />
      <h1>Réservation confirmée</h1>
      <p className="success">
        <strong>Réservation n°{reservation.id}</strong> — {event.name}
        {replayed && (
          <>
            <br />
            <small>Cette demande avait déjà été enregistrée.</small>
          </>
        )}
      </p>
      <dl className="summary">
        <dt>Événement</dt>
        <dd>
          {event.name} — {formatDate(event.startsAt)}
          {event.venue ? ` · ${event.venue}` : ""}
        </dd>
        <dt>Places réservées</dt>
        <dd>
          {reservation.seats > 1
            ? `${reservation.seats} places`
            : "1 place"}
        </dd>
        {reservation.price && (
          <>
            <dt>Tarif</dt>
            <dd>
              {reservation.price.label} —{" "}
              {formatPrice(reservation.price.amountCents)} / place
            </dd>
            <dt>Total</dt>
            <dd className="total">
              {formatPrice(reservation.price.amountCents * reservation.seats)}
            </dd>
          </>
        )}
        <dt>Nom</dt>
        <dd>{reservation.customerName}</dd>
        <dt>E-mail</dt>
        <dd>{reservation.customerEmail}</dd>
      </dl>
      <p>
        Un e-mail de confirmation a été envoyé à{" "}
        <strong>{reservation.customerEmail}</strong> (visible dans Mailpit,
        port 8025).
      </p>
      <div className="actions">
        <Link className="btn" to="/evenements">
          Retour aux événements
        </Link>
        <Link className="btn secondary" to={`/evenements/${event.id}`}>
          Voir l'événement
        </Link>
      </div>
    </div>
  );
}
