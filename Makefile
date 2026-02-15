SHELL := /bin/bash
COMPOSE := docker compose
FRONTEND_DIR := frontend
BACKEND_DIR := backend
BACKEND_SERVICE := backend
FRONTEND_SERVICE := frontend

.PHONY: help init-env install install-frontend install-backend \
	up down restart logs ps build rebuild clean clean-all \
	dev dev-frontend dev-backend \
	lint lint-frontend lint-backend \
	test test-backend \
	check fmt fmt-frontend fmt-backend

help:
	@echo "Available targets:"
	@echo "  init-env           Create .env files from .env.example if missing"
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
	@echo "  clean              Stop and remove volumes/networks"
	@echo "  clean-all          clean + remove local build outputs"
	@echo "  dev                Alias of 'up'"
	@echo "  dev-frontend       Run Next.js dev server locally"
	@echo "  dev-backend        Run Go API locally"
	@echo "  lint               Run frontend and backend lint checks"
	@echo "  test               Run backend tests"
	@echo "  check              lint + test"
	@echo "  fmt                Run frontend/backend formatters"

init-env:
	@if [ ! -f $(FRONTEND_DIR)/.env ] && [ -f $(FRONTEND_DIR)/.env.example ]; then cp $(FRONTEND_DIR)/.env.example $(FRONTEND_DIR)/.env; echo "Created $(FRONTEND_DIR)/.env"; fi
	@if [ ! -f $(BACKEND_DIR)/.env ] && [ -f $(BACKEND_DIR)/.env.example ]; then cp $(BACKEND_DIR)/.env.example $(BACKEND_DIR)/.env; echo "Created $(BACKEND_DIR)/.env"; fi

install: install-frontend install-backend

install-frontend:
	cd $(FRONTEND_DIR) && npm ci

install-backend:
	cd $(BACKEND_DIR) && go mod tidy && go mod download

up:
	$(COMPOSE) up --build

down:
	$(COMPOSE) down

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
	cd $(BACKEND_DIR) && go vet ./...

test: test-backend

test-backend:
	cd $(BACKEND_DIR) && go test ./...

fmt: fmt-frontend fmt-backend

fmt-frontend:
	cd $(FRONTEND_DIR) && npm run format

fmt-backend:
	cd $(BACKEND_DIR) && gofmt -w ./cmd ./internal

check: fmt lint test

clean:
	rm -rf $(FRONTEND_DIR)/.next
	rm -rf $(FRONTEND_DIR)/node_modules/.cache
	cd $(BACKEND_DIR) && go clean

clean-all: clean
	rm -rf $(FRONTEND_DIR)/node_modules
