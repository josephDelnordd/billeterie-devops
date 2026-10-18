# ADR 0004 : gestion des secrets et identités

- Statut : accepté
- Date : 2026-10-18

## Contexte

Le dépôt, les images et les journaux de CI sont accessibles à plusieurs membres et peuvent être conservés longtemps. Des secrets statiques dans le code ou dans des fichiers de configuration versionnés seraient faciles à exposer.

## Décision

- Aucun secret réel n'est versionné ni inclus dans une image de conteneur.
- Les développeurs utilisent des fichiers `.env` locaux ignorés par Git et un `.env.example` ne contenant que des noms de variables et des valeurs factices.
- Gitleaks est exécuté en hook pre-commit ; une détection impose la révocation du secret, même si le commit est annulé.
- GitHub Actions accède à Azure avec OIDC plutôt qu'avec un secret de service principal à longue durée de vie.
- Les secrets runtime Azure sont stockés dans Key Vault et fournis au workload par une identité de charge de travail et un mécanisme Kubernetes dédié.

## Alternatives examinées

- Variables sensibles commitées dans les manifestes : rejetées, elles sont visibles dans l'historique Git.
- Secrets GitHub statiques pour l'accès Azure : rejetés comme mécanisme par défaut, car ils nécessitent rotation et stockage d'identifiants longue durée.
- Sealed Secrets : alternative possible si l'accès direct à Key Vault n'est pas retenu ; décision à préciser lors de l'implémentation.

## Conséquences

- Le setup local doit documenter les variables nécessaires sans leurs valeurs réelles.
- Les permissions OIDC et Key Vault doivent appliquer le moindre privilège.
- Gitleaks n'est pas un substitut à la révocation et la rotation d'un secret qui a été exposé.
