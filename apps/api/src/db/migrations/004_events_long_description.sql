-- Description longue de chaque événement, affichée sur sa page de détail.
-- La colonne `description` reste l'accroche courte affichée sur les cartes du catalogue.
ALTER TABLE events
    ADD COLUMN long_description TEXT NOT NULL DEFAULT '';
