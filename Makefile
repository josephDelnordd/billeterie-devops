.DEFAULT_GOAL := help
.PHONY: help require-pre-commit hooks-install check

help: ## Affiche les commandes disponibles
	@grep -E '^[a-zA-Z0-9_-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "} {printf "%-16s %s\n", $$1, $$2}'

require-pre-commit:
	@command -v pre-commit >/dev/null 2>&1 || { printf '%s\n' 'pre-commit manquant ; installez-le avec : pipx install pre-commit' >&2; exit 127; }

hooks-install: require-pre-commit ## Installe les hooks Git locaux via pre-commit
	pre-commit install

check: require-pre-commit ## Exécute tous les hooks sur les fichiers du dépôt
	pre-commit run --all-files
