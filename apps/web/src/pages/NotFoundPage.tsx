import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="card confirmation notfound" role="alert">
      <p className="error-code" aria-hidden="true">
        404
      </p>
      <h1>Page introuvable</h1>
      <p>Cette page n'existe pas (ou plus).</p>
      <Link className="btn" to="/evenements">
        Retour aux événements
      </Link>
    </div>
  );
}
