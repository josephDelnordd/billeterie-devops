import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/** Icônes SVG inline de la page tarifs (autorisées par la CSP : éléments DOM). */
const ICONS: Record<string, ReactNode> = {
  tag: (
    <>
      <path d="M12.6 2.6 21 11a2 2 0 0 1 0 2.8l-6.2 6.2a2 2 0 0 1-2.8 0L3.6 11.6A2 2 0 0 1 3 10.2V5a2 2 0 0 1 2-2h5.2a2 2 0 0 1 1.4.6z" />
      <circle cx="7.5" cy="7.5" r="1.3" />
    </>
  ),
  percent: (
    <>
      <line x1="19" y1="5" x2="5" y2="19" />
      <circle cx="7" cy="7" r="2.5" />
      <circle cx="17" cy="17" r="2.5" />
    </>
  ),
  smile: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14s1.3 2 3.5 2 3.5-2 3.5-2" />
      <line x1="9" y1="9.5" x2="9.01" y2="9.5" />
      <line x1="15" y1="9.5" x2="15.01" y2="9.5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.8 19c.6-3 2.7-4.8 5.2-4.8s4.6 1.8 5.2 4.8" />
      <circle cx="16.8" cy="9.5" r="2.4" />
      <path d="M15.8 14.6c2.3.4 4 1.9 4.5 4.4" />
    </>
  ),
};

function TariffIcon({ name }: { name: string }) {
  return (
    <span className="tariff-icon">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        {ICONS[name]}
      </svg>
    </span>
  );
}

export function PricingPage() {
  return (
    <article className="card page-static">
      <p className="kicker">Politique tarifaire</p>
      <h1>Nos tarifs, en toute transparence</h1>
      <p className="page-lead">
        Chaque événement affiche tous ses tarifs : le « dès X € » des cartes est
        simplement le tarif le plus bas. Les prix sont fixés par les
        organisateurs, nous les affichons tels quels — aucun frais caché, et le
        prix choisi à la réservation est celui qui figure sur votre confirmation.
      </p>

      <h2>Les catégories de billets</h2>
      <div className="tariff-grid">
        <section className="card tariff-card">
          <TariffIcon name="tag" />
          <h2>Plein tarif</h2>
          <p>
            Le prix de référence de l'événement, fixé par l'organisateur. Il
            s'applique à tout billet sans réduction particulière.
          </p>
        </section>
        <section className="card tariff-card">
          <TariffIcon name="percent" />
          <h2>Tarifs réduits</h2>
          <p>
            Étudiants, demandeurs d'emploi, seniors… selon l'événement : un
            justificatif pourra vous être demandé à l'entrée.
          </p>
        </section>
        <section className="card tariff-card">
          <TariffIcon name="smile" />
          <h2>Jeunes & familles</h2>
          <p>
            Moins de 26 ans, moins de 12 ans… chaque événement précise ses
            tarifs jeunes dans sa liste de prix.
          </p>
        </section>
        <section className="card tariff-card">
          <TariffIcon name="users" />
          <h2>Groupes</h2>
          <p>
            À partir de 10 places pour le même événement,{" "}
            <Link to="/contact">écrivez-nous</Link> pour un tarif de groupe.
          </p>
        </section>
      </div>

      <h2>Comment choisir son tarif ?</h2>
      <p>
        Sur la page de réservation de l'événement, sélectionnez le tarif adapté
        à votre situation. Le récapitulatif de confirmation — et l'e-mail envoyé
        immédiatement après — indiquent le tarif choisi, le prix unitaire et le
        total (nombre de places × prix unitaire).
      </p>
      <div className="card tariff-example">
        <p>
          <strong>Exemple :</strong> 2 places « Réduit » à 12,00 € pour
          l'Exposition Monet →{" "}
          <strong className="tariff-total">total 24,00 €</strong>, indiqué tel
          quel sur la confirmation.
        </p>
      </div>

      <p className="page-cta">
        <Link className="btn" to="/evenements">
          Voir les événements
        </Link>
      </p>
    </article>
  );
}
