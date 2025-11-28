.PHONY: up down clean shell logs deps install logs-frontend logs-backend

COMPOSE := podman compose

deps:
	@mkdir -p node_modules .pnpm-store
	$(COMPOSE) run --rm frontend pnpm install --frozen-lockfile || pnpm install

up: deps
	$(COMPOSE) up -d
	@echo "Services started:"
	@echo "  Frontend: http://localhost:5173"
	@echo "  Backend:  http://localhost:3001"
	@echo "Showing initial logs (5 seconds)..."
	@timeout 5 $(COMPOSE) logs -f app 2>/dev/null || true
	@echo "Services running. Use 'make logs' for more output."

down:
	$(COMPOSE) down

clean:
	$(COMPOSE) down -v
	podman rmi rollupspanprocessor_frontend rollupspanprocessor_backend 2>/dev/null || true

shell:
	$(COMPOSE) exec backend sh

logs:
	$(COMPOSE) logs -f $(S)

install:
	$(COMPOSE) run --rm frontend pnpm install $(PKG)
