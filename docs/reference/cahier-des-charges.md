# Mise en Application DevOps

## Description du projet

Vous avez 5 jours pour construire une chaîne DevOps complète autour de votre thématique et de vos 2 contraintes. Le jour 5, vous lancez le déploiement, et c'est la machine qui fait tout le travail.

## L'esprit du projet

### La règle d'or

> Si vous le faites deux fois à la main, c'est que vous auriez dû le scripter la première fois.

Vous scriptez, vous préparez, vous configurez. Le dernier jour, vous poussez un commit, vous prenez votre café, et vous regardez la machine construire, tester, sécuriser et déployer votre application toute seule.

### L'application elle-même n'est pas le sujet

Une appli simple, voire une appli open source existante, suffit largement.

Ce qui est évalué, c'est tout ce qu'il y a autour : la chaîne qui l'amène du commit à la production sans qu'aucun humain ne touche un serveur.

### Votre thématique et vos 2 contraintes ne sont pas décoratives

Elles doivent se voir dans vos choix : une contrainte « budget quasi nul » qui finit sur 6 VMs surdimensionnées, ça va se remarquer.

---

## Liberté technologique

**Aucune technologie n'est imposée :** Kubernetes, Docker Swarm, Nomad, des VMs avec Ansible, du serverless : c'est vous qui choisissez.

Pareil pour la CI, l'IaC, le monitoring et tout le reste.

### La contrepartie

Chaque choix doit être justifié au regard de votre thématique et de vos contraintes.

> « On a pris Kubernetes parce que c'est à la mode » n'est pas une justification.

> « On a pris Docker Compose parce qu'on est une équipe de 2 devs sans admin sys et qu'on vise un MVP » en est une.

Prenez le temps de documenter vos arbitrages au fil de l'eau (un fichier ADR par décision suffit). Ils serviront directement pour la soutenance.

---

# Le cahier des charges

Ce socle est obligatoire pour tous les groupes, quelle que soit la taille. Les groupes de 2 ou 3 vont plus loin sur les points liés à leurs contraintes.

## Code et collaboration

- Stratégie de branches définie (Git Flow, trunk-based…) et respectée
- Merge uniquement via pull/merge request, avec la CI au vert
- Hook pre-commit de détection de secrets

## Intégration continue

- Build automatique à chaque push
- Tests unitaires
- Tests d'intégration
- Tests end-to-end
- Artefacts versionnés et poussés dans un registre

## DevSecOps

- SAST (analyse statique du code)
- SCA (scan des dépendances)
- Scan des images conteneurs (si conteneurs)
- Aucun secret en clair dans le dépôt
- Security gate : le pipeline échoue sur une vulnérabilité critique

## Infrastructure et déploiement

- Infrastructure as Code : on peut tout détruire et tout recréer avec une commande
- Au moins 2 environnements (ex. staging + production), déployés par le même code
- Déploiement 100 % automatisé, sans connexion SSH manuelle
- Promotion d'un environnement à l'autre maîtrisée (validation, tag, approbation…)
- Rollback testé et démontrable

## Exploitation

- Collecte de métriques et de logs
- Au moins un tableau de bord et une alerte qui a du sens pour votre contexte

## Documentation

- README qui permet à un inconnu de tout lancer
- Choix techniques justifiés (ADR)
- Schéma d'architecture et du pipeline

---

# Présentation

Chaque groupe dispose de 30 minutes, en trois temps.

## 1. Présentation (10 min)

Votre contexte (thématique + contraintes), votre architecture, votre pipeline et surtout vos choix justifiés.

Parlez aussi de ce que vous avez abandonné et pourquoi.

## 2. Démo en direct (10 min max)

Un changement de code part d'un commit et arrive en production sans aucune intervention manuelle.

Il passe par :

- les tests ;
- les contrôles de sécurité ;
- les environnements.

**Bonus** si vous montrez aussi :

- un échec maîtrisé (un test ou une faille qui bloque le pipeline) ;
- un rollback.

## 3. Questions (10 min)

Questions des autres étudiants.

