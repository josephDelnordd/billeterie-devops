# Charte projet - Billetterie

## Contexte

Le projet met en pratique une chaîne DevOps complète autour d'une application simple de réservation. La valeur évaluée est principalement la capacité à construire, tester, sécuriser, déployer et observer l'application sans intervention manuelle sur les serveurs.

## Objectif

À partir d'un commit fusionné, le système doit construire une version identifiable, exécuter les contrôles requis, déployer sur staging, permettre une promotion contrôlée en production et offrir un rollback démontrable.

## Utilisateurs et parcours cible

1. L'utilisateur consulte les événements et leur disponibilité.
2. Il demande une réservation d'un nombre donné de places.
3. Le système confirme ou refuse atomiquement la réservation selon le stock disponible.
4. Le système envoie une confirmation par e-mail après acceptation.

Un back-office minimal pourra créer et modifier des événements si le temps le permet, mais il ne fait pas partie du parcours critique initial.

## Règles métier initiales

- Une réservation porte sur un événement, un nombre strictement positif de places et une identité de réservation.
- La capacité disponible ne peut jamais devenir négative.
- La source de vérité du stock est PostgreSQL ; Redis peut servir au cache ou à la limitation de débit, mais ne garantit pas l'intégrité métier.
- Une clé d'idempotence empêche la création de réservations dupliquées lors d'une nouvelle tentative de la même requête.
- Les e-mails sont asynchrones et ne doivent pas annuler une réservation déjà validée.
- Les environnements de développement et de test utilisent uniquement des données fictives.

## Périmètre

### Inclus

- Catalogue d'événements et disponibilité.
- Création et confirmation de réservations.
- Gestion transactionnelle du stock et idempotence.
- Notification e-mail simulable localement.
- Tests unitaires, d'intégration, E2E et de charge.
- CI avec contrôles DevSecOps, registre d'images, IaC Terraform, AKS, ArgoCD, staging, production et rollback.
- Métriques, logs, tableau de bord, alerte, documentation et ADR.

### Hors périmètre initial

- Paiement réel, remboursement et traitement de données bancaires.
- Application mobile native.
- Haute disponibilité de niveau production ou SLA 99,999 % sans contrainte qui l'impose.
- Déploiement multi-région par défaut.
- Données réelles d'utilisateurs ou d'événements.

## Critères d'acceptation fonctionnels

- Le catalogue affiche les événements et le nombre de places disponibles.
- Une réservation valide diminue le stock une seule fois.
- Une réservation concurrente ne provoque jamais de survente.
- Une demande invalide ou sans stock suffisant est refusée proprement.
- Une répétition avec la même clé d'idempotence ne crée pas de réservation supplémentaire.
- La confirmation est mise en file et peut être envoyée par le worker.

## Critères d'acceptation DevOps

- Les changements passent par une pull request vers `main`.
- Un hook local détecte les secrets avant commit et les contrôles CI seront obligatoires avant fusion.
- Build, tests unitaires, intégration et E2E sont automatisés.
- Les images sont versionnées de façon immuable et scannées.
- L'infrastructure est décrite en Terraform et les déploiements Kubernetes sont déclaratifs dans Git.
- Staging et production utilisent le même artefact ; la promotion en production est contrôlée.
- Un rollback est testé, et les métriques, logs, dashboard et alerte sont présentables.
- Un nouvel équipier peut lancer l'application locale en suivant le README.

## Hypothèses et points à confirmer par l'équipe

- Le dépôt GitHub sera privé ou public selon les consignes du cours.
- La souscription Azure dispose des quotas AKS, PostgreSQL et réseau nécessaires.
- Le budget et la contrainte imposée par le professeur peuvent modifier les choix d'hébergement.
- Le partage staging/production dans un cluster unique est un compromis pédagogique et économique, pas une isolation de sécurité forte.
- Les noms des membres, le responsable de chaque domaine et les créneaux de disponibilité doivent être renseignés dans `docs/organisation-equipe.md`.

## Définition de « terminé » pour l'étape de cadrage

- Le dépôt est initialisé sur `main` et son remote GitHub est créé.
- Les conventions de contribution et règles de protection de branche sont appliquées.
- Les hooks locaux fonctionnent et les ADR initiaux sont relus par l'équipe.
- Chaque responsabilité a un titulaire et le périmètre ci-dessus est accepté.
