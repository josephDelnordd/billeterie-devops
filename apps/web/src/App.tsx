import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AboutPage } from "./pages/AboutPage";
import { ConfirmationPage } from "./pages/ConfirmationPage";
import { ContactPage } from "./pages/ContactPage";
import { EventPage } from "./pages/EventPage";
import { EventsPage } from "./pages/EventsPage";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PricingPage } from "./pages/PricingPage";
import { ReservationPage } from "./pages/ReservationPage";

/**
 * Table des routes de l'application. Les pages sont servies par index.html
 * (fallback SPA côté nginx/Vite) et aiguillées ici, côté client.
 */
export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="evenements" element={<EventsPage />} />
        <Route path="evenements/:id" element={<EventPage />} />
        <Route path="evenements/:id/reserver" element={<ReservationPage />} />
        <Route path="confirmation" element={<ConfirmationPage />} />
        <Route path="a-propos" element={<AboutPage />} />
        <Route path="tarifs" element={<PricingPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
