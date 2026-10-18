# ADR 0001 : AKS et ArgoCD pour le déploiement

- Statut : accepté pour le cadrage, à confirmer après vérification du budget et des quotas Azure
- Date : 2026-10-18

## Contexte

Le projet doit présenter un déploiement automatisé, reproductible et observable. ArgoCD est retenu pour le modèle GitOps, mais il nécessite une API Kubernetes. Les services PaaS de conteneurs sans API Kubernetes ne permettent pas d'y installer ArgoCD.

## Décision

Utiliser Azure Kubernetes Service (AKS) comme cible cloud et ArgoCD comme contrôleur GitOps. Décrire l'infrastructure Azure avec Terraform et les charges de travail avec Helm/Kustomize. Pour maîtriser le coût pédagogique, démarrer avec un cluster et séparer staging/prod en namespaces, si la contrainte et le niveau d'isolation attendu le permettent.

## Alternatives examinées

- Azure Container Apps : moins de charge opérationnelle, mais ne fournit pas de cluster Kubernetes pour ArgoCD.
- Kubernetes local/k3s : moins cher pour une démonstration locale ou on-premise, mais ne répond pas à l'objectif d'utiliser Azure comme plateforme principale.
- AKS multi-cluster : meilleure séparation d'environnements, mais coût et temps d'exploitation plus élevés.

## Conséquences

- ArgoCD peut suivre l'état désiré versionné dans Git et détecter une dérive.
- L'équipe doit apprendre et exploiter Kubernetes, les charts Helm, les ressources et les mises à jour du cluster.
- Le tier Free du plan de contrôle ne rend pas les nœuds, disques, adresses IP, load balancers, réseau ou stockage gratuits.
- Un cluster partagé avec namespaces n'offre pas une isolation de sécurité équivalente à deux clusters.
- La capacité du nœud choisi doit être testée avec ArgoCD, Prometheus/Grafana, Redis et l'application ; le coût réel doit être mesuré avant la soutenance.
- Si le budget ou la contrainte tirée rend AKS inadapté, réviser cette décision et documenter une variante k3s.