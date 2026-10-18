/** Erreur métier avec son code HTTP : le gestionnaire d'erreurs la convertit en réponse JSON. */
export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(details: { path: string; message: string }[]) {
    super(400, "VALIDATION_ERROR", "Requête invalide", details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Ressource introuvable") {
    super(404, "NOT_FOUND", message);
  }
}

/** Plus assez de places pour satisfaire la demande. */
export class InsufficientSeatsError extends AppError {
  constructor() {
    super(
      409,
      "INSUFFICIENT_SEATS",
      "Pas assez de places disponibles pour cet événement",
    );
  }
}

/** Même clé d'idempotence réutilisée avec une demande différente : probablement un bug client. */
export class IdempotencyKeyReuseError extends AppError {
  constructor() {
    super(
      422,
      "IDEMPOTENCY_KEY_REUSED",
      "Cette clé d'idempotence a déjà servi pour une demande différente",
    );
  }
}
