# ADR 0006 : plusieurs tarifs par événement, stockés en centimes

- Statut : accepté
- Date : 2026-11-20

## Contexte

Un événement n'a pas un prix unique : plein tarif, tarif réduit, tarif jeune, catégorie de place… Le catalogue doit afficher « dès X € » (le tarif le plus bas) et la page de détail lister tous les tarifs. À la réservation, l'utilisateur choisit un tarif, et la confirmation (page + e-mail) doit indiquer le prix unitaire et le total (places × prix unitaire).

## Décision

- Table dédiée **`event_prices`** (migration `005`) : `event_id` (FK avec `ON DELETE CASCADE`), `label`, `amount_cents`, `position`. Le montant est un **entier en centimes**, jamais un flottant, avec `CHECK (amount_cents >= 0)`.
- La réservation enregistre le tarif choisi : `reservations.price_id` (FK vers `event_prices`, nullable — un événement sans tarif reste réservable), migration `006`.
- L'API expose `prices[]` sur chaque événement (`GET /events`, `GET /events/:id`) et `price` sur la réservation ; `POST /events/:id/reservations` accepte `priceId` optionnel, validé **dans la transaction** comme appartenant à l'événement (400 sinon).
- Le front affiche « dès X € » sur les cartes, la liste des tarifs sur la page détail, des cartes radio à la réservation, et le tarif + total sur la page de confirmation. La page `/tarifs` documente la politique de prix.

## Alternatives examinées

- **Colonne JSONB `prices` sur `events`** : plus simple à lire, mais aucune intégrité référentielle ni contrainte de domaine sur les montants ; la réservation ne pourrait pas référencer un tarif précis.
- **Un seul prix par événement** (colonne `price_cents`) : insuffisant, un événement a plusieurs catégories de billets.
- **Prix déduit de la catégorie de l'événement** (musique = X €) : trop rigide, les organisateurs fixent librement leurs tarifs par événement.

## Conséquences

- Intégrité portée par la base : montant positif, tarif attaché à un événement, tarif choisi cohérent avec l'événement réservé.
- Les anciennes réservations (avant la migration 006) ont `price_id = NULL` : affichées sans tarif, ce qui reste correct.
- Le seed de démonstration donne 2 à 3 tarifs réalistes à chacun des 9 événements.
- Le paiement réel reste hors périmètre (projet de démonstration) : le « total » est indicatif et affiché tel quel.
