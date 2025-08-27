#!/bin/bash

# ProcessIQ Development Environment Setup Script

set -e

echo "🚀 Setting up ProcessIQ development environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Node.js is installed
check_node() {
    echo -e "${BLUE}Checking Node.js installation...${NC}"
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Node.js is not installed. Please install Node.js 18+ and npm 8+${NC}"
        echo "Visit: https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | sed 's/v//')
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1)
    
    if [ "$NODE_MAJOR" -lt 18 ]; then
        echo -e "${RED}Node.js version $NODE_VERSION is too old. Please install Node.js 18+${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Node.js $NODE_VERSION found${NC}"
}

# Check if Python is installed
check_python() {
    echo -e "${BLUE}Checking Python installation...${NC}"
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}Python 3 is not installed. Please install Python 3.10+${NC}"
        echo "Visit: https://python.org/"
        exit 1
    fi
    
    PYTHON_VERSION=$(python3 --version | sed 's/Python //')
    PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
    PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)
    
    if [ "$PYTHON_MAJOR" -lt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 10 ]); then
        echo -e "${RED}Python version $PYTHON_VERSION is too old. Please install Python 3.10+${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Python $PYTHON_VERSION found${NC}"
}

# Install Node.js dependencies
install_node_deps() {
    echo -e "${BLUE}Installing Node.js dependencies...${NC}"
    npm install
    echo -e "${GREEN}✓ Node.js dependencies installed${NC}"
}

# Set up Python virtual environment
setup_python_env() {
    echo -e "${BLUE}Setting up Python environment...${NC}"
    cd apps/backend
    
    if [ ! -d "venv" ]; then
        echo "Creating Python virtual environment..."
        python3 -m venv venv
    fi
    
    echo "Activating virtual environment..."
    source venv/bin/activate
    
    echo "Installing Python dependencies..."
    pip install --upgrade pip
    pip install -e .[dev,vision]
    
    cd ../..
    echo -e "${GREEN}✓ Python environment set up${NC}"
}

# Install system dependencies (Ubuntu/Debian)
install_system_deps_ubuntu() {
    echo -e "${BLUE}Installing system dependencies (Ubuntu/Debian)...${NC}"
    sudo apt-get update
    sudo apt-get install -y \
        libpq-dev \
        tesseract-ocr \
        tesseract-ocr-eng \
        libnss3 \
        libnspr4 \
        libatk-bridge2.0-0 \
        libdrm2 \
        libxss1 \
        libasound2 \
        libxrandr2 \
        libxcomposite1 \
        libxcursor1 \
        libxdamage1 \
        libxtst6 \
        libxinerama1 \
        libgtk-3-0 \
        build-essential
    echo -e "${GREEN}✓ System dependencies installed${NC}"
}

# Install system dependencies (macOS)
install_system_deps_macos() {
    echo -e "${BLUE}Installing system dependencies (macOS)...${NC}"
    if ! command -v brew &> /dev/null; then
        echo -e "${RED}Homebrew is not installed. Please install Homebrew first${NC}"
        echo "Visit: https://brew.sh/"
        exit 1
    fi
    
    brew install postgresql tesseract
    echo -e "${GREEN}✓ System dependencies installed${NC}"
}

# Install Playwright browsers
install_playwright() {
    echo -e "${BLUE}Installing Playwright browsers...${NC}"
    cd apps/backend
    source venv/bin/activate
    playwright install chromium firefox
    cd ../..
    echo -e "${GREEN}✓ Playwright browsers installed${NC}"
}

# Set up pre-commit hooks
setup_precommit() {
    echo -e "${BLUE}Setting up pre-commit hooks...${NC}"
    cd apps/backend
    source venv/bin/activate
    pre-commit install
    cd ../..
    echo -e "${GREEN}✓ Pre-commit hooks installed${NC}"
}

# Create .env files
create_env_files() {
    echo -e "${BLUE}Creating environment files...${NC}"
    
    # Backend .env
    if [ ! -f "apps/backend/.env" ]; then
        cp .env.example apps/backend/.env
        echo -e "${YELLOW}Created apps/backend/.env from template. Please configure it.${NC}"
    fi
    
    # Desktop app .env
    if [ ! -f "apps/desktop/.env" ]; then
        cat > apps/desktop/.env << EOF
# Desktop App Environment Variables
VITE_API_BASE_URL=http://localhost:8000
VITE_APP_VERSION=0.1.0
VITE_ENABLE_DEVTOOLS=true
EOF
        echo -e "${YELLOW}Created apps/desktop/.env${NC}"
    fi
    
    echo -e "${GREEN}✓ Environment files created${NC}"
}

# Build shared packages
build_shared() {
    echo -e "${BLUE}Building shared packages...${NC}"
    npm run build -w @processiq/shared
    echo -e "${GREEN}✓ Shared packages built${NC}"
}

# Run tests
run_tests() {
    echo -e "${BLUE}Running tests...${NC}"
    
    # Python tests
    cd apps/backend
    source venv/bin/activate
    pytest --version > /dev/null && pytest tests/ -v || echo "No Python tests found"
    cd ../..
    
    # TypeScript tests
    npm test
    
    echo -e "${GREEN}✓ Tests completed${NC}"
}

# Main setup function
main() {
    echo -e "${GREEN}ProcessIQ Development Setup${NC}"
    echo "================================="
    
    # Check prerequisites
    check_node
    check_python
    
    # Install dependencies
    install_node_deps
    setup_python_env
    
    # Install system dependencies based on OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command -v apt-get &> /dev/null; then
            read -p "Install system dependencies with apt-get? (y/n): " -r
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                install_system_deps_ubuntu
            fi
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        read -p "Install system dependencies with Homebrew? (y/n): " -r
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            install_system_deps_macos
        fi
    fi
    
    # Additional setup
    install_playwright
    setup_precommit
    create_env_files
    build_shared
    
    echo ""
    echo -e "${GREEN}🎉 Development environment setup complete!${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Configure apps/backend/.env with your settings"
    echo "2. Start development: npm run dev"
    echo "3. Or start components separately:"
    echo "   - Backend: npm run dev:backend"
    echo "   - Desktop: npm run dev:desktop"
    echo ""
    echo -e "${BLUE}Available commands:${NC}"
    echo "- npm run dev        - Start both backend and desktop"
    echo "- npm run build      - Build all components"
    echo "- npm run test       - Run all tests"
    echo "- npm run lint       - Lint all code"
    echo "- npm run format     - Format all code"
    echo ""
    echo -e "${YELLOW}Happy coding! 🚀${NC}"
}

# Run main function
main "$@"