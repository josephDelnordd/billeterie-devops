import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { App } from "../src/App";
import type { EventItem } from "../src/api";

const future = "2030-06-15T18:30:00.000Z";
const concert: EventItem = {
  id: 1,
  name: "Concert de printemps",
  description: "Orchestre symphonique",
  longDescription: "Programme romantique.\n\nPrécédé d'une présentation à 19 h 30.",
  prices: [
    { label: "Plein tarif", amountCents: 3200 },
    { label: "Réduit", amountCents: 2400 },
  ],
  venue: "Grande salle",
  category: "musique",
  startsAt: future,
  capacity: 200,
  remaining: 150,
};
const match: EventItem = {
  ...concert,
  id: 2,
  name: "Match de gala",
  category: "sport",
  capacity: 500,
  remaining: 500,
};
const complet: EventItem = { ...concert, id: 3, name: "Concert électro", remaining: 0 };
const low: EventItem = {
  ...concert,
  id: 4,
  name: "Soirée jazz intimiste",
  capacity: 20,
  remaining: 2,
};

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

/** Monte l'app dans un routeur en mémoire, à l'URL donnée (comme un vrai navigateur). */
function renderApp(initialEntries: string[] = ["/"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <App />
    </MemoryRouter>,
  );
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

/** Réponses par défaut : le catalogue contient `concert`, et /api/events/1 renvoie `concert`. */
function mockCatalogue(events = [concert]) {
  return mockApi((url, init) => {
    if (url === "/api/events/1") return { status: 200, body: concert };
    if (init?.method === "POST") return { status: 201, body: reservationResponse };
    return { status: 200, body: { events } };
  });
}

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  // Attend que la page de réservation ait fini de charger l'événement.
  await user.type(await screen.findByLabelText("Nom"), "Ada");
  await user.type(screen.getByLabelText("E-mail"), "ada@example.com");
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("navigation", () => {
  it("affiche les onglets Accueil, Événements, À propos et Contact", async () => {
    mockCatalogue();
    renderApp();
    const nav = await screen.findByRole("navigation", {
      name: "Navigation principale",
    });
    expect(within(nav).getByRole("link", { name: "Accueil" })).toHaveAttribute("href", "/");
    expect(
      within(nav).getByRole("link", { name: "Événements" }),
    ).toHaveAttribute("href", "/evenements");
    expect(within(nav).getByRole("link", { name: "À propos" })).toHaveAttribute(
      "href",
      "/a-propos",
    );
    expect(within(nav).getByRole("link", { name: "Contact" })).toHaveAttribute(
      "href",
      "/contact",
    );
  });
});

describe("page d'accueil (/)", () => {
  it("met en avant les 4 prochains événements et mène au catalogue", async () => {
    mockCatalogue([concert, match, complet, low]);
    const user = userEvent.setup();
    renderApp();

    expect(
      await screen.findByRole("heading", { level: 1, name: "PlaceLibre" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Voir tous les événements" }),
    ).toHaveAttribute("href", "/evenements");

    // « À la une » : 4 cartes.
    const section = await screen.findByRole("region", { name: "Événements à la une" });
    expect(within(section).getAllByRole("article")).toHaveLength(4);
    expect(within(section).getByText("Concert de printemps")).toBeInTheDocument();
    expect(within(section).getByText("Soirée jazz intimiste")).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Voir tous les événements" }));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Événements" }),
    ).toBeInTheDocument();
    expect(screen.getByText("4 événements à venir")).toBeInTheDocument();
  });
});

