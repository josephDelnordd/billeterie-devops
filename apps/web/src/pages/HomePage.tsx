import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, fetchEvents, type EventItem } from "../api";
import { EventCard } from "../components/EventCard";

type Status = "loading" | "ready" | "error";

/** Nombre d'événements mis en avant sur la page d'accueil (les plus proches, la liste étant triée). */
const FEATURED_COUNT = 4;

export function HomePage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState("");

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

  const featured = events.slice(0, FEATURED_COUNT);

  return (
    <>
      <section className="hero">
        <div className="hero-blob hero-blob-1" aria-hidden="true" />
        <div className="hero-blob hero-blob-2" aria-hidden="true" />
        <div className="hero-blob hero-blob-3" aria-hidden="true" />
        <div className="hero-content">
          <p className="hero-kicker">Billetterie en ligne</p>
          <h1>PlaceLibre</h1>
          <p className="subtitle">
            Réservez vos places en quelques clics : concerts, théâtre, sport,
            expositions…
          </p>
          <div className="hero-actions">
            <Link className="btn btn-lg" to="/evenements">
              Voir tous les événements
            </Link>
            <Link className="btn btn-ghost" to="/a-propos">
              À propos du projet
            </Link>
          </div>
        </div>
      </section>

      {status === "ready" && events.length > 0 && (
        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">
            {[0, 1].map((copy) => (
              <span className="marquee-seq" key={copy}>
                {events.map((event) => (
                  <span className="marquee-item" key={event.id}>
                    {event.name}
                    <span className="marquee-star">✦</span>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
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

      {status === "ready" && featured.length > 0 && (
        <section className="featured" aria-label="Événements à la une">
          <div className="section-head">
            <h2>À la une</h2>
            <Link className="link-more" to="/evenements">
              Tout le catalogue →
            </Link>
          </div>
          <div className="grid grid-featured">
            {featured.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}

      <section className="card teaser" aria-label="Présentation">
        <div className="teaser-text">
          <h2>Pourquoi PlaceLibre ?</h2>
          <p>
            Un catalogue simple, des places en temps réel et une confirmation
            par e-mail immédiate. Projet de démonstration : le paiement n'est
            pas réel.
          </p>
        </div>
        <div className="actions">
          <Link className="btn" to="/evenements">
            Parcourir le catalogue
          </Link>
          <Link className="btn secondary" to="/a-propos">
            En savoir plus
          </Link>
        </div>
      </section>
    </>
  );
}
