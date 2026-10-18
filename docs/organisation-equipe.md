# Organisation de l'équipe

Compléter les noms et coordonnées internes en équipe. Ne pas publier d'informations personnelles qui ne sont pas nécessaires au projet.

## Répartition à trois

Remplacer les libellés « Membre 1/2/3 » par les noms de l'équipe.

| Membre | Responsabilité principale | Responsabilité secondaire |
| --- | --- | --- |
| Membre 1 - à renseigner | Application : API, règles métier, schéma/migrations PostgreSQL et intégrité des réservations | Frontend React et tests unitaires/intégration de l'application |
| Membre 2 - à renseigner | Infrastructure/GitOps : Terraform, AKS, Helm/Kustomize, ArgoCD, secrets et rollback | Déploiement staging/prod et documentation d'architecture |
| Membre 3 - à renseigner | CI/DevSecOps : workflows GitHub Actions, scans, security gate et registre d'images | Observabilité, tests E2E/k6/ZAP, coordination et soutenance |

La répartition désigne un pilote, pas une propriété exclusive : les changements importants sont relus par un autre membre. Chaque personne doit contribuer à la démonstration et connaître le parcours commit → production.

### Relecture croisée

| Auteur | Relecteur principal suggéré |
| --- | --- |
| Membre 1 | Membre 2 |
| Membre 2 | Membre 3 |
| Membre 3 | Membre 1 |

Pour une pull request qui touche plusieurs domaines, demander si possible une seconde revue ciblée. Aucun auteur ne valide sa propre pull request.

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
| --- | --- | --- |
| Confirmer le périmètre fonctionnel de la charte | Équipe | À faire |
| Renseigner les responsables ci-dessus | Équipe | À faire |
| Ajouter les deux autres membres au dépôt GitHub | Membre 3 - à renseigner | À vérifier |
| Appliquer les règles de protection de `main` | Membre 3 - à renseigner | À faire |
| Installer les hooks et vérifier `make check` | Chaque membre | À faire |
| Relire et accepter les ADR initiaux | Équipe | À faire |
