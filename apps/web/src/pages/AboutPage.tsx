import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";

/** Icônes SVG inline de la page À propos (autorisées par la CSP : éléments DOM). */
const ICONS: Record<string, ReactNode> = {
  mission: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  engagements: (
    <>
      <path d="M12 3l7 2.8V11c0 4.6-3 7.7-7 9.2-4-1.5-7-4.6-7-9.2V5.8L12 3z" />
      <path d="M9 11.5l2.2 2.2 4.3-4.2" />
    </>
  ),
  equipe: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.8 19c.6-3 2.7-4.8 5.2-4.8s4.6 1.8 5.2 4.8" />
      <circle cx="16.8" cy="9.5" r="2.4" />
      <path d="M15.8 14.6c2.3.4 4 1.9 4.5 4.4" />
    </>
  ),
};

function AboutIcon({ name }: { name: string }) {
  return (
    <span className="about-icon">
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

export function AboutPage() {
  const rootRef = useRef<HTMLElement>(null);

  // Dynamisme : révélation des sections au scroll (IntersectionObserver)
  // et compteurs animés des chiffres clés. Sans IO (ou si prefers-reduced-motion),
  // tout est affiché directement.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const reveals = Array.from(root.querySelectorAll<HTMLElement>(".reveal"));

    if (reduced || typeof IntersectionObserver === "undefined") {
      reveals.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const counters = Array.from(
      root.querySelectorAll<HTMLElement>(".stats strong[data-count]"),
    );
    const runCounter = (el: HTMLElement) => {
      const target = Number(el.dataset.count);
      if (!Number.isFinite(target)) return;
      const suffix = el.dataset.suffix ?? "";
      const duration = 1300;
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = `${Math.round(target * eased).toLocaleString("fr-FR")}${suffix}`;
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          if (entry.target.classList.contains("stats")) {
            counters.forEach(runCounter);
          }
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.2 },
    );
    reveals.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <article className="card page-static" ref={rootRef}>
      <p className="kicker reveal">Notre histoire</p>
      <h1 className="reveal d1">À propos de PlaceLibre</h1>
      <p className="reveal d2 about-lead">
        PlaceLibre est né à Lyon en 2019, d'une idée simple partagée entre trois
        amis passionnés de culture et de sport : réserver une place pour un
        concert, un match ou une exposition devrait être aussi simple — et aussi
        rassurant — qu'acheter un billet de cinéma.
      </p>
      <p className="reveal d3 about-lead">
        Parti d'un petit carnet d'adresses d'événements locaux, le projet est
        devenu une billetterie à part entière : des centaines de salles, de
        théâtres et de stades partenaires, une réservation en quelques clics et
        une confirmation immédiate par e-mail. Notre conviction n'a pas changé
        depuis le premier jour : la culture et le sport sont plus forts quand
        ils sont accessibles à tous.
      </p>

      <h2 className="reveal">PlaceLibre en chiffres</h2>
      <ul className="stats reveal">
        <li>
          <strong data-count="250000">250 000</strong>
          <span>spectateurs accompagnés chaque année</span>
        </li>
        <li>
          <strong data-count="1200">1 200</strong>
          <span>événements partenaires référencés</span>
        </li>
        <li>
          <strong data-count="98" data-suffix=" %">98 %</strong>
          <span>de clients satisfaits de leur réservation</span>
        </li>
        <li>
          <strong>7 j/7</strong>
          <span>une équipe support à votre écoute</span>
        </li>
      </ul>

      <div className="about-grid">
        <section className="card about-card reveal">
          <AboutIcon name="mission" />
          <h2>Notre mission</h2>
          <p>
            Rendre la sortie simple, transparente et sûre. Chaque place
            affichée est une place réellement disponible, chaque billet acheté
            est confirmé immédiatement, et notre équipe vous répond sept jours
            sur sept.
          </p>
        </section>

        <section className="card about-card reveal d1">
          <AboutIcon name="engagements" />
          <h2>Nos engagements</h2>
          <ul>
            <li>des places réelles, mises à jour en temps réel ;</li>
            <li>
              une réservation fiable : jamais de doublon, jamais de mauvaise
              surprise à l'entrée ;
            </li>
            <li>un e-mail de confirmation immédiat après chaque achat ;</li>
            <li>
              des tarifs transparents, avec des réductions pour les jeunes, les
              familles et les demandeurs d'emploi.
            </li>
          </ul>
        </section>

        <section className="card about-card reveal d2">
          <AboutIcon name="equipe" />
          <h2>Une équipe passionnée</h2>
          <p>
            Derrière PlaceLibre, une équipe de passionnés — producteurs,
            artistes, chargés de clientèle — réunie entre Lyon et Paris. Une
            question sur une réservation, un doute sur une date ?{" "}
            <Link to="/contact">Écrivez-nous</Link>, nous répondons vite.
          </p>
        </section>
      </div>

      <p className="about-cta reveal">
        <Link className="btn" to="/evenements">
          Voir les événements
        </Link>
      </p>
    </article>
  );
}