describe("page des événements (/evenements)", () => {
  it("affiche toutes les propositions, chacune menant à sa page de détail", async () => {
    mockCatalogue([concert, match]);
    renderApp(["/evenements"]);

    expect(await screen.findByText("Concert de printemps")).toBeInTheDocument();
    expect(screen.getByText("Match de gala")).toBeInTheDocument();
    expect(screen.getByText("150 places restantes")).toBeInTheDocument();

    const card = screen.getByRole("article", { name: "Concert de printemps" });
    // Badge de catégorie sur la carte (et non le chip de filtre).
    expect(within(card).getByText("Musique")).toBeInTheDocument();
    expect(
      within(screen.getByRole("article", { name: "Match de gala" })).getByText("Sport"),
    ).toBeInTheDocument();
    expect(
      within(card).getByRole("link", { name: "Voir l'événement" }),
    ).toHaveAttribute("href", "/evenements/1");
  });

  it("filtre par catégorie", async () => {
    mockCatalogue([concert, match, low]);
    const user = userEvent.setup();
    renderApp(["/evenements"]);

    await screen.findByText("Match de gala");
    await user.click(screen.getByRole("button", { name: "Sport" }));
    expect(screen.queryByText("Concert de printemps")).not.toBeInTheDocument();
    expect(screen.getByText("Match de gala")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Musique" }));
    expect(screen.getByText("Concert de printemps")).toBeInTheDocument();
    expect(screen.getByText("Soirée jazz intimiste")).toBeInTheDocument();
    expect(screen.queryByText("Match de gala")).not.toBeInTheDocument();

    // « Tous » du groupe catégorie (il existe aussi dans le groupe disponibilité).
    const categoryGroup = screen.getByRole("group", { name: "Filtrer par catégorie" });
    await user.click(within(categoryGroup).getByRole("button", { name: "Tous" }));
    expect(screen.getByText("Match de gala")).toBeInTheDocument();
  });

  it("filtre par disponibilité", async () => {
    mockCatalogue([concert, low]);
    const user = userEvent.setup();
    renderApp(["/evenements"]);

    await screen.findByText("Concert de printemps");
    const dispoGroup = screen.getByRole("group", { name: "Filtrer par disponibilité" });
    await user.click(within(dispoGroup).getByRole("button", { name: "Dernières places" }));
    expect(screen.queryByText("Concert de printemps")).not.toBeInTheDocument();
    expect(screen.getByText("Soirée jazz intimiste")).toBeInTheDocument();
  });

  it("affiche un message quand il n'y a aucun événement", async () => {
    mockApi(() => ({ status: 200, body: { events: [] } }));
    renderApp(["/evenements"]);
    expect(
      await screen.findByText(/Aucun événement à venir/),
    ).toBeInTheDocument();
  });

  it("affiche une erreur avec un bouton Réessayer quand l'API échoue, puis se rétablit", async () => {
    let fail = true;
    mockApi(() =>
      fail
        ? { status: 500, body: { code: "INTERNAL_ERROR", message: "Erreur interne" } }
        : { status: 200, body: { events: [concert] } },
    );
    const user = userEvent.setup();
    renderApp(["/evenements"]);

    expect(await screen.findByRole("alert")).toHaveTextContent("Erreur interne");
    fail = false;
    await user.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(await screen.findByText("Concert de printemps")).toBeInTheDocument();
  });
});

describe("page de détail (/evenements/:id)", () => {
  it("s'ouvre en cliquant sur une carte et mène à la page de réservation", async () => {
    const api = mockCatalogue([concert]);
    const user = userEvent.setup();
    renderApp(["/evenements"]);

    const card = await screen.findByRole("article", { name: "Concert de printemps" });
    await user.click(within(card).getByRole("link", { name: "Voir l'événement" }));

    // Page de détail : titre, catégorie, infos, CTA « Réserver ».
    expect(
      await screen.findByRole("heading", { level: 1, name: "Concert de printemps" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Musique")).toBeInTheDocument();
    expect(screen.getByText(/Orchestre symphonique/)).toBeInTheDocument();
    expect(screen.getByText(/150 places restantes/)).toBeInTheDocument();
    // Tarifs de l'événement (plusieurs prix par catégorie de billet).
    expect(screen.getByText("Tarifs")).toBeInTheDocument();
    expect(screen.getByText("Plein tarif")).toBeInTheDocument();
    expect(screen.getByText(/32,00/)).toBeInTheDocument();
    expect(screen.getByText(/24,00/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Réserver" })).toHaveAttribute(
      "href",
      "/evenements/1/reserver",
    );
    expect(api).toHaveBeenCalledWith("/api/events/1", undefined);

    await user.click(screen.getByRole("link", { name: "Réserver" }));
    expect(
      await screen.findByRole("form", { name: "Réserver Concert de printemps" }),
    ).toBeInTheDocument();
  });

  it("désactive la réservation d'un événement complet", async () => {
    mockApi((url) =>
      url === "/api/events/3"
        ? { status: 200, body: complet }
        : { status: 200, body: { events: [complet] } },
    );
    renderApp(["/evenements/3"]);

    expect(await screen.findByRole("button", { name: "Complet" })).toBeDisabled();
    expect(screen.queryByRole("link", { name: "Réserver" })).not.toBeInTheDocument();
  });

  it("affiche « Événement introuvable » pour un id inconnu", async () => {
    mockApi(() => ({
      status: 404,
      body: { code: "NOT_FOUND", message: "Événement introuvable" },
    }));
    renderApp(["/evenements/99"]);

    expect(await screen.findByRole("alert")).toHaveTextContent("Événement introuvable");
    expect(
      screen.getByRole("link", { name: "Retour aux événements" }),
    ).toHaveAttribute("href", "/evenements");
  });
});

describe("page de réservation (/evenements/:id/reserver)", () => {
  it("mène à la page de confirmation après une réservation réussie", async () => {
    const api = mockCatalogue();
    const user = userEvent.setup();
    renderApp(["/evenements/1/reserver"]);

    await fillForm(user);
    await user.clear(screen.getByLabelText("Nombre de places"));
    await user.type(screen.getByLabelText("Nombre de places"), "2");
    await user.click(screen.getByRole("button", { name: "Réserver" }));

    // Page de confirmation : récapitulatif + e-mail + retour au catalogue.
    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("Réservation n°42");
    expect(status).toHaveTextContent("Concert de printemps");
    expect(status).toHaveTextContent("ada@example.com");
    expect(screen.getByText("2 places")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Retour aux événements" }),
    ).toHaveAttribute("href", "/evenements");

    const [url, init] = api.mock.calls.find((c) => c[1]?.method === "POST")!;
    expect(url).toBe("/api/events/1/reservations");
    expect(JSON.parse(init!.body as string)).toEqual({
      customerName: "Ada",
      customerEmail: "ada@example.com",
      seats: 2,
    });
  });

  it("signale « déjà enregistrée » quand l'API rejoue la demande (200)", async () => {
    mockApi((url, init) => {
      if (init?.method === "POST") return { status: 200, body: reservationResponse };
      if (url === "/api/events/1") return { status: 200, body: concert };
      return { status: 200, body: { events: [concert] } };
    });
    const user = userEvent.setup();
    renderApp(["/evenements/1/reserver"]);

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Réserver" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "déjà été enregistrée",
    );
  });

  it("affiche un message clair quand l'événement est devenu complet", async () => {
    mockApi((url, init) => {
      if (init?.method === "POST") {
        return { status: 409, body: { code: "INSUFFICIENT_SEATS", message: "x" } };
      }
      if (url === "/api/events/1") return { status: 200, body: concert };
      return { status: 200, body: { events: [concert] } };
    });
    const user = userEvent.setup();
    renderApp(["/evenements/1/reserver"]);

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Réserver" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Il ne reste plus assez de places",
    );
    expect(screen.getByRole("form")).toBeInTheDocument();
  });

  it("réutilise la même clé d'idempotence pour une nouvelle tentative, et la renouvelle si la saisie change", async () => {
    const keys: string[] = [];
    mockApi((url, init) => {
      if (init?.method === "POST") {
        keys.push((init.headers as Record<string, string>)["Idempotency-Key"]!);
        return { status: 409, body: { code: "INSUFFICIENT_SEATS", message: "x" } };
      }
      if (url === "/api/events/1") return { status: 200, body: concert };
      return { status: 200, body: { events: [concert] } };
    });
    const user = userEvent.setup();
    renderApp(["/evenements/1/reserver"]);

    await fillForm(user);
    const submit = () => screen.getByRole("button", { name: "Réserver" });
    await user.click(submit());
    await screen.findByRole("alert");
    await user.click(submit());
    await waitFor(() => expect(keys).toHaveLength(2));
    expect(keys[1]).toBe(keys[0]);

    await user.type(screen.getByLabelText("Nom"), " Lovelace");
    await user.click(submit());
    await waitFor(() => expect(keys).toHaveLength(3));
    expect(keys[2]).not.toBe(keys[0]);
  });

  it("empêche un second envoi pendant qu'une réservation est en cours", async () => {
    let posts = 0;
    let release: (() => void) | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) => {
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
        if (url === "/api/events/1") {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => concert,
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ events: [concert] }),
        });
      }),
    );
    const user = userEvent.setup();
    renderApp(["/evenements/1/reserver"]);

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Réserver" }));

    expect(
      await screen.findByRole("button", { name: /en cours/ }),
    ).toBeDisabled();
    expect(posts).toBe(1);
    release?.();
    await screen.findByRole("status");
  });

  it("« Annuler » ramène à la page de détail de l'événement", async () => {
    mockCatalogue();
    const user = userEvent.setup();
    renderApp(["/evenements/1/reserver"]);

    await user.click(await screen.findByRole("button", { name: "Annuler" }));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Concert de printemps" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });

  it("refuse le formulaire si l'événement est complet", async () => {
    mockApi((url) =>
      url === "/api/events/3"
        ? { status: 200, body: complet }
        : { status: 200, body: { events: [complet] } },
    );
    renderApp(["/evenements/3/reserver"]);

    expect(await screen.findByRole("alert")).toHaveTextContent("complet");
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });
});

