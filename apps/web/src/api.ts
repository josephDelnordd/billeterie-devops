import type { Category } from "./categories";

/** Un tarif d'événement (catégorie de billet), montant en centimes. */
export interface EventPrice {
  label: string;
  amountCents: number;
}

export interface EventItem {
  id: number;
  name: string;
  description: string;
  /** Texte détaillé de la page événement (paragraphes séparés par une ligne vide). */
  longDescription: string;
  /** Tarifs de l'événement (plein tarif, réduit…), triés par position. */
  prices: EventPrice[];
  venue: string;
  category: Category;
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

export async function fetchEvent(id: number): Promise<EventItem> {
  const { data } = await request<EventItem>(`/events/${id}`);
  return data;
}

export interface ContactMessage {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

export interface ContactMessageResult {
  id: number;
  status: "queued";
}

/** Envoie un message du formulaire de contact (reçu par la boîte de support, visible dans Mailpit). */
export async function sendContactMessage(
  payload: ContactMessage,
): Promise<ContactMessageResult> {
  const { data } = await request<ContactMessageResult>("/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return data;
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
