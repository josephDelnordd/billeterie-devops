# ADR 0005 : boîte d'envoi transactionnelle (outbox) pour les e-mails de confirmation

- Statut : accepté
- Date : 2026-10-18

## Contexte

Chaque réservation confirmée doit déclencher un e-mail. L'envoi est une opération externe (SMTP) qui peut échouer, être lente ou indisponible : il ne doit ni ralentir la réservation ni, surtout, l'annuler. Il faut aussi éviter les deux incohérences classiques : une réservation validée dont l'e-mail est perdu, ou un e-mail envoyé pour une réservation finalement annulée.

## Décision

Utiliser le modèle **transactional outbox** avec PostgreSQL :

- Dans la **même transaction** que la réservation, l'API écrit une ligne dans `email_outbox`.
- Un **worker** distinct lit cette table, envoie le message puis le marque `sent`.
- Plusieurs instances du worker peuvent tourner : `SELECT ... FOR UPDATE SKIP LOCKED` empêche deux workers de prendre le même message.
- En cas d'échec, `attempts` est incrémenté et la prochaine tentative est repoussée avec un **recul exponentiel** (`next_attempt_at`). Après `MAX_ATTEMPTS` échecs, le message passe en `failed` pour intervention humaine.

## Alternatives examinées

- **Envoi synchrone dans la requête HTTP** : une panne SMTP ferait échouer ou ralentirait la réservation, ce qui est inacceptable pendant un pic d'ouverture des ventes.
- **Publier sur une file (Azure Storage Queue, Redis, RabbitMQ) après le commit** : deux systèmes à mettre à jour sans transaction commune. Un crash entre le commit et la publication perdrait l'e-mail ; l'inverse enverrait un e-mail pour une réservation inexistante.
- **File séparée alimentée par un relais (CDC, Debezium)** : plus robuste à très grande échelle, mais disproportionné pour ce projet et coûteux à exploiter.

## Conséquences

- Aucun service supplémentaire à héberger ni à payer : la file vit dans la base déjà présente, ce qui respecte la contrainte de budget.
- Livraison **au moins une fois** : si le worker plante après l'envoi mais avant la validation, l'e-mail peut être envoyé deux fois. Ce compromis est préféré à une perte ; un doublon de confirmation est bénin.
- Le worker interroge la base à intervalle régulier (2 s par défaut) : un léger délai d'envoi, acceptable pour un e-mail de confirmation.
- La table `email_outbox` grossit ; une purge des messages `sent` anciens devra être ajoutée avant une mise en production réelle.
- Le worker peut être mis à l'échelle (KEDA sur le nombre de lignes `pending`) lors de l'étape de déploiement Kubernetes.
- Si la charge dépassait un jour les capacités de PostgreSQL pour ce rôle, la table pourra être remplacée par une vraie file sans changer le contrat de l'API.
