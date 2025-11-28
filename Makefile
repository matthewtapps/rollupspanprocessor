.PHONY: up down clean shell logs deps

COMPOSE := podman compose

deps:
	@mkdir -p node_modules .pnpm-store
	$(COMPOSE) run --rm app sh -c 'pnpm install --frozen-lockfile || pnpm install'

up: deps
	$(COMPOSE) up -d
	@echo "Services started:"
	@echo "  Frontend: http://localhost:5173"
	@echo "  Backend:  http://localhost:3001"
	@echo ""
	@echo "Use 'make logs' to view output"

down:
	$(COMPOSE) down

clean:
	$(COMPOSE) down -v
	podman rmi rollupspanprocessor_app 2>/dev/null || true
	rm -rf node_modules .pnpm-store

shell:
	$(COMPOSE) exec app sh

logs:
	$(COMPOSE) logs -f app
