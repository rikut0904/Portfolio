SHELL := /bin/bash
COMPOSE := docker compose --env-file backend/.env.local
FRONTEND_DIR := frontend
BACKEND_DIR := backend
BACKEND_SERVICE := backend
FRONTEND_SERVICE := frontend
MIGRATION_DB_SERVICE ?= postgres
DEFAULT_LOCAL_DATABASE_URL := postgresql://portfolio:portfolio@postgres:5432/portfolio?sslmode=disable
LOCAL_DATABASE_URL ?= $(DEFAULT_LOCAL_DATABASE_URL)
GO := /usr/local/go/bin/go
GOFMT := /usr/local/go/bin/gofmt

.PHONY: help init-env install install-frontend install-backend \
	up down restart logs ps build rebuild clean clean/all \
	dev dev-frontend dev-backend \
	lint lint-frontend lint-backend \
	test test-backend \
	check fmt fmt-frontend fmt-backend migrate mocks

help:
	@echo "Available targets:"
	@echo "  init-env           Create backend/.env.local from its example if missing"
	@echo "  install            Install frontend/backend dependencies"
	@echo "  install-frontend   npm ci in frontend/"
	@echo "  install-backend    go mod download in backend/"
	@echo "  up                 Start docker services in background (build included)"
	@echo "  down               Stop docker services"
	@echo "  restart            Restart docker services"
	@echo "  logs               Tail docker logs"
	@echo "  ps                 Show docker service status"
	@echo "  build              Build docker images"
	@echo "  rebuild            Build images without cache"
	@echo "  clean              Remove local build outputs and frontend dependencies"
	@echo "  clean/all          clean + remove Docker volumes and networks"
	@echo "  dev                Alias of 'up'"
	@echo "  dev-frontend       Run Next.js dev server locally"
	@echo "  dev-backend        Run Go API locally"
	@echo "  lint               Run frontend and backend lint checks"
	@echo "  test               Run backend tests"
	@echo "  migrate            Run GORM database migration (the only migration entry point)"
	@echo "                     MIGRATION_DB_SERVICE=postgres-ci for CI"
	@echo "  mocks              Insert anonymous fixed mock data into the local database"
	@echo "  check              lint + test"
	@echo "  fmt                Run frontend/backend formatters"

init-env:
	@if [ ! -f $(BACKEND_DIR)/.env.local ] && [ -f $(BACKEND_DIR)/.env.local.example ]; then cp $(BACKEND_DIR)/.env.local.example $(BACKEND_DIR)/.env.local; echo "Created $(BACKEND_DIR)/.env.local"; fi

install: install-frontend install-backend

install-frontend:
	cd $(FRONTEND_DIR) && npm ci

install-backend:
	cd $(BACKEND_DIR) && $(GO) mod tidy && $(GO) mod download

up:
	$(COMPOSE) --profile ci up -d --wait postgres
	$(COMPOSE) up --build -d --wait backend frontend

down:
	$(COMPOSE) down

restart: down up

dev: up

dev-frontend:
	cd $(FRONTEND_DIR) && BACKEND_API_URL=http://localhost:8081 npm run dev -- --port 3001

dev-backend:
	$(COMPOSE) --profile ci up -d --wait postgres
	$(COMPOSE) build backend
	$(COMPOSE) run --rm --service-ports $(BACKEND_SERVICE) /app/server

logs:
	$(COMPOSE) logs -f --tail=200

ps:
	$(COMPOSE) ps

build:
	$(COMPOSE) build

rebuild:
	$(COMPOSE) build --no-cache

lint: lint-frontend lint-backend

lint-frontend:
	cd $(FRONTEND_DIR) && npm run lint

lint-backend:
	cd $(BACKEND_DIR) && $(GO) vet ./...

test: test-backend

test-backend:
	cd $(BACKEND_DIR) && $(GO) test ./...

fmt: fmt-frontend fmt-backend

fmt-frontend:
	cd $(FRONTEND_DIR) && npm run format

fmt-backend:
	cd $(BACKEND_DIR) && $(GOFMT) -w ./cmd ./internal

migrate:
	$(COMPOSE) --profile ci up -d --wait $(MIGRATION_DB_SERVICE)
	$(COMPOSE) build backend
	$(COMPOSE) run --rm $(BACKEND_SERVICE) /app/migrate

mocks:
	@if [ "$(LOCAL_DATABASE_URL)" != "$(DEFAULT_LOCAL_DATABASE_URL)" ]; then echo "make mocks only permits the local PostgreSQL database"; exit 1; fi
	DATABASE_URL=$(LOCAL_DATABASE_URL) $(COMPOSE) --profile ci up -d --wait postgres
	DATABASE_URL=$(LOCAL_DATABASE_URL) $(COMPOSE) build backend
	DATABASE_URL=$(LOCAL_DATABASE_URL) $(COMPOSE) run --rm $(BACKEND_SERVICE) /bin/sh -c "/app/migrate && /app/mocks"

check: fmt lint test

clean:
	rm -rf $(FRONTEND_DIR)/.next
	rm -rf $(FRONTEND_DIR)/node_modules/
	cd $(BACKEND_DIR) && $(GO) clean

clean/all:
	make clean
	$(COMPOSE) down -v
