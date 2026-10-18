# Étapes de mise en place – Billetterie sur Azure AKS

Ce guide transforme [l'architecture proposée](../architecture/architecture-proposee.md) en plan d'exécution. L'objectif est de livrer une chaîne complète : un changement part du dépôt, passe les contrôles, est déployé sur staging, puis promu en production sans intervention sur les serveurs.

## Principes de réalisation

- Commencer par une application minimale et fonctionnelle avant d'ajouter les composants de plateforme.
- Utiliser PostgreSQL comme source de vérité pour le stock de places ; Redis ne doit pas décider seul si une réservation est valide.
- Garder staging et production dans deux namespaces du même cluster AKS pour limiter le coût du projet, sauf exigence contraire.
- À chaque étape, définir une preuve observable que le travail est terminé.
- Vérifier les quotas et le coût Azure estimé dans la souscription avant tout `terraform apply`.

## Étape 1 – Cadrer le projet et le dépôt

1. Définir le parcours minimum : consulter les événements, réserver une place, vérifier le stock restant et recevoir une confirmation.
2. Créer le dépôt, protéger `main` et adopter trunk-based development : branches courtes, pull request obligatoire, CI verte avant fusion.
3. Ajouter les fichiers de départ : README, Makefile, `.gitignore`, configuration pre-commit et gitleaks.
4. Rédiger les ADR initiaux : AKS et ArgoCD, PostgreSQL pour l'intégrité des réservations, stratégie de branches et gestion des secrets.
5. Répartir les responsabilités de l'équipe, par exemple application/tests, infrastructure/GitOps et pipeline/observabilité.

**Validation :** un membre de l'équipe peut cloner le dépôt, installer les dépendances et comprendre le périmètre sans explication orale.

## Étape 2 – Construire l'application en local

1. Créer l'API Fastify et le frontend React/Vite.
2. Définir le schéma PostgreSQL et les migrations : événements, capacité, réservations et clé d'idempotence.
3. Implémenter la réservation dans une transaction. Une mise à jour conditionnelle du stock doit refuser atomiquement la réservation si le nombre de places est insuffisant.
4. Créer le worker d'e-mails ; en local, utiliser Mailpit.
5. Ajouter Dockerfiles et Docker Compose pour l'API, le worker, PostgreSQL, Redis et Mailpit.
6. Ajouter les tests unitaires, les tests d'intégration avec Testcontainers et le test de concurrence qui vérifie l'absence de survente.
7. Ajouter les endpoints de santé, les logs structurés et les métriques applicatives.

**Validation :** `make up` démarre l'application localement ; `make test` exécute les suites de tests ; un test concurrent confirme qu'il n'y a jamais plus de réservations que de places disponibles.

## Étape 3 – Mettre en place la CI et la chaîne de sécurité

1. Créer le workflow GitHub Actions déclenché sur pull request et push.
2. Exécuter lint, build, tests unitaires et tests d'intégration.
3. Ajouter gitleaks, SAST (Semgrep ou CodeQL), SCA (Trivy/OSV) et scan des images (Trivy).
4. Faire échouer le pipeline sur une vulnérabilité critique et documenter les exceptions éventuelles.
5. Après validation sur `main`, construire une image et la publier dans GHCR ou Azure Container Registry avec un tag immuable lié au SHA du commit.
6. Activer Dependabot et les règles de protection de branche.

**Validation :** une PR avec un test échoué ou un secret détecté est bloquée ; une fusion valide publie une image identifiable par son SHA.

## Étape 4 – Provisionner Azure avec Terraform

1. Créer le backend d'état Terraform dans Azure Storage et protéger l'accès à l'état.
2. Définir les modules Terraform pour le réseau, AKS, PostgreSQL, Key Vault et Storage Queue.
3. Configurer les identités OIDC entre GitHub Actions et Azure ; attribuer uniquement les rôles nécessaires. Ne pas stocker de secret Azure permanent dans le dépôt.
4. Créer AKS et ses namespaces `staging` et `prod`, puis activer les composants requis : identité workload et KEDA.
5. Installer ArgoCD et enregistrer le dépôt GitOps comme source de configuration. Terraform provisionne l'infrastructure et bootstrap ArgoCD ; ArgoCD gère ensuite les applications du cluster.
6. Séparer `terraform plan` et `terraform apply` dans les workflows et exiger une approbation pour les changements sensibles.
7. Ajouter les tags de coût et un budget Azure avec alertes.

**Validation :** l'infrastructure peut être créée depuis le code avec `terraform apply`, et le plan est consultable dans la CI avant application.

## Étape 5 – Déployer automatiquement sur staging

1. Créer le chart Helm de l'application et les configurations Kustomize pour staging et prod.
2. Ajouter les Applications ArgoCD : plateforme, monitoring et billetterie. Configurer staging avec synchronisation automatique et auto-réparation.
3. Configurer la récupération des secrets depuis Key Vault (External Secrets Operator ou solution choisie dans l'ADR).
4. Après publication de l'image, faire mettre à jour par la CI le tag de l'image dans l'overlay GitOps de staging. ArgoCD détecte le commit et déploie la version.
5. Ajouter les migrations de base de données au déploiement avec une stratégie qui évite les incompatibilités entre versions.
6. Vérifier les probes, les limites CPU/mémoire, l'ingress et TLS.

**Validation :** un commit sur `main` met à jour staging via ArgoCD ; aucune commande `kubectl` manuelle n'est nécessaire pour déployer l'application.

## Étape 6 – Tester staging et la montée en charge

1. Exécuter les tests E2E Playwright contre staging après déploiement.
2. Exécuter le scénario k6 d'ouverture des ventes avec des seuils convenus (latence p95 et taux d'erreur).
3. Exécuter ZAP baseline sur staging et traiter les résultats bloquants.
4. Vérifier l'autoscaling HPA/KEDA et les limites de capacité du cluster pendant le test.
5. Ajouter des alertes sur les erreurs 5xx, la latence p95 et l'accumulation de messages de confirmation.

**Validation :** les workflows échouent si les seuils E2E, de sécurité ou de charge ne sont pas atteints ; les métriques et alertes sont visibles dans Grafana.

## Étape 7 – Promouvoir en production et tester le rollback

1. Après validation de staging, proposer la même image immuable dans l'overlay GitOps de production via une pull request.
2. Exiger l'approbation de l'environnement GitHub ou des reviewers désignés.
3. Laisser ArgoCD synchroniser production et Argo Rollouts effectuer le déploiement canary ou blue/green.
4. Utiliser un `AnalysisTemplate` basé sur Prometheus pour contrôler les erreurs et la latence durant la promotion.
5. Si l'analyse échoue, vérifier le retour automatique à la version précédente. Tester aussi le rollback manuel par `git revert` du changement GitOps.

**Validation :** la production reçoit exactement l'image testée sur staging ; un déploiement dégradé est interrompu et le rollback est démontrable.

## Étape 8 – Finaliser l'exploitation et la démonstration

1. Finaliser README, schémas d'architecture et de pipeline, ADR, runbook et documentation FinOps.
2. Documenter les opérations courantes : démarrer/arrêter AKS et PostgreSQL, consulter les logs, restaurer une version et détruire les ressources.
3. Vérifier les sauvegardes et la procédure de restauration si elles sont incluses dans le périmètre.
4. Répéter le scénario de démonstration sans saisir de commandes pendant le déploiement : commit, tests, sécurité, staging, approbation, production.
5. Préparer un échec contrôlé (test ou scan bloquant) et un rollback à montrer au jury.

**Validation :** un autre groupe peut suivre le README, lancer l'application localement et comprendre comment l'infrastructure est créée, déployée, observée et détruite.

## Planning indicatif sur cinq jours

| Jour | Objectif principal | Livrable vérifiable |
|---|---|---|
| 1 | Application minimale, Docker Compose, tests de réservation, ADR initiaux | Parcours local testé, absence de survente vérifiée |
| 2 | CI, registre, contrôles DevSecOps et security gate | PR bloquée si tests ou contrôles échouent |
| 3 | Terraform, AKS, OIDC, ArgoCD et déploiement staging | Déploiement staging depuis un changement Git |
| 4 | E2E, k6, ZAP, observabilité, promotion et rollback | Tests exécutés sur staging, prod promue via GitOps |
| 5 | Adaptation à la contrainte tirée, documentation et répétition | Démo reproductible de commit jusqu'à la production |

## Ordre de priorité en cas de retard

1. Préserver le socle obligatoire : CI, tests, sécurité, IaC, staging/prod, déploiement automatisé et rollback.
2. Garder l'application fonctionnellement petite ; ne pas ajouter de fonctionnalités métier non nécessaires à la démonstration.
3. Réduire les composants optionnels avant de compromettre la fiabilité : par exemple, commencer sans Redis si son besoin n'est pas démontré, mais conserver PostgreSQL transactionnel.
4. Réserver le multi-région, le WAF payant et les optimisations avancées aux contraintes qui les imposent.
