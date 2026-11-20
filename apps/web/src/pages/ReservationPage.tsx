import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ApiError,
  fetchEvent,
  type EventItem,
  type ReservationOutcome,
} from "../api";
import { ReservationForm } from "../components/ReservationForm";
import { availabilityLabel, availabilityOf, formatDate } from "../format";

type Status = "loading" | "ready" | "notfound" | "soldout" | "error";

export function ReservationPage() {
  const { id } = useParams<{ id: string }>();
  const eventId = Number(id);
  const navigate = useNavigate();
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
      const loaded = await fetchEvent(eventId);
      setEvent(loaded);
      setStatus(
        availabilityOf(loaded.remaining, loaded.capacity) === "soldout"
          ? "soldout"
          : "ready",
      );
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

  function handleReserved(outcome: ReservationOutcome) {
    if (event) {
      navigate("/confirmation", { state: { ...outcome, event } });
    }
  }

  if (status === "loading")
    return <p className="loading">Chargement de l'événement…</p>;

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

  return (
    <>
      <nav className="breadcrumb" aria-label="Fil d'Ariane">
        <Link to="/evenements">Événements</Link>
        <span aria-hidden="true">›</span>
        <Link to={`/evenements/${event.id}`}>{event.name}</Link>
        <span aria-hidden="true">›</span>
        <span>Réservation</span>
      </nav>

      <section className="page-head">
        <p className="kicker">Réservation</p>
        <h1>Réserver</h1>
        <p className="meta">
          {formatDate(event.startsAt)}
          {event.venue ? ` · ${event.venue}` : ""} ·{" "}
          {availabilityLabel(event.remaining, event.capacity)}
        </p>
      </section>

      {status === "soldout" ? (
        <div role="alert" className="error">
          <p>Cet événement est complet : il ne reste plus de place.</p>
          <Link className="btn" to={`/evenements/${event.id}`}>
            Retour à l'événement
          </Link>
        </div>
      ) : (
        <ReservationForm
          event={event}
          onReserved={handleReserved}
          onCancel={() => navigate(`/evenements/${event.id}`)}
        />
      )}
    </>
  );
}
