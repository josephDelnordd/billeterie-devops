import { useCallback, useEffect, useState } from "react";
import { ApiError, fetchEvents, type EventItem, type Reservation } from "./api";
import { EventCard } from "./components/EventCard";
import { ReservationForm } from "./components/ReservationForm";

type Status = "loading" | "ready" | "error";

export function App() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [selected, setSelected] = useState<EventItem | null>(null);
  const [confirmation, setConfirmation] = useState<Reservation | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      setEvents(await fetchEvents());
      setStatus("ready");
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "Impossible de charger les événements.",
      );
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function handleReserved(reservation: Reservation) {
    setConfirmation(reservation);
    setSelected(null);
    // Rechargement : le stock affiché doit refléter la réservation qui vient d'être faite.
    void load();
  }

  return (
    <main className="container">
      <header>
        <h1>PlaceLibre</h1>
        <p className="subtitle">Réservez vos places en quelques clics.</p>
      </header>

      {confirmation && (
        <div role="status" className="success">
          <strong>Réservation n°{confirmation.id} confirmée.</strong> Un e-mail
          de confirmation a été envoyé à {confirmation.customerEmail}.
          <button
            type="button"
            className="link"
            onClick={() => setConfirmation(null)}
          >
            Fermer
          </button>
        </div>
      )}

      {selected && (
        <ReservationForm
          event={selected}
          onReserved={handleReserved}
          onCancel={() => setSelected(null)}
        />
      )}

      {status === "loading" && <p>Chargement des événements…</p>}

      {status === "error" && (
        <div role="alert" className="error">
          <p>{errorMessage}</p>
          <button type="button" onClick={() => void load()}>
            Réessayer
          </button>
        </div>
      )}

      {status === "ready" && events.length === 0 && (
        <p>Aucun événement à venir pour le moment.</p>
      )}

      {status === "ready" && events.length > 0 && (
        <section className="grid" aria-label="Événements">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onSelect={(chosen) => {
                setConfirmation(null);
                setSelected(chosen);
              }}
            />
          ))}
        </section>
      )}
    </main>
  );
}
