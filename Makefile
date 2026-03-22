.PHONY: dev dev-bg seed test stop clean setup logs shell

# Start all services
dev:
	docker compose up --build

# Start in background
dev-bg:
	docker compose up --build -d

# Start dependencies and seed demo data
seed:
	docker compose up -d postgres redis backend
	docker compose exec backend python -m app.seed

# Run backend tests
test:
	docker compose up -d postgres redis backend
	docker compose exec backend python -m pytest tests/ -v

# Stop all services
stop:
	docker compose down

# Clean everything including volumes
clean:
	docker compose down -v --remove-orphans

# Full setup: build, start, migrate, seed
setup: dev-bg
	@echo "Waiting for services..."
	@sleep 10
	@make seed
	@echo "AutoAgent is ready at http://localhost:5173"

# View logs
logs:
	docker compose logs -f

# Backend shell
shell:
	docker compose exec backend python -c "from app.main import app; print('Ready')"
