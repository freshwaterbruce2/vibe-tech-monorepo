#!/bin/bash

# Health Check Script for Hotel Booking Project

echo "🏥 Running project health check..."
echo ""

# Function to check command existence
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check Node.js
if command_exists node; then
    echo "✅ Node.js: $(node -v)"
else
    echo "❌ Node.js: Not installed"
fi

# Check npm
if command_exists npm; then
    echo "✅ npm: $(npm -v)"
else
    echo "❌ npm: Not installed"
fi

# Check Git
if command_exists git; then
    echo "✅ Git: $(git --version | cut -d' ' -f3)"
else
    echo "❌ Git: Not installed"
fi

echo ""
echo "📦 Dependency Status:"

# Check if node_modules exists
if [ -d "node_modules" ]; then
    echo "✅ Dependencies installed"
    
    # Check for outdated packages
    outdated=$(npm outdated --json 2>/dev/null)
    if [ "$outdated" = "{}" ]; then
        echo "✅ All dependencies up to date"
    else
        echo "⚠️  Some dependencies are outdated. Run 'npm outdated' for details"
    fi
else
    echo "❌ Dependencies not installed. Run 'npm install'"
fi

echo ""
echo "🔍 Code Quality:"

# Run type check
if npm run typecheck >/dev/null 2>&1; then
    echo "✅ TypeScript: No type errors"
else
    echo "❌ TypeScript: Type errors found. Run 'npm run typecheck'"
fi

# Run linting
if npm run lint >/dev/null 2>&1; then
    echo "✅ ESLint: No linting issues"
else
    echo "⚠️  ESLint: Linting issues found. Run 'npm run lint'"
fi

echo ""
echo "🧪 Test Status:"

# Run tests
if npm test -- --run >/dev/null 2>&1; then
    echo "✅ Tests: All tests passing"
else
    echo "❌ Tests: Some tests failing. Run 'npm test'"
fi

echo ""
echo "🏗️  Build Status:"

# Check if dist directory exists
if [ -d "dist" ]; then
    echo "✅ Build artifacts exist"
    
    # Check build age
    if [ -f "dist/index.html" ]; then
        build_age=$(( ( $(date +%s) - $(stat -c %Y dist/index.html 2>/dev/null || stat -f %m dist/index.html) ) / 60 ))
        if [ $build_age -gt 1440 ]; then
            echo "⚠️  Build is more than 24 hours old"
        else
            echo "✅ Build is recent (${build_age} minutes old)"
        fi
    fi
else
    echo "⚠️  No build artifacts. Run 'npm run build'"
fi

echo ""
echo "🪝 Git Hooks:"

# Check if Husky is installed
if [ -d ".husky" ]; then
    echo "✅ Husky hooks installed"
else
    echo "❌ Husky hooks not installed. Run 'npx husky install'"
fi

echo ""
echo "📊 Health check complete!"