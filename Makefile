.PHONY: dev seed test clean setup

# Start all services
dev:
	docker compose up --build

# Start in background
dev-bg:
	docker compose up --build -d

# Run database migrations and seed data
seed:
	docker compose exec backend python -m app.seed

# Run backend tests
test:
	docker compose exec backend pytest -v

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
