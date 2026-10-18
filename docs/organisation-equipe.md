# Organisation de l'équipe

Compléter les noms et coordonnées internes en équipe. Ne pas publier d'informations personnelles qui ne sont pas nécessaires au projet.

## Responsabilités

| Domaine | Responsable | Responsabilités principales |
|---|---|---|
| Application et données | À compléter | API, règles métier, schéma et migrations PostgreSQL, tests de réservation et concurrence |
| Frontend et parcours utilisateur | À compléter | Interface de consultation/réservation, tests E2E et accessibilité de base |
| Infrastructure et GitOps | À compléter | Terraform, AKS, Helm/Kustomize, ArgoCD, secrets et rollback |
| CI, sécurité et observabilité | À compléter | GitHub Actions, scans, security gate, métriques, logs, dashboard et alertes |
| Coordination et soutenance | À compléter | Suivi des cinq jours, documentation, ADR, répétition de démonstration |

Dans une petite équipe, une personne peut couvrir plusieurs domaines. Chaque composant doit néanmoins avoir un titulaire principal et un relecteur différent si l'effectif le permet.

## Rituels et collaboration

- Au début de chaque séance : choisir un objectif démontrable et répartir les tâches.
- Les changements passent par des pull requests courtes, avec contexte, vérifications et risques explicités dans le modèle fourni.
- Les décisions qui changent l'architecture, le coût ou la sécurité sont ajoutées sous forme d'ADR.
- À la fin de chaque séance : mettre à jour l'état des tâches, noter les blocages et préparer la prochaine démonstration.
- Les secrets et identifiants ne sont jamais partagés dans le dépôt, les issues ou les journaux de CI.

## Responsabilité partagée

Chaque membre doit pouvoir expliquer le parcours complet commit → CI → staging → promotion → production et le rollback. Les rôles répartissent le travail, ils ne créent pas de dépendance à une personne unique.

## Registre des tâches de cadrage

| Tâche | Responsable | État |
|---|---|---|
| Confirmer le périmètre fonctionnel de la charte | Équipe | À faire |
| Renseigner les responsables ci-dessus | Équipe | À faire |
| Créer le dépôt GitHub et ajouter les membres | Responsable dépôt | À faire |
| Appliquer les règles de protection de `main` | Responsable dépôt | À faire |
| Installer les hooks et vérifier `make check` | Chaque membre | À faire |
| Relire et accepter les ADR initiaux | Équipe | À faire |
