-- Tarifs des événements : un événement a plusieurs prix (plein tarif, réduit,
-- jeune…), chaque prix correspondant à une catégorie de billet.
-- Le montant est stocké en centimes (entier) : jamais de virgule flottante pour de l'argent.
CREATE TABLE event_prices (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    label TEXT NOT NULL CHECK (length(btrim (label)) > 0),
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    position INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX event_prices_event_id_idx ON event_prices (event_id, position, id);
