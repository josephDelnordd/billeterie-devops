import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { sendContactMessage } from "../api";
import { messageFor } from "../userError";

export function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await sendContactMessage({
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim() === "" ? undefined : subject.trim(),
        message: message.trim(),
      });
      setSent(true);
    } catch (caught) {
      setError(messageFor(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-grid">
      <article className="card page-static">
        <p className="kicker">Une question ?</p>
        <h1>Contact</h1>
        <p>
          Une question sur une réservation ? Écrivez-nous via le formulaire
          (adresse de démonstration) :
        </p>

        {sent ? (
          <div role="status" className="success">
            <strong>Message envoyé.</strong> Merci {name.trim() || ""} !
            Nous vous répondrons à {email.trim()}. En local, le message arrive
            dans Mailpit (port 8025).
            <div className="actions">
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setSent(false);
                  setName("");
                  setEmail("");
                  setSubject("");
                  setMessage("");
                }}
              >
                Envoyer un autre message
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            aria-label="Formulaire de contact"
            className="form"
          >
            <div className="form-row">
              <label>
                Nom
                <input
                  value={name}
                  required
                  maxLength={120}
                  autoComplete="name"
                  placeholder="Ex. Ada Lovelace"
                  onChange={(e) => setName(e.target.value)}
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
                  placeholder="Ex. ada@exemple.fr"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
            </div>

            <label>
              Sujet (facultatif)
              <input
                value={subject}
                maxLength={200}
                placeholder="Ex. Question sur ma réservation"
                onChange={(e) => setSubject(e.target.value)}
              />
            </label>

            <label>
              Message
              <textarea
                value={message}
                required
                minLength={10}
                maxLength={5000}
                rows={8}
                placeholder="Ex. Bonjour, je voudrais réserver 2 places pour l'exposition Monet…"
                onChange={(e) => setMessage(e.target.value)}
              />
            </label>

            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}

            <div className="actions">
              <button type="submit" disabled={submitting}>
                {submitting ? "Envoi en cours…" : "Envoyer"}
              </button>
            </div>
          </form>
        )}
      </article>

      <aside className="card page-aside" aria-label="Coordonnées">
        <p className="kicker">Nos coordonnées</p>
        <h2>PlaceLibre</h2>
        <dl className="summary">
          <dt>E-mail</dt>
          <dd>bonjour@placelibre.example</dd>
          <dt>Téléphone</dt>
          <dd>+33 1 23 45 67 89</dd>
          <dt>Adresse</dt>
          <dd>12 rue des Lilas, 75011 Paris</dd>
          <dt>Horaires</dt>
          <dd>Du lundi au vendredi, 9 h – 18 h</dd>
        </dl>
        <p>
          En local, les e-mails envoyés par l'application (confirmations de
          réservation et messages de contact) arrivent dans Mailpit :{" "}
          <a href="http://localhost:8025">http://localhost:8025</a>.
        </p>
        <p>
          <Link className="btn" to="/evenements">
            Retour aux événements
          </Link>
        </p>
      </aside>
    </div>
  );
}
