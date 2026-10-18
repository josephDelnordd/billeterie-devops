import { describe, expect, it } from "vitest";
import { ValidationError } from "../../src/domain/errors.js";
import {
  MAX_SEATS_PER_RESERVATION,
  eventIdParamsSchema,
  idempotencyHeadersSchema,
  parseOrThrow,
  reservationBodySchema,
} from "../../src/domain/validation.js";

const valid = {
  customerName: "Ada Lovelace",
  customerEmail: "ada@example.com",
  seats: 2,
};

describe("reservationBodySchema", () => {
  it("accepte une demande valide", () => {
    expect(parseOrThrow(reservationBodySchema, valid)).toEqual(valid);
  });

  it("normalise l'e-mail (minuscules) et supprime les espaces autour du nom", () => {
    const parsed = parseOrThrow(reservationBodySchema, {
      ...valid,
      customerName: "  Ada  ",
      customerEmail: " ADA@Example.COM ",
    });
    expect(parsed.customerName).toBe("Ada");
    expect(parsed.customerEmail).toBe("ada@example.com");
  });

  it.each([
    ["0 place", { seats: 0 }],
    ["nombre de places négatif", { seats: -1 }],
    ["nombre de places décimal", { seats: 1.5 }],
    ["trop de places", { seats: MAX_SEATS_PER_RESERVATION + 1 }],
    ["places sous forme de chaîne", { seats: "2" }],
    ["nom vide", { customerName: "   " }],
    ["e-mail invalide", { customerEmail: "pas-un-email" }],
  ])("refuse : %s", (_label, override) => {
    expect(() =>
      parseOrThrow(reservationBodySchema, { ...valid, ...override }),
    ).toThrow(ValidationError);
  });

  it("refuse les champs inconnus (évite que le client croie fixer un champ ignoré)", () => {
    expect(() =>
      parseOrThrow(reservationBodySchema, { ...valid, status: "confirmed" }),
    ).toThrow(ValidationError);
  });

  it("indique le champ en défaut dans le détail", () => {
    try {
      parseOrThrow(reservationBodySchema, { ...valid, seats: 0 });
      expect.unreachable();
    } catch (error) {
      expect((error as ValidationError).details).toEqual([
        expect.objectContaining({ path: "seats" }),
      ]);
    }
  });
});

describe("idempotencyHeadersSchema", () => {
  it("accepte une clé de type UUID", () => {
    const key = crypto.randomUUID();
    expect(
      parseOrThrow(idempotencyHeadersSchema, { "idempotency-key": key })[
        "idempotency-key"
      ],
    ).toBe(key);
  });

  it.each([
    ["trop-court".slice(0, 5)],
    ["a".repeat(129)],
    ["clé avec espaces et accents é"],
    ["abc;DROP TABLE x"],
  ])("refuse la clé %j", (key) => {
    expect(() =>
      parseOrThrow(idempotencyHeadersSchema, { "idempotency-key": key }),
    ).toThrow(ValidationError);
  });

  it("refuse l'absence de l'en-tête", () => {
    expect(() => parseOrThrow(idempotencyHeadersSchema, {})).toThrow(
      ValidationError,
    );
  });
});

describe("eventIdParamsSchema", () => {
  it("convertit un identifiant numérique", () => {
    expect(parseOrThrow(eventIdParamsSchema, { id: "42" }).id).toBe(42);
  });

  it.each([["abc"], ["0"], ["-3"], ["1.5"]])("refuse %s", (id) => {
    expect(() => parseOrThrow(eventIdParamsSchema, { id })).toThrow(
      ValidationError,
    );
  });
});