describe("page de confirmation (/confirmation)", () => {
  it("sans réservation en cours (rafraîchissement), propose de retourner au catalogue", async () => {
    renderApp(["/confirmation"]);
    expect(await screen.findByText(/Aucune réservation/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Voir les événements" }),
    ).toHaveAttribute("href", "/evenements");
  });
});

describe("pages statiques", () => {
  it("la page À propos présente l'application", async () => {
    renderApp(["/a-propos"]);
    expect(
      await screen.findByRole("heading", { level: 1, name: "À propos de PlaceLibre" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Voir les événements" }),
    ).toHaveAttribute("href", "/evenements");
  });

  it("la page Contact affiche les coordonnées", async () => {
    renderApp(["/contact"]);
    expect(
      await screen.findByRole("heading", { level: 1, name: "Contact" }),
    ).toBeInTheDocument();
    expect(screen.getByText("bonjour@placelibre.example")).toBeInTheDocument();
  });
});

describe("formulaire de contact (/contact)", () => {
  async function fillContactForm(user: ReturnType<typeof userEvent.setup>) {
    await user.type(await screen.findByLabelText("Nom"), "Ada");
    await user.type(screen.getByLabelText("E-mail"), "ada@example.com");
    await user.type(screen.getByLabelText("Sujet (facultatif)"), "Question");
    await user.type(
      screen.getByLabelText("Message"),
      "Bonjour, une question de test.",
    );
  }

  it("envoie le message à l'API et affiche la confirmation", async () => {
    const api = mockApi((url, init) => {
      if (url === "/api/contact" && init?.method === "POST") {
        return { status: 201, body: { id: 7, status: "queued" } };
      }
      return { status: 404, body: { code: "NOT_FOUND", message: "x" } };
    });
    const user = userEvent.setup();
    renderApp(["/contact"]);

    await fillContactForm(user);
    await user.click(screen.getByRole("button", { name: "Envoyer" }));

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("Message envoyé");
    expect(status).toHaveTextContent("ada@example.com");

    const [url, init] = api.mock.calls.find((c) => c[0] === "/api/contact")!;
    expect(url).toBe("/api/contact");
    expect(init!.method).toBe("POST");
    expect(JSON.parse(init!.body as string)).toEqual({
      name: "Ada",
      email: "ada@example.com",
      subject: "Question",
      message: "Bonjour, une question de test.",
    });
  });

  it("affiche une erreur lisible quand l'API limite les demandes", async () => {
    mockApi(() => ({
      status: 429,
      body: { code: "RATE_LIMITED", message: "Trop de demandes" },
    }));
    const user = userEvent.setup();
    renderApp(["/contact"]);

    await fillContactForm(user);
    await user.click(screen.getByRole("button", { name: "Envoyer" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Trop de demandes. Patientez un instant",
    );
    // Le formulaire reste ouvert pour réessayer.
    expect(screen.getByRole("form", { name: "Formulaire de contact" })).toBeInTheDocument();
  });
});

describe("page 404", () => {
  it("affiche « Page introuvable » pour une route inconnue", async () => {
    renderApp(["/nimporte-quoi"]);
    expect(
      await screen.findByRole("heading", { name: "Page introuvable" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Retour aux événements" }),
    ).toHaveAttribute("href", "/evenements");
  });
});
