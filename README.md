# Billetterie - projet DevOps

Projet de mise en application DevOps : une application de réservation de places, livrée par une chaîne automatisée jusqu'à Azure AKS.

## État du dépôt

L'application (API, worker d'e-mails, frontend) et ses tests fonctionnent en local avec Docker Compose. La CI, l'infrastructure Azure (Terraform, AKS) et les manifestes GitOps (ArgoCD) seront ajoutés dans les étapes suivantes : les dossiers `infra/`, `gitops/`, `observability/` et `.github/workflows/` sont prévus mais encore vides.

## Objectif fonctionnel

Un utilisateur peut consulter les événements disponibles, réserver une ou plusieurs places, recevoir une confirmation et constater le stock restant. Une réservation ne doit jamais dépasser la capacité définie, même en cas de requêtes simultanées ou de répétition d'une requête.

## Documentation

- [Charte projet et périmètre](docs/charte-projet.md)
- [Organisation et responsabilités de l'équipe](docs/organisation-equipe.md)
- [Configuration des règles GitHub](docs/configuration-github.md)
- [Architecture proposée](docs/architecture/architecture-proposee.md)
- [Étapes de mise en place](docs/implementation/etapes-mise-en-place.md)
- [Estimation et optimisation des coûts Azure](docs/finops/finops.md)
- [Cahier des charges fourni](docs/reference/cahier-des-charges.md)
- [Décisions d'architecture (ADR)](docs/adr/)

## Lancer l'application en local

Prérequis : Docker (avec le plugin Compose) et GNU Make. Node.js 22 ou plus n'est nécessaire que pour lancer les tests hors Docker.

```sh
make up
```

La commande crée `.env` depuis `.env.example` si besoin, construit les images, applique les migrations, crée trois événements de démonstration et attend que tous les services soient sains. Ensuite :

| Service | Adresse | Rôle |
| --- | --- | --- |
| Application web | http://localhost:8080 | Catalogue et réservation |
| Mailpit | http://localhost:8025 | Boîte de réception des e-mails de confirmation |
| API | http://localhost:3000 | Accès direct, utile pour `curl` et les métriques |

Pour arrêter : `make down` (données conservées) ou `make clean` (données supprimées).

### Parcours de démonstration

1. Ouvrir http://localhost:8080 et réserver des places pour un événement.
2. Ouvrir http://localhost:8025 : l'e-mail de confirmation y apparaît en quelques secondes.
3. Réserver toutes les places de l'événement « Dernières places » : il passe en « Complet ».

## Composants

| Dossier | Contenu |
| --- | --- |
| `apps/api` | API Fastify (TypeScript) + PostgreSQL : catalogue, réservations, sondes de santé, métriques Prometheus |
| `apps/worker` | Worker qui envoie les e-mails de confirmation depuis la boîte d'envoi PostgreSQL |
| `apps/web` | Interface React + Vite, servie par nginx qui relaie `/api` vers l'API |

### API

| Méthode et chemin | Réponses | Description |
| --- | --- | --- |
| `GET /events` | 200 | Événements à venir avec places restantes |
| `GET /events/:id` | 200, 404 | Détail d'un événement |
| `POST /events/:id/reservations` | 201, 200 (rejeu), 400, 404, 409, 422, 429 | Réserve des places ; en-tête `Idempotency-Key` obligatoire |
| `GET /health/live` | 200 | Le processus répond (sonde liveness) |
| `GET /health/ready` | 200, 503 | La base répond (sonde readiness) |
| `GET /metrics` | 200 | Métriques Prometheus |

Exemple :

```sh
curl -X POST http://localhost:8080/api/events/1/reservations \
  -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"customerName":"Ada","customerEmail":"ada@example.com","seats":2}'
```

Rejouer la même requête avec la même clé renvoie `200` et la réservation d'origine, sans consommer de place supplémentaire. Le choix de PostgreSQL comme source de vérité est expliqué dans l'[ADR 0003](docs/adr/0003-postgresql-source-de-verite.md), celui de la boîte d'envoi dans l'[ADR 0005](docs/adr/0005-outbox-transactionnelle-pour-les-emails.md).

## Tests

```sh
make install           # installe les dépendances (npm ci)
make typecheck         # vérification des types
make test-unit         # tests unitaires, sans Docker
make test-integration  # tests d'intégration contre un vrai PostgreSQL (Docker requis)
make test              # les deux
```

Les tests d'intégration démarrent un PostgreSQL jetable avec Testcontainers ; le premier lancement télécharge l'image et peut prendre une minute. Ils couvrent notamment la concurrence : 50 demandes simultanées pour 10 places ne produisent jamais plus de 10 réservations.

## Conventions de contribution

- La branche principale est `main` ; les branches de travail sont courtes et dédiées à un sujet.
- Toute modification passe par une pull request. La fusion directe dans `main` est interdite.
- Les commits doivent être petits et explicites. Préfixes suggérés : `feat:`, `fix:`, `test:`, `docs:`, `build:` et `ci:`.
- Aucun secret, fichier d'environnement réel, état Terraform ou donnée personnelle ne doit être commité.
- Chaque pull request doit être relue et ses contrôles automatisés doivent réussir.

## Démarrage du dépôt

Prérequis : Git, GNU Make et Python 3. Le paquet `pre-commit` doit être installé, par exemple avec `pipx install pre-commit`.

Dans un clone du dépôt :

```sh
make hooks-install
make check
```

`make hooks-install` installe les hooks Git locaux. `make check` exécute les contrôles pre-commit sur les fichiers du dépôt. Gitleaks est exécuté avant chaque commit sur les fichiers indexés.

Pour initialiser un nouveau clone local avant la création du dépôt distant :

```sh
git init -b main
make hooks-install
```

Ne configurez le remote `origin` et ne poussez qu'après création du dépôt GitHub et application des réglages décrits dans [Configuration GitHub](docs/configuration-github.md).

## Commandes Make

`make help` liste toutes les commandes. Les principales : `up`, `down`, `clean`, `logs`, `ps`, `install`, `typecheck`, `test-unit`, `test-integration`, `test`, `hooks-install` et `check`.

Les commandes de déploiement (`deploy`, `destroy` de l'infrastructure) seront ajoutées avec Terraform ; elles ne sont volontairement pas simulées à ce stade.

## Structure

L'arborescence cible complète est décrite dans [l'architecture proposée](docs/architecture/architecture-proposee.md). Prochaines étapes : la CI, puis Terraform, AKS, ArgoCD et enfin la promotion staging/production.

## Sécurité et données

- Utiliser des données fictives uniquement.
- Les secrets locaux restent dans des fichiers `.env` ignorés par Git ; seuls des exemples sans valeur sensible pourront être ajoutés sous forme `.env.example`.
- Les secrets Azure et applicatifs seront fournis par OIDC et Key Vault, jamais par des valeurs en clair dans le dépôt.
- Signaler immédiatement à l'équipe toute fuite potentielle et révoquer le secret concerné.
