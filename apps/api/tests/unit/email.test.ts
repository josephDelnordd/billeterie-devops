import { describe, expect, it } from "vitest";
import { buildConfirmationEmail } from "../../src/domain/email.js";

const base = {
  customerName: "Ada",
  eventName: "Concert de printemps",
  venue: "Grande salle, Paris",
  // 18 h 30 UTC en juin = 20 h 30 à Paris (UTC+2) : vérifie la conversion de fuseau.
  startsAt: new Date("2030-06-15T18:30:00Z"),
  seats: 2,
  reservationId: 42,
};

describe("buildConfirmationEmail", () => {
  it("inclut le numéro de réservation et le nom de l’événement dans le sujet", () => {
    expect(buildConfirmationEmail(base).subject).toBe(
      "Confirmation de réservation n°42 - Concert de printemps",
    );
  });

  it("affiche la date à l’heure de Paris, indépendamment du fuseau du serveur", () => {
    expect(buildConfirmationEmail(base).body).toContain("20:30");
  });

  it("accorde « place » au singulier et « places » au pluriel", () => {
    expect(buildConfirmationEmail({ ...base, seats: 1 }).body).toContain(
      "1 place pour",
    );
    expect(buildConfirmationEmail({ ...base, seats: 3 }).body).toContain(
      "3 places pour",
    );
  });

  it("omet la ligne du lieu quand il est vide", () => {
    expect(buildConfirmationEmail({ ...base, venue: "  " }).body).not.toContain(
      "Lieu",
    );
    expect(buildConfirmationEmail(base).body).toContain(
      "Lieu : Grande salle, Paris",
    );
  });
});
