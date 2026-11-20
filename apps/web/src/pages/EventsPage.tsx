import { useCallback, useEffect, useState } from "react";
import { ApiError, fetchEvents, type EventItem } from "../api";
import { CATEGORIES, type Category } from "../categories";
import { EventCard } from "../components/EventCard";
import { availabilityOf } from "../format";

type Status = "loading" | "ready" | "error";
type CategoryFilter = "all" | Category;
type AvailabilityFilter = "all" | "available" | "low";

const AVAILABILITY_FILTERS: { id: AvailabilityFilter; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "available", label: "Disponibles" },
  { id: "low", label: "Dernières places" },
];

function matchesCategory(event: EventItem, filter: CategoryFilter): boolean {
  return filter === "all" || event.category === filter;
}

function matchesAvailability(
  event: EventItem,
  filter: AvailabilityFilter,
): boolean {
  const state = availabilityOf(event.remaining, event.capacity);
  if (filter === "available") return state === "available";
  if (filter === "low") return state === "low";
  return true;
}

export function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [availability, setAvailability] = useState<AvailabilityFilter>("all");

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

  const visible = events.filter(
    (event) =>
      matchesCategory(event, category) && matchesAvailability(event, availability),
  );

  return (
    <>
      <section className="page-head">
        <p className="kicker">Catalogue</p>
        <h1>Événements</h1>
        {status === "ready" && events.length > 0 && (
          <p className="count">
            {events.length > 1
              ? `${events.length} événements à venir`
              : "1 événement à venir"}
          </p>
        )}
      </section>

      {status === "ready" && events.length > 0 && (
        <>
          <div className="filters" role="group" aria-label="Filtrer par catégorie">
            <span className="filters-label">Catégorie :</span>
            <button
              type="button"
              className={category === "all" ? "chip active" : "chip"}
              aria-pressed={category === "all"}
              onClick={() => setCategory("all")}
            >
              Tous
            </button>
            {CATEGORIES.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={
                  category === id ? `chip chip-cat-${id} active` : `chip chip-cat-${id}`
                }
                aria-pressed={category === id}
                onClick={() => setCategory(id)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="filters" role="group" aria-label="Filtrer par disponibilité">
            <span className="filters-label">Disponibilité :</span>
            {AVAILABILITY_FILTERS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={
                  availability === id
                    ? `chip chip-avail-${id} active`
                    : `chip chip-avail-${id}`
                }
                aria-pressed={availability === id}
                onClick={() => setAvailability(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      {status === "loading" && <p className="loading">Chargement des événements…</p>}

      {status === "error" && (
        <div role="alert" className="error">
          <p>{errorMessage}</p>
          <button type="button" onClick={() => void load()}>
            Réessayer
          </button>
        </div>
      )}

      {status === "ready" && events.length === 0 && (
        <p className="empty">Aucun événement à venir pour le moment.</p>
      )}

      {status === "ready" && events.length > 0 && visible.length === 0 && (
        <p className="empty">Aucun événement ne correspond à ces filtres.</p>
      )}

      {status === "ready" && visible.length > 0 && (
        <section className="grid" aria-label="Événements">
          {visible.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </section>
      )}
    </>
  );
}
