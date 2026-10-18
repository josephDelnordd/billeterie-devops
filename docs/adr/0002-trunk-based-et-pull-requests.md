# ADR 0002 : trunk-based development et pull requests

- Statut : accepté
- Date : 2026-10-18

## Contexte

Le projet est limité à cinq jours. Les branches longues et les intégrations tardives augmentent les conflits et retardent la démonstration de la chaîne de livraison.

## Décision

Utiliser trunk-based development : `main` reste intégrable, les branches sont courtes, chaque modification passe par une pull request et la fusion est bloquée si les contrôles requis échouent. Les déploiements staging et production seront ensuite pilotés par les changements GitOps.

## Alternatives examinées

- Git Flow : ajoute plusieurs branches durables et des étapes de fusion peu adaptées à un projet court.
- Push direct sur `main` : rapide au départ, mais ne permet ni revue obligatoire ni contrôle préalable.

## Conséquences

- Le dépôt GitHub doit interdire les pushs directs sur `main`.
- Les contrôles de statut seront rendus obligatoires dès que la CI existe.
- Les fonctionnalités sont découpées en changements fusionnables rapidement ; les fonctionnalités incomplètes peuvent rester désactivées.
- Une pull request doit rester petite et contenir son contexte et ses validations.