> Pendant la démo, vos mains doivent rester loin du clavier.
>
> Si vous devez taper une commande pour débloquer quelque chose, c'est que ce n'est pas encore automatisé.

☕️ Un café offert à tous les membres des groupes pour lesquels ça fonctionne.

---

# L'évaluation

## Note de groupe

| Critère | Points |
|----------|----------|
| Démo : déploiement réellement 100 % automatisé | 5 |
| Justification des choix au regard de la thématique et des contraintes | 4 |
| Tests (unitaires, intégration, e2e) et qualité du pipeline | 3 |
| DevSecOps | 3 |
| Multi-environnements, IaC et rollback | 3 |
| Observabilité et documentation | 2 |
| **Total** | **20** |

## Ajustement individuel : l'écoute active

Une soutenance, ça s'écoute.

Je compte les questions que chacun pose pendant les Q/R des **autres groupes**, sur l'ensemble de la journée.

| Questions pertinentes posées | Ajustement |
|-----------------------------|------------|
| 0 | −3 points |
| 1 ou 2 | 0 |
| 3 ou 4 | +1 point |
| 5 et plus | +2 points (plafond) |

Une question pertinente porte sur un choix, un compromis ou un risque du projet présenté.

❌ « C'est quoi votre logo ? » ne compte pas.

✅ « Pourquoi Swarm plutôt que Kubernetes avec une contrainte de 99,999 % ? » compte.

---

# Les livrables

Avant la soutenance du dernier jour, le ou les dépôts Git doivent être rendus et contenir :

1. Le code de l'application et ses tests
2. Les définitions de pipeline (CI/CD)
3. Tout le code d'infrastructure et de configuration (IaC, manifestes, playbooks…)
4. Un README : contexte, architecture, comment tout lancer de zéro
5. Les ADR qui justifient vos choix
6. Le support de présentation

### Un bon test final

> Un autre groupe clone votre dépôt, suit votre README, et obtient un environnement qui tourne sans vous poser une seule question.

---

# Contraintes

