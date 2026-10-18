export interface EventItem {
  id: number;
  name: string;
  description: string;
  venue: string;
  startsAt: string;
  capacity: number;
  remaining: number;
}

export interface Reservation {
  id: number;
  eventId: number;
  customerName: string;
  customerEmail: string;
  seats: number;
  status: "confirmed" | "cancelled";
  createdAt: string;
}

export interface ReservationRequest {
  customerName: string;
  customerEmail: string;
  seats: number;
}

/** Erreur renvoyée par l'API (ou réseau injoignable : status 0). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Chemin relatif : le proxy Vite (dev) ou nginx (production) relaie /api vers l'API.
const BASE_URL = "/api";

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<{ data: T; status: number }> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, init);
  } catch {
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "Serveur injoignable. Vérifiez votre connexion et réessayez.",
    );
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      typeof body?.code === "string" ? body.code : "UNKNOWN_ERROR",
      typeof body?.message === "string"
        ? body.message
        : `Erreur ${response.status}`,
    );
  }
  return { data: body as T, status: response.status };
}

export async function fetchEvents(): Promise<EventItem[]> {
  const { data } = await request<{ events: EventItem[] }>("/events");
  return data.events;
}

export interface ReservationOutcome {
  reservation: Reservation;
  /** true si l'API a reconnu une demande déjà traitée (aucune place supplémentaire consommée). */
  replayed: boolean;
}

export async function createReservation(
  eventId: number,
  payload: ReservationRequest,
  idempotencyKey: string,
): Promise<ReservationOutcome> {
  const { data, status } = await request<Reservation>(
    `/events/${eventId}/reservations`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    },
  );
  // 201 = créée ; 200 = rejeu d'une demande déjà traitée.
  return { reservation: data, replayed: status === 200 };
}
