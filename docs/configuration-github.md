# Configuration GitHub du dépôt

Ces réglages doivent être appliqués sur le dépôt distant par un administrateur GitHub. Les fichiers locaux ne peuvent pas activer une règle de protection sur un dépôt distant qui n'existe pas encore.

## Création du dépôt

1. Créer un dépôt GitHub nommé `billetterie-devops` (ou le nom retenu par l'équipe).
2. Choisir public/privé selon les consignes du cours ; ne pas ajouter de README, `.gitignore` ou licence générés si le dépôt local contient déjà ces fichiers.
3. Ajouter les membres et leur accorder le rôle minimal nécessaire.
4. Depuis ce dossier, initialiser le dépôt local si ce n'est pas déjà fait, puis ajouter le remote et pousser `main` :

```sh
git init -b main
git remote add origin <URL_DU_DEPOT>
git add .
git commit -m "chore: initialize project foundation"
git push -u origin main
```

Si Git est déjà initialisé, ne pas répéter `git init`. Si un remote existe, vérifier son URL avant de la remplacer.

## Règles de protection de `main`

Dans **Settings → Rules → Rulesets** (ou Branch protection rules), créer une règle ciblant `main` :

- Exiger une pull request pour toute modification de `main`.
- Exiger au moins une approbation ; pour un groupe de deux, choisir une revue croisée et documenter toute limite imposée par le cours.
- Exiger la résolution des conversations de revue avant fusion.
- Interdire les pushs directs, les force-pushs et la suppression de `main`.
- Activer les contrôles de statut requis lorsque le workflow CI sera créé (ne pas sélectionner de nom de contrôle inexistant au stade du cadrage).
- Conserver la possibilité d'appliquer les règles aux administrateurs si le plan GitHub le permet.
- Ne pas exiger de déploiement prod pour fusionner une modification applicative.

## Options de fusion

- Utiliser squash merge pour garder un historique `main` lisible, ou choisir une autre stratégie d'équipe et la documenter.
- Désactiver merge commits si l'équipe veut un historique linéaire.
- Supprimer automatiquement les branches de travail après fusion.

## Sécurité du dépôt

- Activer Dependabot alerts et security updates si disponibles.
- Activer la détection et le blocage des secrets GitHub si disponibles pour le dépôt et son plan.
- Protéger les environnements GitHub `staging` et `prod` lorsqu'ils seront créés ; `prod` doit exiger une approbation.
- Ajouter `main` comme branche protégée avant de commencer les travaux applicatifs.

## Vérification

Après configuration, créer une branche de test et vérifier qu'une pull request est nécessaire pour modifier `main`. Une fois la CI ajoutée, vérifier qu'un contrôle en échec bloque bien la fusion. Supprimer la branche de test après validation.
