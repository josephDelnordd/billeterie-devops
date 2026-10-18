# Billetterie - projet DevOps

Projet de mise en application DevOps : une application de réservation de places, livrée par une chaîne automatisée jusqu'à Azure AKS.

## État du dépôt

Ce dépôt est actuellement au stade du cadrage et de l'initialisation. Le périmètre fonctionnel, les décisions techniques initiales, les conventions Git et les contrôles locaux sont documentés. L'application, la CI, l'infrastructure Azure et les manifestes GitOps seront ajoutés dans les étapes suivantes.

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

```sh
make help          # affiche les commandes disponibles
make hooks-install # installe les hooks pre-commit dans .git/hooks
make check         # lance les vérifications configurées
```

Les commandes d'application (`up`, `test`, `deploy`, `destroy`) seront ajoutées lorsque leurs fichiers et services existeront ; elles ne sont volontairement pas simulées à ce stade.

## Structure attendue

L'arborescence cible est décrite dans [l'architecture proposée](docs/architecture/architecture-proposee.md). Le développement commencera par l'application et ses tests locaux, puis la CI, Terraform, AKS, ArgoCD et enfin la promotion staging/production.

## Sécurité et données

- Utiliser des données fictives uniquement.
- Les secrets locaux restent dans des fichiers `.env` ignorés par Git ; seuls des exemples sans valeur sensible pourront être ajoutés sous forme `.env.example`.
- Les secrets Azure et applicatifs seront fournis par OIDC et Key Vault, jamais par des valeurs en clair dans le dépôt.
- Signaler immédiatement à l'équipe toute fuite potentielle et révoquer le secret concerné.