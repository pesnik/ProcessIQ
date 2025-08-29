# ProcessIQ Development Commands
# Install just: https://github.com/casey/just

# Default recipe - show available commands
default:
    @just --list

# Setup development environment
setup:
    @echo "🚀 Setting up ProcessIQ development environment..."
    uv venv --python 3.11
    @echo "📦 Installing backend dependencies..."
    bash -c 'source .venv/bin/activate && uv pip install -e apps/backend[dev]'
    @echo "📦 Installing frontend dependencies..."
    cd apps/desktop && pnpm install
    @echo "✅ Setup complete! Run 'just dev' to start development servers"

# Install dependencies
install:
    @echo "📦 Installing backend dependencies..."
    bash -c 'source .venv/bin/activate && uv pip install -e apps/backend[dev]'
    @echo "📦 Installing frontend dependencies..."
    cd apps/desktop && pnpm install

# Start all development servers
dev:
    @echo "🚀 Starting ProcessIQ development environment..."
    @echo "Backend: http://localhost:8000"
    @echo "Frontend: http://localhost:5173"
    @echo "Press Ctrl+C to stop all services"
    npx concurrently \
        --names "BACKEND,DESKTOP" \
        --prefix-colors "blue,green" \
        "bash -c 'source .venv/bin/activate && cd apps/backend && PYTHONPATH=src python -m uvicorn processiq.main:app --reload --host 0.0.0.0 --port 8000'" \
        "cd apps/desktop && pnpm run dev"

# Start individual services
dev-backend:
    @echo "🐍 Starting backend server..."
    bash -c 'source .venv/bin/activate && cd apps/backend && PYTHONPATH=src python -m uvicorn processiq.main:app --reload --host 0.0.0.0 --port 8000'

dev-frontend:
    @echo "⚛️  Starting frontend development server..."
    cd apps/desktop && pnpm run dev:react

dev-electron:
    @echo "🖥️  Starting Electron desktop app..."
    cd apps/desktop && pnpm run dev:electron

dev-desktop:
    @echo "🖥️  Starting complete desktop app (React + Electron)..."
    cd apps/desktop && pnpm run dev

dev-desktop-full:
    @echo "🖥️  Starting full desktop app with Electron (may fail due to binary issues)..."
    cd apps/desktop && pnpm run dev:full

# Build commands
build:
    @echo "🏗️  Building ProcessIQ..."
    just build-backend
    just build-frontend

build-backend:
    @echo "🏗️  Building backend..."
    bash -c 'source .venv/bin/activate && cd apps/backend && python -m build'

build-frontend:
    @echo "🏗️  Building frontend..."
    cd apps/desktop && pnpm run build

build-electron:
    @echo "🏗️  Building Electron app..."
    cd apps/desktop && pnpm run build:electron

# Package Electron app for all platforms
package:
    @echo "📦 Packaging Electron app for all platforms..."
    cd apps/desktop && pnpm run build:all

# Testing commands
test:
    @echo "🧪 Running all tests..."
    just test-backend
    just test-frontend

test-backend:
    @echo "🧪 Running backend tests..."
    bash -c 'source .venv/bin/activate && cd apps/backend && python -m pytest'

test-frontend:
    @echo "🧪 Running frontend tests..."
    cd apps/desktop && pnpm test

# Linting and formatting
lint:
    @echo "🔍 Linting code..."
    just lint-backend
    just lint-frontend

lint-backend:
    @echo "🔍 Linting backend..."
    bash -c 'source .venv/bin/activate && cd apps/backend && python -m ruff check . && python -m mypy .'

lint-frontend:
    @echo "🔍 Linting frontend..."
    cd apps/desktop && pnpm run lint

format:
    @echo "✨ Formatting code..."
    just format-backend
    just format-frontend

format-backend:
    @echo "✨ Formatting backend..."
    bash -c 'source .venv/bin/activate && cd apps/backend && python -m ruff format . && python -m ruff check . --fix'

format-frontend:
    @echo "✨ Formatting frontend..."
    cd apps/desktop && pnpm run format

# Type checking
typecheck:
    @echo "🔍 Type checking..."
    just typecheck-backend
    just typecheck-frontend

typecheck-backend:
    @echo "🔍 Type checking backend..."
    bash -c 'source .venv/bin/activate && cd apps/backend && python -m mypy .'

typecheck-frontend:
    @echo "🔍 Type checking frontend..."
    cd apps/desktop && pnpm run typecheck

# Database commands
db-reset:
    @echo "🗄️  Resetting database..."
    bash -c 'source .venv/bin/activate && cd apps/backend && python -c "from processiq.core.database import reset_database; reset_database()"'

db-migrate:
    @echo "🗄️  Running database migrations..."
    bash -c 'source .venv/bin/activate && cd apps/backend && python -c "from processiq.core.database import migrate_database; migrate_database()"'

# Clean commands
clean:
    @echo "🧹 Cleaning build artifacts..."
    just clean-backend
    just clean-frontend

clean-backend:
    @echo "🧹 Cleaning backend build artifacts..."
    rm -rf apps/backend/dist/
    rm -rf apps/backend/build/
    rm -rf apps/backend/.pytest_cache/
    find apps/backend -name "*.pyc" -delete
    find apps/backend -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true

clean-frontend:
    @echo "🧹 Cleaning frontend build artifacts..."
    rm -rf apps/desktop/dist/
    rm -rf apps/desktop/release/
    rm -rf apps/desktop/node_modules/.vite/

clean-all: clean
    @echo "🧹 Deep cleaning..."
    rm -rf .venv/
    rm -rf apps/desktop/node_modules/
    rm -rf node_modules/

# Docker commands
docker-build:
    @echo "🐳 Building Docker images..."
    docker build -t processiq-backend -f apps/backend/Dockerfile apps/backend
    docker build -t processiq-frontend -f apps/desktop/Dockerfile apps/desktop

docker-up:
    @echo "🐳 Starting Docker services..."
    docker-compose up -d

docker-down:
    @echo "🐳 Stopping Docker services..."
    docker-compose down

docker-logs:
    @echo "🐳 Showing Docker logs..."
    docker-compose logs -f

# Health checks
health:
    @echo "🏥 Checking service health..."
    @echo "Backend: $(curl -s http://localhost:8000/health | jq -r .status 2>/dev/null || echo "❌ Not responding")"
    @echo "Frontend: $(curl -s -o /dev/null -w "%{http_code}" http://localhost:5173 2>/dev/null | grep -q 200 && echo "✅ Running" || echo "❌ Not responding")"

# Git helpers
commit:
    @echo "📝 Interactive commit helper..."
    git add -A
    git status
    @read -p "Enter commit message: " msg && git commit -m "$msg"

push:
    @echo "🚀 Pushing to remote..."
    git push origin main

pull:
    @echo "📥 Pulling from remote..."
    git pull origin main

# Environment helpers
env-check:
    @echo "🔍 Checking environment..."
    @echo "Python: $(python --version 2>/dev/null || echo "❌ Not found")"
    @echo "Node: $(node --version 2>/dev/null || echo "❌ Not found")"
    @echo "pnpm: $(pnpm --version 2>/dev/null || echo "❌ Not found")"
    @echo "uv: $(uv --version 2>/dev/null || echo "❌ Not found")"
    @echo "Virtual env: $(.venv/bin/python --version 2>/dev/null && echo "✅ Active" || echo "❌ Not found")"

env-info:
    @echo "📋 Environment information:"
    @echo "Current directory: $(pwd)"
    @echo "Git branch: $(git branch --show-current)"
    @echo "Git status: $(git status --porcelain | wc -l) uncommitted changes"
    @echo "Backend port: 8000"
    @echo "Frontend port: 5173"

# Log management
logs:
    @echo "📊 Recent logs:"
    @echo "Backend logs:"
    tail -n 20 apps/backend/processiq.log 2>/dev/null || echo "No backend logs found"
    @echo "Frontend logs:"
    tail -n 20 apps/desktop/electron.log 2>/dev/null || echo "No frontend logs found"

# Quick shortcuts
dev-quick: dev
start: dev
stop:
    @echo "🛑 Stopping all development processes..."
    pkill -f "uvicorn.*processiq" || true
    pkill -f "vite" || true
    pkill -f "electron" || true

restart: stop dev

# Documentation
docs:
    @echo "📚 Opening documentation..."
    @echo "Backend API docs: http://localhost:8000/docs"
    @echo "Frontend: http://localhost:5173"
    @echo "Project README: Open README.md"

# Pricing tier installations - Pay-as-you-grow model
install-starter:
    @echo "💼 Installing STARTER tier (Traditional RPA only)..."
    bash -c 'source .venv/bin/activate && uv pip install -e apps/backend'

install-smart:
    @echo "🧠 Installing SMART tier (Traditional RPA + AI)..."
    bash -c 'source .venv/bin/activate && uv pip install -e apps/backend[ai]'

install-pro:
    @echo "👁️  Installing PRO tier (Traditional RPA + AI + Vision)..."
    bash -c 'source .venv/bin/activate && uv pip install -e apps/backend[pro]'

install-enterprise:
    @echo "🏢 Installing ENTERPRISE tier (All features)..."
    bash -c 'source .venv/bin/activate && uv pip install -e apps/backend[enterprise]'

# Maintenance
update:
    @echo "🔄 Updating dependencies..."
    bash -c 'source .venv/bin/activate && uv pip install --upgrade -e apps/backend[dev]'
    cd apps/desktop && pnpm update

security-check:
    @echo "🔒 Running security checks..."
    bash -c 'source .venv/bin/activate && cd apps/backend && pip-audit'
    cd apps/desktop && pnpm audit

# WSL2 specific helpers
wsl-setup:
    @echo "🐧 WSL2 specific setup..."
    @echo "Checking WSL display..."
    @echo "DISPLAY: ${DISPLAY:-"Not set"}"
    @echo "Setting up X11 forwarding if needed..."
    export DISPLAY=:0

# Development workflow helpers
workflow-setup: setup
    @echo "🛠️  Complete workflow setup..."
    just env-check
    just health 2>/dev/null || echo "ℹ️  Services not running - use 'just dev' to start"

workflow-check:
    @echo "✅ Development workflow check:"
    just env-check
    just health
    just lint 2>/dev/null || echo "⚠️  Linting issues found"
    just typecheck 2>/dev/null || echo "⚠️  Type checking issues found"

# Show current status
status:
    @echo "📊 ProcessIQ Development Status"
    @echo "================================"
    just env-info
    @echo ""
    just health