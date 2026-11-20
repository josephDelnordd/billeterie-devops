import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
// Polices auto-hébergées (CSP : default-src 'self' interdit les CDN) :
// Vite bundle les woff2 dans dist/assets, servis depuis la même origine.
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/inter";
import { App } from "./App";
// Feuilles de style par couche : base (tokens + partagés), layout (header/footer),
// puis une feuille par page. L'ordre d'import est l'ordre de cascade.
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/home.css";
import "./styles/catalog.css";
import "./styles/event-detail.css";
import "./styles/reservation.css";
import "./styles/confirmation.css";
import "./styles/about.css";
import "./styles/contact.css";
import "./styles/not-found.css";

const root = document.getElementById("root");
if (!root) throw new Error("Élément #root introuvable dans index.html");

createRoot(root).render(
  <StrictMode>
    {/* Le serveur (nginx en prod, Vite en dev) renvoie index.html sur toutes les
        routes de l'app : le routage est purement côté client. */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
