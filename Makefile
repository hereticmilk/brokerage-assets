# Makefile for Brokerage Symbol Assets Constructor

# Variables
NODE = node
NPM = npm
FRONTEND_DIR = frontend

# Default target
.PHONY: all
all: build

# Build the project
.PHONY: build
build: install
	@echo "Building the project..."
	@cd $(FRONTEND_DIR) && $(NPM) run build

# Run the development server
.PHONY: dev
dev:
	@echo "Starting development servers..."
	@$(NPM) run dev

# Run the backend development server
.PHONY: dev-backend
dev-backend:
	@echo "Starting backend development server..."
	@$(NODE) icon-generator.js

# Run the frontend development server
.PHONY: dev-frontend
dev-frontend:
	@echo "Starting frontend development server..."
	@cd $(FRONTEND_DIR) && $(NPM) run dev


# Clean build artifacts
.PHONY: clean
clean:
	@echo "Cleaning build artifacts..."
	@rm -rf $(FRONTEND_DIR)/dist
	@rm -rf node_modules
	@rm -rf $(FRONTEND_DIR)/node_modules

# Install dependencies
.PHONY: install
install:
	@echo "Installing dependencies..."
	@$(NPM) install
	@cd $(FRONTEND_DIR) && $(NPM) install

# Help target
.PHONY: help
help:
	@echo "Available targets:"
	@echo "  build         - Build the project"
	@echo "  dev           - Run development servers (backend and frontend)"
	@echo "  dev-backend   - Run backend development server"
	@echo "  dev-frontend  - Run frontend development server"
	@echo "  docker-build  - Build Docker images"
	@echo "  docker-up     - Start Docker containers"
	@echo "  docker-down   - Stop Docker containers"
	@echo "  lint          - Run linter"
	@echo "  clean         - Clean build artifacts"
	@echo "  install       - Install dependencies"
	@echo "  help          - Show this help message"
