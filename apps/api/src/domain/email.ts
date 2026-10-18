export interface ConfirmationEmailInput {
  customerName: string;
  eventName: string;
  venue: string;
  startsAt: Date;
  seats: number;
  reservationId: number;
}

/** Construit le message de confirmation. Fonction pure : le rendu ne dépend ni de l'heure ni de la machine. */
export function buildConfirmationEmail(input: ConfirmationEmailInput): {
  subject: string;
  body: string;
} {
  // Fuseau explicite : sans lui, la date changerait selon le serveur qui exécute le code.
  const when = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(input.startsAt);

  const places = input.seats > 1 ? `${input.seats} places` : "1 place";
  const lieu = input.venue.trim() === "" ? "" : `\nLieu : ${input.venue}`;

  return {
    subject: `Confirmation de réservation n°${input.reservationId} - ${input.eventName}`,
    body:
      `Bonjour ${input.customerName},\n\n` +
      `Votre réservation de ${places} pour « ${input.eventName} » est confirmée.\n\n` +
      `Date : ${when}${lieu}\n` +
      `Numéro de réservation : ${input.reservationId}\n\n` +
      `À bientôt !\n`,
  };
}
