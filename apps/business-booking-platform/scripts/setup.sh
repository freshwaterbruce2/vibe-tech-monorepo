#!/bin/bash

# Hotel Booking Project Setup Script

echo "🏨 Setting up Hotel Booking Project..."

# Check Node.js version
required_node_version="20"
current_node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)

if [ "$current_node_version" -lt "$required_node_version" ]; then
    echo "❌ Node.js version $required_node_version or higher is required. Current version: $current_node_version"
    exit 1
fi

echo "✅ Node.js version check passed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Set up git hooks
echo "🪝 Setting up git hooks..."
npx husky install

# Run initial build
echo "🔨 Running initial build..."
npm run build

# Run type check
echo "🔍 Running type check..."
npm run typecheck

# Run tests
echo "🧪 Running tests..."
npm test -- --run

# Run linting
echo "🧹 Running linting..."
npm run lint

echo "✅ Setup complete! You're ready to start developing."
echo ""
echo "Available commands:"
echo "  npm run dev       - Start development server"
echo "  npm run build     - Build for production"
echo "  npm test          - Run tests"
echo "  npm run lint      - Run linting"
echo "  npm run typecheck - Run TypeScript type checking"