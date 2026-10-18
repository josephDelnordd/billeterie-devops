# ADR 0003 : PostgreSQL comme source de vérité des réservations

- Statut : accepté
- Date : 2026-10-18

## Contexte

Plusieurs utilisateurs peuvent réserver simultanément les dernières places d'un événement. Le stock doit rester cohérent et une reprise de requête ne doit pas créer de réservation en double.

## Décision

PostgreSQL est la source de vérité pour les réservations et le stock. La validation du stock et sa décrémentation sont effectuées atomiquement dans une transaction (mise à jour conditionnelle ou verrouillage de ligne). Les requêtes de réservation utilisent une clé d'idempotence persistée avec une contrainte d'unicité.

Redis est facultatif et réservé au cache, au rate limiting ou à une salle d'attente ; une valeur de compteur Redis seule ne peut pas confirmer une réservation.

## Alternatives examinées

- Verrou Redis comme garantie primaire : un verrou distribué ajoute des cas de panne et n'offre pas la même cohérence durable que la transaction qui enregistre la réservation.
- Décrément applicatif sans transaction : deux requêtes concurrentes peuvent dépasser le stock disponible.

## Conséquences

- Les tests d'intégration doivent utiliser un vrai PostgreSQL et inclure un scénario concurrent.
- La logique métier doit définir clairement la durée d'un éventuel hold et sa libération.
- Les migrations doivent être compatibles avec le déploiement progressif, ou le déploiement doit arrêter le trafic pendant une migration incompatible.