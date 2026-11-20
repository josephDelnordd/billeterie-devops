import type { Pool } from "pg";

/**
 * Insère des événements fictifs de démonstration, uniquement si la table est vide (idempotent).
 * Les dates sont relatives à `now()` : chaque reseed produit des événements à venir.
 * `description` = accroche courte (cartes du catalogue) ; `long_description` = texte détaillé
 * de la page événement, dont les paragraphes sont séparés par une ligne vide.
 * Données de démonstration uniquement : jamais de données réelles dans ce projet.
 * Retourne le nombre d'événements créés.
 */
export async function seedDemoEvents(pool: Pool): Promise<number> {
  const result = await pool.query(`
    INSERT INTO events (name, description, long_description, venue, category, starts_at, capacity, remaining)
    SELECT v.name, v.description, v.long_description, v.venue, v.category, now() + v.starts_in, v.capacity, v.remaining
    FROM (VALUES
      ('Exposition Monet',
       'Les Nymphéas revisités, parcours immersif',
       $$Plongez au cœur de l'œuvre de Claude Monet à travers un parcours immersif réunissant dix-huit toiles majeures des « Nymphéas », présentées pour la première fois dans cette configuration. Visites guidées toutes les heures, audioguide inclus et espace contemplatif sonorisé en fin de parcours.

L'exposition est entièrement accessible aux personnes à mobilité réduite. Durée de visite conseillée : 1 h 30. Tarif réduit pour les moins de 26 ans et les demandeurs d'emploi, sur présentation d'un justificatif.$$,
       'Musée d''Orsay, Paris', 'exposition', interval '3 days', 150, 150),
      ('Stand-up « Nouvelles voix »',
       'Cinq humoristes, une soirée',
       $$Cinq humoristes de la scène montante présentent chacun un extrait de leur nouveau spectacle, entre stand-up intimiste et humour absurde. Une soirée rythmée, sans temps mort, dans une salle de 80 places qui garantit une proximité rare avec les artistes.

Spectacle déconseillé aux moins de 12 ans. Durée : 1 h 45 avec entracte. Bar et restauration sur place dès 19 h.$$,
       'Le petit théâtre, Lyon', 'humour', interval '7 days', 80, 80),
      ('Soirée jazz intimiste',
       'Petite salle : idéal pour tester le complet',
       $$Un quintet réuni pour l'occasion revisite les grands standards du jazz, de Monk à Jobim, dans une salle de cinq places : basse, batterie, piano, saxophone et voix. Ambiance club, lumière tamisée et échanges avec les musiciens entre les sets.

Il ne reste que quelques places : la salle affiche bientôt complet. Arrivée conseillée à 20 h 30, premier set à 21 h précises.$$,
       'Salle intime, Lyon', 'musique', interval '10 days', 5, 1),
      ('Match de gala',
       'Finale régionale, ambiance électrique',
       $$La finale régionale oppose les deux meilleures équipes de la saison dans un stade chauffé à blanc. Animations dès 18 h, buvettes, écran géant : l'ambiance électrique est garantie, quelle que soit l'issue.

Portes à 18 h, coup d'envoi à 20 h. Billet nominatif : non remboursable, mais cessible jusqu'à 24 h avant le match.$$,
       'Stade Nord, Lille', 'sport', interval '12 days', 500, 500),
      ('Concert électro « Warehouse »',
       'Événement sold out pour la démo',
       $$Trois scènes, quarante artistes et douze heures de musique électronique dans les hangars réaménagés du Zénith : techno industrielle, drum'n'bass et lives modulaires, avec lightshow et restauration sur place jusqu'à 6 h du matin.

Événement complet : la billetterie est close. Une liste d'attente ouvre sur place à partir de 22 h, dans la limite des places libérées. Billet 18+, pièce d'identité exigée.$$,
       'Zénith, Nantes', 'musique', interval '21 days', 50, 0),
      ('Le Misanthrope',
       'Molière, mise en scène moderne',
       $$Molière dans une mise en scène contemporaine qui fait résonner la comédie d'Alceste avec une acuité rare : décor épuré, musique live et jeu d'une grande précision. Une production du Théâtre du Nord saluée par la critique à sa création.

Durée : 2 h 10 avec entracte. Spectacle en français, surtitré en anglais le vendredi. Rencontre avec l'équipe artistique à l'issue de la représentation du samedi.$$,
       'Théâtre du Nord, Lille', 'theatre', interval '26 days', 120, 120),
      ('Concert de printemps',
       'Orchestre symphonique, programme romantique',
       $$L'Orchestre symphonique interprète un programme romantique : le « Prélude à l'après-midi d'un faune » de Debussy, la Symphonie n° 9 « Du Nouveau Monde » de Dvořák et, en création, une commande à la compositrice Camille Aubert. Direction : Julien Roche.

Le concert est précédé d'une présentation du programme à 19 h 30 au foyer. Durée : 2 h avec entracte. Vestiaire et bar ouverts dès 19 h.$$,
       'Grande salle, Paris', 'musique', interval '30 days', 200, 200),
      ('Opéra : La Traviata',
       'Verdi, mise en scène contemporaine',
       $$Verdi dans toute sa splendeur : une mise en scène contemporaine habille la « Traviata » d'une lumière crue et bouleversante, servie par un plateau vocal de premier plan et l'orchestre de l'Opéra national. L'un des opéras les plus joués au monde, dans une version qui en révèle chaque émotion.

Durée : 2 h 45 avec deux entractes. Spectacle en italien, surtitré en français. Dîner au restaurant de l'Opéra possible sur réservation avant la représentation.$$,
       'Opéra national, Paris', 'musique', interval '45 days', 300, 300),
      ('Festival ouverture',
       'Ouverture des ventes : forte affluence',
       $$L'ouverture officielle du festival : quatre scènes, soixante artistes et une journée entière de découvertes, de la chanson française à l'électronique. Plan des scènes, restauration et village des partenaires accessibles dès 12 h.

Le billet est valable toute la journée et donne accès à tous les concerts de la soirée d'ouverture. Navettes gratuites depuis la gare toutes les 15 minutes. En cas de pluie, les concerts principaux sont maintenus sous chapiteau.$$,
       'Parc des expos, Lille', 'musique', interval '60 days', 1000, 1000)
    ) AS v(name, description, long_description, venue, category, starts_in, capacity, remaining)
    WHERE NOT EXISTS (SELECT 1 FROM events)`);

  // Plusieurs tarifs par événement (catégories de billets), en centimes.
  await pool.query(`
    INSERT INTO event_prices (event_id, label, amount_cents, position)
    SELECT e.id, v.label, v.amount_cents, v.position
    FROM events e
    JOIN (VALUES
      ('Exposition Monet',            'Plein tarif', 1800, 1),
      ('Exposition Monet',            'Réduit (étudiants, demandeurs d''emploi)', 1200, 2),
      ('Exposition Monet',            'Moins de 26 ans', 900, 3),
      ('Stand-up « Nouvelles voix »', 'Plein tarif', 2200, 1),
      ('Stand-up « Nouvelles voix »', 'Réduit', 1600, 2),
      ('Soirée jazz intimiste',       'Plein tarif', 2500, 1),
      ('Soirée jazz intimiste',       'Réduit', 1800, 2),
      ('Match de gala',               'Tribune', 3500, 1),
      ('Match de gala',               'Pelouse', 2500, 2),
      ('Match de gala',               'Moins de 12 ans', 1500, 3),
      ('Concert électro « Warehouse »', 'Plein tarif', 4500, 1),
      ('Concert électro « Warehouse »', 'Membre', 3800, 2),
      ('Le Misanthrope',              'Plein tarif', 2800, 1),
      ('Le Misanthrope',              'Réduit', 1900, 2),
      ('Concert de printemps',        'Plein tarif', 3200, 1),
      ('Concert de printemps',        'Réduit', 2400, 2),
      ('Opéra : La Traviata',         'Catégorie 1', 8500, 1),
      ('Opéra : La Traviata',         'Catégorie 2', 5500, 2),
      ('Opéra : La Traviata',         '25 ans et moins', 3000, 3),
      ('Festival ouverture',          'Journée', 4900, 1),
      ('Festival ouverture',          'Prévente', 3900, 2)
    ) AS v(name, label, amount_cents, position) ON e.name = v.name
    WHERE NOT EXISTS (SELECT 1 FROM event_prices)`);

  return result.rowCount ?? 0;
}
