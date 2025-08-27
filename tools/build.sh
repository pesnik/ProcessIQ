#!/bin/bash

# ProcessIQ Build Script

set -e

echo "🏗️ Building ProcessIQ..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BUILD_MODE=${1:-production}
BUILD_PLATFORM=${2:-current}

echo -e "${BLUE}Build mode: $BUILD_MODE${NC}"
echo -e "${BLUE}Platform: $BUILD_PLATFORM${NC}"

# Clean previous builds
clean() {
    echo -e "${BLUE}Cleaning previous builds...${NC}"
    rm -rf dist/
    rm -rf apps/desktop/dist/
    rm -rf apps/desktop/release/
    rm -rf apps/backend/dist/
    rm -rf packages/shared/dist/
    echo -e "${GREEN}✓ Cleaned${NC}"
}

# Build shared packages
build_shared() {
    echo -e "${BLUE}Building shared packages...${NC}"
    npm run build -w @processiq/shared
    echo -e "${GREEN}✓ Shared packages built${NC}"
}

# Build backend
build_backend() {
    echo -e "${BLUE}Building backend...${NC}"
    cd apps/backend
    
    # Activate virtual environment
    if [ -f "venv/bin/activate" ]; then
        source venv/bin/activate
    fi
    
    # Build Python package
    python -m build
    
    # Create standalone executable (optional)
    if [ "$BUILD_MODE" = "standalone" ]; then
        echo "Building standalone executable..."
        pip install pyinstaller
        pyinstaller --onefile --name processiq src/processiq/cli.py
    fi
    
    cd ../..
    echo -e "${GREEN}✓ Backend built${NC}"
}

# Build desktop app
build_desktop() {
    echo -e "${BLUE}Building desktop application...${NC}"
    cd apps/desktop
    
    # Install dependencies if not present
    if [ ! -d "node_modules" ]; then
        npm install
    fi
    
    # Build React app
    npm run build:react
    
    # Build Electron app
    case $BUILD_PLATFORM in
        "all")
            npm run build:all
            ;;
        "win")
            npm run build:electron -- --win
            ;;
        "mac")
            npm run build:electron -- --mac
            ;;
        "linux")
            npm run build:electron -- --linux
            ;;
        "current"|*)
            npm run build:electron
            ;;
    esac
    
    cd ../..
    echo -e "${GREEN}✓ Desktop application built${NC}"
}

# Create distribution package
create_distribution() {
    echo -e "${BLUE}Creating distribution package...${NC}"
    
    mkdir -p dist/
    
    # Copy backend distribution
    if [ -d "apps/backend/dist" ]; then
        cp -r apps/backend/dist dist/backend
    fi
    
    # Copy desktop app distribution
    if [ -d "apps/desktop/release" ]; then
        cp -r apps/desktop/release/* dist/
    fi
    
    # Copy documentation
    cp README.md dist/
    cp CONTRIBUTING.md dist/
    cp .env.example dist/
    
    # Create version info
    cat > dist/version.json << EOF
{
  "version": "0.1.0",
  "buildDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "buildMode": "$BUILD_MODE",
  "platform": "$BUILD_PLATFORM",
  "commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')"
}
EOF
    
    echo -e "${GREEN}✓ Distribution package created${NC}"
}

# Run tests before building (optional)
run_tests() {
    if [ "$BUILD_MODE" != "skip-tests" ]; then
        echo -e "${BLUE}Running tests...${NC}"
        npm test || {
            echo -e "${RED}Tests failed! Build aborted.${NC}"
            exit 1
        }
        echo -e "${GREEN}✓ All tests passed${NC}"
    fi
}

# Lint and format code
check_code_quality() {
    if [ "$BUILD_MODE" != "skip-lint" ]; then
        echo -e "${BLUE}Checking code quality...${NC}"
        npm run lint || {
            echo -e "${YELLOW}Linting issues found. Auto-fixing...${NC}"
            npm run lint:fix || true
        }
        echo -e "${GREEN}✓ Code quality checked${NC}"
    fi
}

# Generate checksums
generate_checksums() {
    echo -e "${BLUE}Generating checksums...${NC}"
    cd dist/
    
    find . -type f \( -name "*.exe" -o -name "*.dmg" -o -name "*.AppImage" -o -name "*.deb" -o -name "*.rpm" -o -name "*.tar.gz" \) -exec sha256sum {} \; > checksums.txt
    
    cd ..
    echo -e "${GREEN}✓ Checksums generated${NC}"
}

# Main build function
main() {
    echo -e "${GREEN}ProcessIQ Build Process${NC}"
    echo "======================="
    
    # Pre-build checks
    check_code_quality
    run_tests
    
    # Build process
    clean
    build_shared
    build_backend
    build_desktop
    create_distribution
    generate_checksums
    
    echo ""
    echo -e "${GREEN}🎉 Build completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}Distribution files:${NC}"
    ls -la dist/
    echo ""
    
    if [ -f "dist/checksums.txt" ]; then
        echo -e "${BLUE}Checksums:${NC}"
        cat dist/checksums.txt
    fi
}

# Show usage
usage() {
    echo "Usage: $0 [BUILD_MODE] [PLATFORM]"
    echo ""
    echo "BUILD_MODE:"
    echo "  production (default) - Full production build with tests"
    echo "  development          - Development build"
    echo "  standalone          - Create standalone executables"
    echo "  skip-tests          - Skip running tests"
    echo "  skip-lint           - Skip linting"
    echo ""
    echo "PLATFORM:"
    echo "  current (default)   - Build for current platform"
    echo "  all                 - Build for all platforms"
    echo "  win                 - Windows only"
    echo "  mac                 - macOS only"
    echo "  linux               - Linux only"
    echo ""
    echo "Examples:"
    echo "  $0                          # Default production build"
    echo "  $0 development              # Development build"
    echo "  $0 production all           # Production build for all platforms"
    echo "  $0 standalone linux         # Standalone Linux build"
}

# Handle arguments
case "$1" in
    "-h"|"--help"|"help")
        usage
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac