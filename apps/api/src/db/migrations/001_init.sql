-- Schéma initial : événements, réservations et boîte d'envoi des e-mails.
-- Les contraintes CHECK/UNIQUE portent l'intégrité métier : même si le code applicatif
-- se trompait, la base refuserait un stock négatif ou une réservation dupliquée.

CREATE TABLE events (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL CHECK (length(btrim (name)) > 0),
    description TEXT NOT NULL DEFAULT '',
    venue TEXT NOT NULL DEFAULT '',
    starts_at TIMESTAMPTZ NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity >= 0),
    -- Stock restant : décrémenté atomiquement par la réservation (voir ADR 0003).
    remaining INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT events_remaining_in_range CHECK (
        remaining >= 0
        AND remaining <= capacity
    )
);

CREATE INDEX events_starts_at_idx ON events (starts_at);

CREATE TABLE reservations (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events (id),
    -- Clé fournie par le client : un même envoi rejoué ne crée qu'une seule réservation.
    idempotency_key TEXT NOT NULL,
    customer_name TEXT NOT NULL CHECK (
        length(btrim (customer_name)) > 0
    ),
    customer_email TEXT NOT NULL,
    seats INTEGER NOT NULL CHECK (seats > 0),
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (
        status IN ('confirmed', 'cancelled')
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT reservations_idempotency_key_uniq UNIQUE (idempotency_key)
);

CREATE INDEX reservations_event_id_idx ON reservations (event_id);

-- Boîte d'envoi transactionnelle : la ligne est écrite dans la même transaction que la
-- réservation, puis consommée par le worker. Un e-mail ne peut donc jamais être perdu
-- si la réservation est validée, ni envoyé si elle est annulée.
CREATE TABLE email_outbox (
    id BIGSERIAL PRIMARY KEY,
    reservation_id BIGINT NOT NULL REFERENCES reservations (id),
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'sent', 'failed')
    ),
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    -- Recul exponentiel : après un échec, le worker ne retente pas avant cette date.
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at TIMESTAMPTZ
);

-- Index partiel : le worker ne parcourt que les messages encore à traiter.
CREATE INDEX email_outbox_pending_idx ON email_outbox (next_attempt_at, id)
WHERE
    status = 'pending';
