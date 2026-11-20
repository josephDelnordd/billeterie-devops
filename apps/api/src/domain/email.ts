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

export interface ContactEmailInput {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

/** Construit le message de contact reçu depuis le site (envoyé à la boîte de support). */
export function buildContactEmail(input: ContactEmailInput): {
  subject: string;
  body: string;
} {
  const subject = input.subject?.trim() ? input.subject.trim() : "Message depuis le site";
  return {
    subject: `[Contact] ${subject} — ${input.name}`,
    body:
      `Nouveau message depuis le formulaire de contact.\n\n` +
      `Nom : ${input.name}\n` +
      `E-mail : ${input.email}\n` +
      `Sujet : ${subject}\n\n` +
      `Message :\n${input.message}\n`,
  };
}
