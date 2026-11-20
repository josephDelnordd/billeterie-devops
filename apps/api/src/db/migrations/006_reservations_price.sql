-- Tarif choisi lors de la réservation : chaque réservation peut préciser
-- la catégorie de billet (plein tarif, réduit…) parmi celles de l'événement.
-- Nullable : un événement sans tarif reste réservable sans price_id.
ALTER TABLE reservations
    ADD COLUMN price_id BIGINT REFERENCES event_prices (id);
