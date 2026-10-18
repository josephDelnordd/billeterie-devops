import { describe, expect, it } from "vitest";
import {
  availabilityLabel,
  availabilityOf,
  formatDate,
  newIdempotencyKey,
} from "../src/format";

describe("availabilityOf", () => {
  it("indique complet quand il ne reste aucune place", () => {
    expect(availabilityOf(0, 100)).toBe("soldout");
  });

  it("indique les dernières places sous 10 % de la capacité", () => {
    expect(availabilityOf(10, 100)).toBe("low");
    expect(availabilityOf(11, 100)).toBe("available");
  });

  it("considère toujours la dernière place comme « dernières places », même sur une petite jauge", () => {
    expect(availabilityOf(1, 5)).toBe("low");
  });
});

describe("availabilityLabel", () => {
  it("accorde le singulier et le pluriel", () => {
    expect(availabilityLabel(1, 5)).toBe("Dernières places : 1 place restante");
    expect(availabilityLabel(50, 100)).toBe("50 places restantes");
  });

  it("affiche Complet", () => {
    expect(availabilityLabel(0, 5)).toBe("Complet");
  });
});

describe("formatDate", () => {
  it("affiche l'heure de Paris, indépendamment du fuseau du navigateur", () => {
    // 18 h 30 UTC en juin = 20 h 30 à Paris.
    expect(formatDate("2030-06-15T18:30:00Z")).toContain("20:30");
  });
});

describe("newIdempotencyKey", () => {
  it("produit des clés uniques respectant le format exigé par l'API", () => {
    const a = newIdempotencyKey();
    const b = newIdempotencyKey();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]{8,128}$/);
  });
});
