import { useRef, useState, type FormEvent } from "react";
import {
  ApiError,
  createReservation,
  type EventItem,
  type Reservation,
} from "../api";
import { newIdempotencyKey } from "../format";

const MAX_SEATS = 10;

interface Props {
  event: EventItem;
  onReserved: (reservation: Reservation) => void;
  onCancel: () => void;
}

/** Messages adaptés à l'utilisateur : on ne montre jamais un code technique brut. */
function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "INSUFFICIENT_SEATS")
      return "Il ne reste plus assez de places pour cette demande.";
    if (error.code === "RATE_LIMITED")
      return "Trop de demandes. Patientez un instant avant de réessayer.";
    if (error.code === "VALIDATION_ERROR")
      return "Certaines informations sont invalides. Vérifiez le formulaire.";
    return error.message;
  }
  return "Une erreur inattendue est survenue.";
}

export function ReservationForm({ event, onReserved, onCancel }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [seats, setSeats] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // La clé reste la même tant que la saisie ne change pas : cliquer deux fois sur
  // « Réserver », ou réessayer après une coupure réseau, ne crée jamais de doublon.
  // Elle est renouvelée dès que l'utilisateur modifie sa demande.
  const keyRef = useRef(newIdempotencyKey());
  const resetKey = () => {
    keyRef.current = newIdempotencyKey();
  };

  const maxSeats = Math.min(MAX_SEATS, event.remaining);

  async function handleSubmit(submitEvent: FormEvent) {
    submitEvent.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const { reservation } = await createReservation(
        event.id,
        { customerName: name.trim(), customerEmail: email.trim(), seats },
        keyRef.current,
      );
      onReserved(reservation);
    } catch (caught) {
      setError(messageFor(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label={`Réserver ${event.name}`}
      className="form"
    >
      <h3>Réserver : {event.name}</h3>

      <label>
        Nom
        <input
          value={name}
          required
          maxLength={120}
          autoComplete="name"
          onChange={(e) => {
            setName(e.target.value);
            resetKey();
          }}
        />
      </label>

      <label>
        E-mail
        <input
          type="email"
          value={email}
          required
          maxLength={254}
          autoComplete="email"
          onChange={(e) => {
            setEmail(e.target.value);
            resetKey();
          }}
        />
      </label>

      <label>
        Nombre de places
        <input
          type="number"
          value={seats}
          min={1}
          max={maxSeats}
          required
          onChange={(e) => {
            setSeats(Number(e.target.value));
            resetKey();
          }}
        />
      </label>

      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}

      <div className="actions">
        <button type="submit" disabled={submitting}>
          {submitting ? "Réservation en cours…" : "Réserver"}
        </button>
        <button
          type="button"
          className="secondary"
          onClick={onCancel}
          disabled={submitting}
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
