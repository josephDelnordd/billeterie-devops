import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, createReservation, fetchEvents } from "../src/api";

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
