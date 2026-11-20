import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from "prom-client";

export interface Metrics {
  registry: Registry;
  httpDuration: Histogram<"method" | "route" | "status">;
  reservations: Counter<"outcome">;
}

/**
 * Métriques Prometheus. Un registre par application (et non le registre global) :
 * les tests peuvent ainsi créer plusieurs instances sans conflit de noms.
 */
export function createMetrics(): Metrics {
  const registry = new Registry();
  collectDefaultMetrics({ register: registry });

  const httpDuration = new Histogram({
    name: "http_request_duration_seconds",
    help: "Durée des requêtes HTTP",
    labelNames: ["method", "route", "status"] as const,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [registry],
  });

  // Alimente l'alerte métier prévue : taux de « complet » pendant l'ouverture des ventes.
  const reservations = new Counter({
    name: "reservations_total",
    help: "Demandes de réservation par résultat",
    labelNames: ["outcome"] as const,
    registers: [registry],
  });

  return { registry, httpDuration, reservations };
}
