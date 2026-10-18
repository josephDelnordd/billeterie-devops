.DEFAULT_GOAL := help
.PHONY: help require-pre-commit require-docker hooks-install check install typecheck \
        test test-unit test-integration up down logs ps clean

APPS := apps/api apps/worker apps/web

help: ## Affiche les commandes disponibles
	@grep -E '^[a-zA-Z0-9_-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "} {printf "%-18s %s\n", $$1, $$2}'

require-pre-commit:
	@command -v pre-commit >/dev/null 2>&1 || { printf '%s\n' 'pre-commit manquant ; installez-le avec : pipx install pre-commit' >&2; exit 127; }

require-docker:
	@command -v docker >/dev/null 2>&1 || { printf '%s\n' 'docker manquant ; installez Docker Engine avec le plugin Compose' >&2; exit 127; }

# --- Qualité du dépôt ---

hooks-install: require-pre-commit ## Installe les hooks Git locaux via pre-commit
	pre-commit install

check: require-pre-commit ## Exécute tous les hooks sur les fichiers du dépôt
	pre-commit run --all-files

# --- Application ---

install: ## Installe les dépendances de l'API, du worker et du frontend (npm ci)
	@for app in $(APPS); do echo "==> $$app"; (cd $$app && npm ci) || exit 1; done

typecheck: ## Vérifie les types TypeScript des trois applications
	@for app in $(APPS); do echo "==> $$app"; (cd $$app && npm run typecheck) || exit 1; done

test-unit: ## Tests unitaires (sans Docker)
	@(cd apps/api && npm run test:unit) && (cd apps/worker && npm run test:unit) && (cd apps/web && npm test)

test-integration: require-docker ## Tests d'intégration contre un vrai PostgreSQL (Docker requis)
	@(cd apps/api && npm run test:integration) && (cd apps/worker && npm run test:integration)

test: test-unit test-integration ## Lance tous les tests

# --- Environnement local ---

up: require-docker ## Démarre toute la pile : web http://localhost:8080, e-mails http://localhost:8025
	@test -f .env || { cp .env.example .env && echo '.env créé depuis .env.example'; }
	docker compose up --build --detach --wait
	@echo ''
	@echo 'Application : http://localhost:8080   |   E-mails (Mailpit) : http://localhost:8025'

down: require-docker ## Arrête la pile (les données sont conservées)
	docker compose down

logs: require-docker ## Suit les journaux de tous les services
	docker compose logs --follow --tail=100

ps: require-docker ## Affiche l'état des services
	docker compose ps

clean: require-docker ## Arrête la pile ET supprime les données (volume PostgreSQL)
	docker compose down --volumes
