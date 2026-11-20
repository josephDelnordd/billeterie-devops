import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  createReservation,
  fetchEvent,
  fetchEvents,
  sendContactMessage,
} from "../src/api";

function mockFetch(status: number, body: unknown) {
  const fn = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchEvents", () => {
  it("retourne la liste des événements", async () => {
    mockFetch(200, { events: [{ id: 1, name: "Concert" }] });
    expect(await fetchEvents()).toEqual([{ id: 1, name: "Concert" }]);
  });

  it("appelle l'API via le chemin relatif /api", async () => {
    const fetchMock = mockFetch(200, { events: [] });
    await fetchEvents();
    expect(fetchMock).toHaveBeenCalledWith("/api/events", undefined);
  });

  it("transforme une réponse d'erreur en ApiError avec son code", async () => {
    mockFetch(500, { code: "INTERNAL_ERROR", message: "Erreur interne" });
    await expect(fetchEvents()).rejects.toMatchObject({
      name: "ApiError",
      status: 500,
      code: "INTERNAL_ERROR",
    });
  });

  it("signale un serveur injoignable avec un message lisible", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fail")));
    const error = await fetchEvents().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 0, code: "NETWORK_ERROR" });
  });

  it("gère une réponse non JSON sans planter", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => {
          throw new Error("pas du json");
        },
      }),
    );
    await expect(fetchEvents()).rejects.toMatchObject({
      status: 502,
      code: "UNKNOWN_ERROR",
    });
  });
});

describe("fetchEvent", () => {
  const event = { id: 7, name: "Opéra", description: "", venue: "Paris", category: "musique", startsAt: "2030-01-01T00:00:00.000Z", capacity: 300, remaining: 300 };

  it("retourne l'événement demandé via /api/events/:id", async () => {
    const fetchMock = mockFetch(200, event);
    expect(await fetchEvent(7)).toEqual(event);
    expect(fetchMock).toHaveBeenCalledWith("/api/events/7", undefined);
  });

  it("propage le 404 de l'API (événement introuvable)", async () => {
    mockFetch(404, { code: "NOT_FOUND", message: "Événement introuvable" });
    await expect(fetchEvent(99)).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
    });
  });
});

describe("createReservation", () => {
  const payload = {
    customerName: "Ada",
    customerEmail: "ada@example.com",
    seats: 2,
  };
  const reservation = { id: 7, eventId: 1, ...payload, status: "confirmed" };

  it("envoie la clé d'idempotence en en-tête et le corps en JSON", async () => {
    const fetchMock = mockFetch(201, reservation);
    await createReservation(1, payload, "cle-test-0001");

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/events/1/reservations");
    expect(init.method).toBe("POST");
    expect(init.headers["Idempotency-Key"]).toBe("cle-test-0001");
    expect(JSON.parse(init.body)).toEqual(payload);
  });

  it("indique replayed=false pour une création (201)", async () => {
    mockFetch(201, reservation);
    expect(
      (await createReservation(1, payload, "cle-test-0001")).replayed,
    ).toBe(false);
  });

  it("indique replayed=true pour un rejeu (200)", async () => {
    mockFetch(200, reservation);
    expect(
      (await createReservation(1, payload, "cle-test-0001")).replayed,
    ).toBe(true);
  });

  it("propage le code d'erreur de l'API (complet)", async () => {
    mockFetch(409, { code: "INSUFFICIENT_SEATS", message: "complet" });
    await expect(
      createReservation(1, payload, "cle-test-0001"),
    ).rejects.toMatchObject({ status: 409, code: "INSUFFICIENT_SEATS" });
  });
});

describe("sendContactMessage", () => {
  const payload = {
    name: "Ada",
    email: "ada@example.com",
    subject: "Question",
    message: "Bonjour, une question de test.",
  };

  it("poste le message en JSON sur /api/contact", async () => {
    const fetchMock = mockFetch(201, { id: 7, status: "queued" });
    const result = await sendContactMessage(payload);
    expect(result).toEqual({ id: 7, status: "queued" });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/contact");
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual(payload);
  });

  it("propage le code d'erreur de l'API (validation)", async () => {
    mockFetch(400, { code: "VALIDATION_ERROR", message: "Requête invalide" });
    await expect(sendContactMessage(payload)).rejects.toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR",
    });
  });
});