| # | Contrainte | Ce qu'elle oblige à automatiser ou justifier |
|---|------------|----------------------------------------------|
| 1 | Montée en charge imprévisible (pics de trafic soudains) | Mise à l'échelle automatique, tests de charge en CI, cache |
| 2 | Équipe composée uniquement de développeurs | Services managés, PaaS, infrastructure entièrement en code, documentation |
| 3 | Disponibilité critique (99,999 % d'uptime) | Redondance, déploiement sans coupure, health checks, rollback automatique |
| 4 | Budget de démarrage quasi nul (bootstrapped) | Offres gratuites, open source, maîtrise des coûts (FinOps) |
| 5 | Time-to-Market ultra-rapide (MVP) | Pipeline minimal mais complet, priorisation, feature flags |
| 6 | Latence ultra-faible requise au niveau mondial | CDN, multi-région, mesure de la latence |
| 7 | Interopérabilité avec des systèmes legacy (mainframes, vieux SQL) | Couche d'adaptation, tests d'intégration, environnement legacy simulé |
| 8 | Conformité réglementaire stricte (RGPD, HDS, DSP2) | Policy as Code, chiffrement, journaux d'audit, conservation des données |
| 9 | Anonymisation totale des données utilisateurs | Pseudonymisation dans le pipeline, données de test synthétiques, zéro donnée personnelle dans les logs |
| 10 | Souveraineté des données (France/Europe uniquement) | Choix de régions et d'hébergeurs, vérification de la localisation en Policy as Code |
| 11 | Indépendance vis-à-vis du fournisseur cloud (multi-cloud) | Terraform multi-provider, conteneurs portables, pas de service propriétaire |
| 12 | Infrastructure on-premise imposée (pas de cloud public) | Ansible, provisionnement des VMs, gestion de son propre registre et de sa supervision |
| 13 | Plusieurs mises en production par jour | Pipeline rapide, déploiement canary ou blue/green, tests fiables |
| 14 | Empreinte carbone minimale (Green IT) | Mesure de la consommation, extinction automatique des environnements hors production, images légères |
| 15 | Fonctionnement hors-ligne ou connectivité intermittente (edge) | Déploiement sur des nœuds distants, synchronisation, mises à jour à distance |
| 16 | Cible privilégiée de cyberattaques | SAST, DAST, scan d'images, WAF, durcissement, gestion des incidents |
| 17 | Multi-tenant (clients B2B isolés, marque blanche) | Isolation par client, déploiement paramétré par client, quotas |
| 18 | Volumes de données massifs | Stockage objet, sauvegarde et restauration automatisées, gestion du cycle de vie des données |
| 19 | Équipe distribuée sur plusieurs fuseaux horaires | Revue asynchrone, ChatOps, runbooks, astreinte et alerting |
| 20 | Fort turnover (intégrer un nouveau membre en moins d'une journée) | Environnement de dev reproductible (devcontainer), README et ADR, tout est scripté |

---

# Thématiques

## 1. 🛒 Site e-commerce

### Fonctionnel

- catalogue
- panier
- commandes
- paiement simulé
- back-office

### Enjeux DevOps

- migrations de base de données automatisées
- gestion des secrets (clés de paiement, identifiants de la base)
- déploiement sans coupure (blue/green)

### Angle DevSecOps

- OWASP Top 10 (injection, broken access control, failles d'authentification)

---

## 2. 💬 Réseau social

### Fonctionnel

- profils
- publications
- fil d'actualité
- likes et commentaires
- notifications

### Enjeux DevOps

- cache (Redis)
- stockage des images envoyées
- notifications asynchrones via une file de messages

### Angle DevSecOps

- données personnelles (RGPD)
- contrôle d'accès entre utilisateurs
- limitation du nombre de requêtes (rate limiting)

---

## 3. 🎬 Plateforme de diffusion vidéo

### Fonctionnel

- upload
- transcodage
- catalogue
- lecture en streaming (HLS)

### Enjeux DevOps

- workers de transcodage asynchrones (ffmpeg)
- stockage objet (Azure Blob ou MinIO)
- supervision des files d'attente et de la charge CPU

### Angle DevSecOps

- validation des fichiers envoyés
- URLs signées
- isolation des workers

---

## 4. 🎟️ Billetterie / réservation

### Fonctionnel

- événements ou créneaux
- réservation
- gestion des places restantes
- confirmation par e-mail

### Enjeux DevOps

- pics de charge à l'ouverture des ventes
- tests de charge automatisés en CI (k6, JMeter)
- mise à l'échelle

### Angle DevSecOps

- protection contre les bots
- intégrité des réservations

---

## 5. 🎓 Plateforme e-learning

### Fonctionnel

- cours
- quiz
- suivi de progression
- rôles (étudiant, formateur, administrateur)

### Enjeux DevOps

- plusieurs environnements (dev, staging, prod) gérés en GitOps
- sauvegarde et restauration automatisées
- feature flags

### Angle DevSecOps

- RBAC multi-rôles
- journalisation des actions (audit)

---

## 6. 📡 Collecte de données IoT / supervision

### Fonctionnel

- ingestion de mesures de capteurs simulés (météo, domotique)
- stockage en séries temporelles
- tableaux de bord
- alertes

### Enjeux DevOps

- pipeline d'ingestion (MQTT ou HTTP)
- base de séries temporelles (InfluxDB, TimescaleDB)
- Grafana
- la phase Monitor y est centrale

### Angle DevSecOps

- authentification des appareils
- chiffrement des échanges (TLS)

---

## Le projet choisi

### 🎟️ Billetterie / Réservation

#### Fonctionnel

- événements ou créneaux
- réservation
- gestion des places restantes
- confirmation par e-mail

#### Enjeux DevOps

- pics de charge à l'ouverture des ventes
- tests de charge automatisés en CI (k6, JMeter)
- mise à l'échelle

#### Angle DevSecOps

- protection contre les bots
- intégrité des réservations

### Pourquoi ce projet ?

Le projet de billetterie / réservation a été choisi en raison de ses défis techniques intéressants, notamment la gestion des pics de charge, la protection contre les bots et l'intégrité des réservations. Il permet également de mettre en œuvre des pratiques DevOps et DevSecOps de manière concrète.
