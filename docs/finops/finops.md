# FinOps – Coût Azure et optimisation (Billetterie)

> Ordres de grandeur en pay-as-you-go (régions `francecentral` ou `westeurope`). À vérifier dans le [calculateur de prix Azure](https://azure.microsoft.com/pricing/calculator/) avant de s'engager.
> Hypothèse : 1 cluster AKS, 2 namespaces (staging, prod), 1 nœud `B2ms` (2 vCPU, 8 Go). Le `B2s` (4 Go) est probablement trop juste pour ArgoCD, Prometheus, Redis et l'API.

## 1. Coût estimé (environnement allumé en continu)

| Poste | Estimation mensuelle |
|---|---|
| AKS, control plane tier Free | 0 € |
| 1 nœud `B2ms` | environ 55 à 60 € |
| Load Balancer Standard et IP publique (créés par l'ingress) | environ 20 € |
| PostgreSQL Flexible B1ms et 32 Go de stockage | environ 15 à 18 € |
| Disque OS du nœud | environ 5 à 10 € |
| ACR Basic (0 € avec GHCR) | environ 5 € |
| Static Web Apps (Free), Key Vault, Storage Queue, état Terraform | moins de 2 € |
| Azure Communication Services Email | quelques centimes |
| **Total** | **environ 100 à 120 €/mois** |

- Deux clusters (un par environnement) doubleraient le coût.
- Sur un projet de 5 à 10 jours, avec arrêt hors des sessions de travail : **environ 20 à 40 € au total**.

## 2. Leviers d'optimisation

| # | Levier | Détail |
|---|---|---|
| 1 | Crédits gratuits | Azure for Students (100 $, sans carte), compte gratuit (200 $ pendant 30 jours), PostgreSQL B1ms gratuit 12 mois sur un compte neuf |
| 2 | Extinction hors usage | `az aks stop` (coupe le coût du nœud), `az postgres flexible-server stop` (redémarre seul après 7 jours), workflow GitHub Actions planifié, `terraform destroy` en fin de journée |
| 3 | Un seul cluster, un seul nœud | Deux namespaces, tier Free, autoscaler 1 à 3 nœuds : les nœuds supplémentaires n'existent que pendant le test de charge k6 |
| 4 | Spot | Node pool Spot (environ 70 à 90 % moins cher) pour staging et tests k6 ; le pool système reste en nœud classique |
| 5 | Coûts cachés | Un seul ingress (un seul Load Balancer) ; pas de Container Insights ni de Log Analytics (facturés au Go ingéré), Prometheus et Loki en cluster ; disque OS de 32 Go ; GHCR au lieu d'ACR |
| 6 | Charge limitée | Test k6 depuis GitHub Actions sur un pic court (1 à 2 minutes), pas de charge continue |
| 7 | Garde-fous | Budget Azure avec alertes à 50 et 80 % (`azurerm_consumption_budget`), tags `env`, `owner`, `ttl` sur chaque ressource |
| 8 | Documentation | Chiffrer les arbitrages dans ce fichier (point évalué pour la contrainte « budget quasi nul ») |

## 3. Variante la plus économe

Si la contrainte tirée est le **budget quasi nul** :

- **AKS arrêté hors démo** (`az aks stop`), ou
- **k3s sur une seule VM `B2s`** (environ 30 €/mois en continu), avec ArgoCD inchangé. Cette variante est à justifier dans un ADR.

## 4. Automatisation proposée

- `infra/modules/budget/` : budget Azure et alertes en Terraform.
- `.github/workflows/destroy.yml` : extinction planifiée (soir et week-end) de staging.
- `scripts/` : `aks-stop.sh` / `aks-start.sh` pour la démo.
- Tags Terraform obligatoires (`env`, `owner`, `ttl`) via une variable commune.

## 5. À mesurer et présenter à la soutenance

- Coût réel (Azure Cost Management) sur la durée du projet, comparé à l'estimation.
- Coût d'un environnement recréé de zéro (`terraform apply`) et durée de recréation.
- Ce qui a été abandonné pour des raisons de coût (deuxième cluster, WAF, multi-région, Container Insights).
