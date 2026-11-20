-- La boîte d'envoi transactionnelle transporte aussi les messages du formulaire
-- de contact : reservation_id devient nullable (la FK continue de protéger les
-- valeurs non nulles). Le worker ne lit que recipient/subject/body.
ALTER TABLE email_outbox ALTER COLUMN reservation_id DROP NOT NULL;
