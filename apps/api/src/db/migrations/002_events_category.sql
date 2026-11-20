-- Catégories des événements : l'intégrité est portée par la base (CHECK), comme pour le stock.
-- La valeur par défaut ne sert que pour les lignes existantes au moment de la migration.
ALTER TABLE events
    ADD COLUMN category TEXT NOT NULL DEFAULT 'musique'
    CHECK (category IN ('musique', 'humour', 'sport', 'exposition', 'theatre'));
