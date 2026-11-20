import { useEffect } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";

/** Remonte en haut de la page à chaque changement de route. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/** Logo ticket en SVG inline (autorisé par la CSP). */
function TicketMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2.5 2.5 0 0 0 0 6v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2.5 2.5 0 0 0 0-6z" />
      <path d="M13 5v2" />
      <path d="M13 11v2" />
      <path d="M13 17v2" />
    </svg>
  );
}

export function Layout() {
  return (
    <>
      <ScrollToTop />
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="brand">
            <span className="brand-tile" aria-hidden="true">
              <TicketMark className="brand-icon" />
            </span>
            <span className="brand-name">PlaceLibre</span>
          </Link>
          <nav className="main-nav" aria-label="Navigation principale">
            <NavLink to="/" end>
              Accueil
            </NavLink>
            <NavLink to="/evenements">Événements</NavLink>
            <NavLink to="/tarifs">Tarifs</NavLink>
            <NavLink to="/a-propos">À propos</NavLink>
            <NavLink to="/contact">Contact</NavLink>
          </nav>
        </div>
      </header>
      <main className="container">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <span className="brand-name">PlaceLibre</span>
            <p>
              La billetterie de démonstration : un catalogue d'événements, une
              réservation en quelques clics et une confirmation par e-mail
              immédiate.
            </p>
          </div>
          <nav className="footer-col" aria-label="Pied de page">
            <p className="footer-title">Explorer</p>
            <Link to="/">Accueil</Link>
            <Link to="/evenements">Événements</Link>
            <Link to="/a-propos">À propos</Link>
            <Link to="/contact">Contact</Link>
          </nav>
          <div className="footer-col">
            <p className="footer-title">E-mails de confirmation</p>
            <p className="footer-note">
              En local, ils sont visibles dans Mailpit (port 8025) :{" "}
              <a href="http://localhost:8025">http://localhost:8025</a>.
            </p>
          </div>
        </div>
        <div className="footer-base">
          <div className="container">
            PlaceLibre — projet de démonstration, le paiement n'est pas réel.
          </div>
        </div>
      </footer>
    </>
  );
}
