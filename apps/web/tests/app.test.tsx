import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/App";

const future = "2030-06-15T18:30:00.000Z";
const concert = {
  id: 1,
  name: "Concert de printemps",
  description: "Orchestre symphonique",
  venue: "Grande salle",
  startsAt: future,
  capacity: 200,
  remaining: 150,
};
const complet = { ...concert, id: 2, name: "Festival complet", remaining: 0 };

type Handler = (
  url: string,
  init?: RequestInit,
) => { status: number; body: unknown };

/** Simule l'API : un gestionnaire par test décrit les réponses selon l'URL appelée. */
function mockApi(handler: Handler) {
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    const { status, body } = handler(url, init);
    return { ok: status < 400, status, json: async () => body };
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

const reservationResponse = {
  id: 42,
  eventId: 1,
  customerName: "Ada",
  customerEmail: "ada@example.com",
  seats: 2,
  status: "confirmed",
  createdAt: future,
};

// Une fois le formulaire ouvert, deux boutons « Réserver » coexistent (carte et formulaire) :
// on cible celui du formulaire, comme le ferait un utilisateur.
const submitButton = () =>
  within(screen.getByRole("form")).getByRole("button", { name: "Réserver" });

async function openFormAndFill(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: "Réserver" }));
  await user.type(screen.getByLabelText("Nom"), "Ada");
  await user.type(screen.getByLabelText("E-mail"), "ada@example.com");
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("liste des événements", () => {
  it("affiche les événements avec leurs places restantes", async () => {
    mockApi(() => ({ status: 200, body: { events: [concert] } }));
    render(<App />);

    expect(await screen.findByText("Concert de printemps")).toBeInTheDocument();
    expect(screen.getByText("150 places restantes")).toBeInTheDocument();
  });

  it("désactive la réservation d'un événement complet", async () => {
    mockApi(() => ({ status: 200, body: { events: [complet] } }));
    render(<App />);

    const button = await screen.findByRole("button", { name: "Complet" });
    expect(button).toBeDisabled();
  });

  it("affiche un message quand il n'y a aucun événement", async () => {
    mockApi(() => ({ status: 200, body: { events: [] } }));
    render(<App />);
    expect(
      await screen.findByText(/Aucun événement à venir/),
    ).toBeInTheDocument();
  });

  it("affiche une erreur avec un bouton Réessayer quand l'API échoue, puis se rétablit", async () => {
    let fail = true;
    mockApi(() =>
      fail
        ? {
            status: 500,
            body: { code: "INTERNAL_ERROR", message: "Erreur interne" },
          }
        : { status: 200, body: { events: [concert] } },
    );
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Erreur interne",
    );

    fail = false;
    await user.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(await screen.findByText("Concert de printemps")).toBeInTheDocument();
  });
});

describe("réservation", () => {
  it("confirme la réservation et recharge les places restantes", async () => {
    let reserved = false;
    mockApi((url, init) => {
      if (init?.method === "POST") {
        reserved = true;
        return { status: 201, body: reservationResponse };
      }
      return {
        status: 200,
        body: { events: [{ ...concert, remaining: reserved ? 148 : 150 }] },
      };
    });
    const user = userEvent.setup();
    render(<App />);

    await openFormAndFill(user);
    await user.clear(screen.getByLabelText("Nombre de places"));
    await user.type(screen.getByLabelText("Nombre de places"), "2");
    await user.click(submitButton());

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Réservation n°42 confirmée",
    );
    expect(screen.getByRole("status")).toHaveTextContent("ada@example.com");
    expect(await screen.findByText("148 places restantes")).toBeInTheDocument();
  });

  it("affiche un message clair quand l'événement est devenu complet", async () => {
    mockApi((_url, init) =>
      init?.method === "POST"
        ? { status: 409, body: { code: "INSUFFICIENT_SEATS", message: "x" } }
        : { status: 200, body: { events: [concert] } },
    );
    const user = userEvent.setup();
    render(<App />);

    await openFormAndFill(user);
    await user.click(submitButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Il ne reste plus assez de places",
    );
  });

  it("réutilise la même clé d'idempotence pour une nouvelle tentative, et la renouvelle si la saisie change", async () => {
    const keys: string[] = [];
    mockApi((_url, init) => {
      if (init?.method === "POST") {
        keys.push((init.headers as Record<string, string>)["Idempotency-Key"]!);
        return {
          status: 409,
          body: { code: "INSUFFICIENT_SEATS", message: "x" },
        };
      }
      return { status: 200, body: { events: [concert] } };
    });
    const user = userEvent.setup();
    render(<App />);

    await openFormAndFill(user);
    await user.click(submitButton());
    await screen.findByRole("alert");
    await user.click(submitButton());
    await waitFor(() => expect(keys).toHaveLength(2));
    expect(keys[1]).toBe(keys[0]);

    await user.type(screen.getByLabelText("Nom"), " Lovelace");
    await user.click(submitButton());
    await waitFor(() => expect(keys).toHaveLength(3));
    expect(keys[2]).not.toBe(keys[0]);
  });

  it("empêche un second envoi pendant qu'une réservation est en cours", async () => {
    let posts = 0;
    let release: (() => void) | undefined;
    const fn = vi.fn((_url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        posts++;
        return new Promise((resolve) => {
          release = () =>
            resolve({
              ok: true,
              status: 201,
              json: async () => reservationResponse,
            });
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ events: [concert] }),
      });
    });
    vi.stubGlobal("fetch", fn);
    const user = userEvent.setup();
    render(<App />);

    await openFormAndFill(user);
    await user.click(submitButton());

    expect(
      await screen.findByRole("button", { name: /en cours/ }),
    ).toBeDisabled();
    expect(posts).toBe(1);
    release?.();
    await screen.findByRole("status");
  });

  it("permet d'annuler et ferme le formulaire", async () => {
    mockApi(() => ({ status: 200, body: { events: [concert] } }));
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Réserver" }));
    await user.click(screen.getByRole("button", { name: "Annuler" }));

    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });
});
