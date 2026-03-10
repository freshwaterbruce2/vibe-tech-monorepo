#!/bin/bash

# Pre-release quality gate checks

echo "🚀 Running pre-release checks..."
echo ""

errors=0
warnings=0

# Function to run check
run_check() {
    local name=$1
    local command=$2
    local is_critical=${3:-true}
    
    echo -n "Checking $name... "
    if eval "$command" >/dev/null 2>&1; then
        echo "✅"
    else
        if [ "$is_critical" = true ]; then
            echo "❌"
            ((errors++))
        else
            echo "⚠️"
            ((warnings++))
        fi
    fi
}

# Critical checks
echo "🔴 Critical Checks:"
run_check "TypeScript compilation" "npm run typecheck"
run_check "Unit tests" "npm test -- --run"
run_check "Linting" "npm run lint"
run_check "Build process" "npm run build"
run_check "Security audit (high)" "npm audit --audit-level=high"

echo ""
echo "🟡 Quality Checks:"
run_check "Test coverage (>80%)" "npm run test:coverage && [ $(cat coverage/coverage-summary.json | jq '.total.lines.pct') -gt 80 ]" false
run_check "Bundle size (<500KB)" "[ $(du -k dist/assets/*.js | awk '{sum += $1} END {print sum}') -lt 500 ]" false
run_check "No console.logs" "! grep -r 'console.log' src/ --include='*.ts' --include='*.tsx'" false
run_check "No TODO comments" "! grep -r 'TODO' src/ --include='*.ts' --include='*.tsx'" false

echo ""
echo "📋 Summary:"
echo "  Errors: $errors"
echo "  Warnings: $warnings"

if [ $errors -gt 0 ]; then
    echo ""
    echo "❌ Pre-release checks failed! Please fix the errors before releasing."
    exit 1
else
    echo ""
    echo "✅ All critical checks passed!"
    if [ $warnings -gt 0 ]; then
        echo "⚠️  There are $warnings warnings. Consider addressing them for better quality."
    fi
    exit 0
fi