#!/bin/bash

#
# Production Test Suite Runner
# Comprehensive test execution script for all test types
#

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
ENVIRONMENT="development"
TEST_SUITE="all"
PARALLEL=true
HEADLESS=true
BROWSER="chromium"
REPORT_FORMAT="html"
CLEANUP=true
TIMEOUT=300000
RETRIES=2

# Help function
show_help() {
    cat << EOF
Usage: $0 [OPTIONS]

Production Test Suite Runner for Shipping PWA

OPTIONS:
    -e, --environment ENV    Target environment (development|staging|production) [default: development]
    -s, --suite SUITE       Test suite to run (all|integration|e2e|performance|security|mobile) [default: all]
    -b, --browser BROWSER   Browser to use (chromium|firefox|webkit|all) [default: chromium]
    -p, --parallel BOOL     Run tests in parallel (true|false) [default: true]
    -h, --headless BOOL     Run in headless mode (true|false) [default: true]
    -r, --report FORMAT     Report format (html|json|junit|all) [default: html]
    -t, --timeout MS        Test timeout in milliseconds [default: 300000]
    --retries COUNT         Number of retries for failed tests [default: 2]
    --no-cleanup            Don't clean up after tests
    --workers COUNT         Number of parallel workers
    --shard SHARD           Shard specification (e.g., 1/4)
    --help                  Show this help message

EXAMPLES:
    # Run all tests in development
    $0 -e development -s all

    # Run only E2E tests in staging with Firefox
    $0 -e staging -s e2e -b firefox

    # Run performance tests with specific configuration
    $0 -s performance --headless false --workers 1

    # Run security tests in production (read-only)
    $0 -e production -s security --no-cleanup

    # Run mobile tests with sharding
    $0 -s mobile --shard 1/2 --parallel true

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -s|--suite)
            TEST_SUITE="$2"
            shift 2
            ;;
        -b|--browser)
            BROWSER="$2"
            shift 2
            ;;
        -p|--parallel)
            PARALLEL="$2"
            shift 2
            ;;
        -h|--headless)
            HEADLESS="$2"
            shift 2
            ;;
        -r|--report)
            REPORT_FORMAT="$2"
            shift 2
            ;;
        -t|--timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --retries)
            RETRIES="$2"
            shift 2
            ;;
        --workers)
            WORKERS="$2"
            shift 2
            ;;
        --shard)
            SHARD="$2"
            shift 2
            ;;
        --no-cleanup)
            CLEANUP=false
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Utility functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check Node.js
    if ! command_exists node; then
        log_error "Node.js is not installed"
        exit 1
    fi

    # Check npm/pnpm
    if command_exists pnpm; then
        PACKAGE_MANAGER="pnpm"
    elif command_exists npm; then
        PACKAGE_MANAGER="npm"
    else
        log_error "Neither npm nor pnpm is installed"
        exit 1
    fi

    log_info "Using package manager: $PACKAGE_MANAGER"

    # Check if dependencies are installed
    if [ ! -d "node_modules" ]; then
        log_warning "Dependencies not installed, installing..."
        $PACKAGE_MANAGER install
    fi

    # Check Playwright browsers
    if [ "$TEST_SUITE" = "all" ] || [ "$TEST_SUITE" = "e2e" ] || [ "$TEST_SUITE" = "mobile" ]; then
        log_info "Checking Playwright browsers..."
        npx playwright install --with-deps "$BROWSER" 2>/dev/null || {
            log_warning "Installing Playwright browsers..."
            npx playwright install --with-deps
        }
    fi

    log_success "Prerequisites check completed"
}

# Setup test environment
setup_environment() {
    log_info "Setting up test environment: $ENVIRONMENT"

    # Create test results directory
    mkdir -p test-results

    # Set environment variables
    export NODE_ENV="test"
    export TEST_ENVIRONMENT="$ENVIRONMENT"
    export TEST_TIMEOUT="$TIMEOUT"
    export TEST_RETRIES="$RETRIES"
    export BROWSER="$BROWSER"
    export HEADLESS="$HEADLESS"

    if [ "$PARALLEL" = "true" ]; then
        export TEST_PARALLEL="true"
        [ -n "$WORKERS" ] && export TEST_WORKERS="$WORKERS"
    else
        export TEST_PARALLEL="false"
        export TEST_WORKERS="1"
    fi

    [ -n "$SHARD" ] && export SHARD="$SHARD"

    # Environment-specific configuration
    case $ENVIRONMENT in
        development)
            export TEST_BASE_URL="http://localhost:5173"
            export VITE_FIREBASE_USE_EMULATOR="true"
            export SQUARE_ENVIRONMENT="sandbox"
            ;;
        staging)
            export TEST_BASE_URL="${STAGING_URL:-https://staging.dc8980-shipping.com}"
            export VITE_FIREBASE_USE_EMULATOR="false"
            export SQUARE_ENVIRONMENT="sandbox"
            ;;
        production)
            export TEST_BASE_URL="${PRODUCTION_URL:-https://app.dc8980-shipping.com}"
            export VITE_FIREBASE_USE_EMULATOR="false"
            export SQUARE_ENVIRONMENT="production"
            ;;
    esac

    log_success "Environment setup completed"
}

# Start services
start_services() {
    log_info "Starting required services..."

    # Start Firebase emulator if needed
    if [ "$ENVIRONMENT" = "development" ]; then
        log_info "Starting Firebase emulator..."
        npx firebase emulators:start --only firestore,auth --project demo-test &
        FIREBASE_PID=$!
        sleep 5

        # Verify emulator is running
        if ! curl -s http://localhost:8080 >/dev/null; then
            log_error "Firebase emulator failed to start"
            exit 1
        fi
    fi

    # Start application server if testing locally
    if [ "$ENVIRONMENT" = "development" ]; then
        log_info "Building and starting application..."
        $PACKAGE_MANAGER run build

        log_info "Starting preview server..."
        $PACKAGE_MANAGER run preview &
        APP_PID=$!

        # Wait for server to be ready
        timeout 60 bash -c 'until curl -s http://localhost:5173 >/dev/null; do sleep 1; done' || {
            log_error "Application server failed to start"
            exit 1
        }
    fi

    log_success "Services started successfully"
}

# Run integration tests
run_integration_tests() {
    log_info "Running integration tests..."

    local test_files=""
    case $TEST_SUITE in
        all|integration)
            test_files="tests/integration/**/*.test.ts"
            ;;
        firebase)
            test_files="tests/integration/firebase-integration.test.ts"
            ;;
        sentry)
            test_files="tests/integration/sentry-integration.test.ts"
            ;;
        square)
            test_files="tests/integration/square-payment-integration.test.ts"
            ;;
    esac

    if [ -n "$test_files" ]; then
        npx jest --config=tests/config/jest.integration.config.js \
            --testPathPattern="$test_files" \
            --maxWorkers=${TEST_WORKERS:-1} \
            --bail || return 1
    fi

    log_success "Integration tests completed"
}

# Run E2E tests
run_e2e_tests() {
    log_info "Running E2E tests..."

    local project_args=""
    if [ "$BROWSER" != "all" ]; then
        project_args="--project=$BROWSER-e2e"
    fi

    local shard_args=""
    [ -n "$SHARD" ] && shard_args="--shard=$SHARD"

    npx playwright test \
        --config=tests/config/playwright.production.config.ts \
        $project_args \
        $shard_args \
        tests/e2e/ || return 1

    log_success "E2E tests completed"
}

# Run performance tests
run_performance_tests() {
    log_info "Running performance tests..."

    # Ensure Chrome is available for Lighthouse
    if [ "$BROWSER" != "chromium" ] && [ "$BROWSER" != "all" ]; then
        log_warning "Performance tests require Chromium, switching browser"
        export BROWSER="chromium"
    fi

    npx playwright test \
        --config=tests/config/playwright.production.config.ts \
        --project=performance-chrome \
        tests/performance/ || return 1

    # Run Lighthouse audit
    log_info "Running Lighthouse audit..."
    npx lighthouse "$TEST_BASE_URL" \
        --output=html,json \
        --output-path=test-results/lighthouse-report \
        --chrome-flags="--headless --no-sandbox" \
        --preset=desktop || log_warning "Lighthouse audit failed"

    log_success "Performance tests completed"
}

# Run security tests
run_security_tests() {
    log_info "Running security tests..."

    npx playwright test \
        --config=tests/config/playwright.production.config.ts \
        --project=security-tests \
        tests/security/ || return 1

    # Run OWASP ZAP scan (if not production)
    if [ "$ENVIRONMENT" != "production" ] && command_exists docker; then
        log_info "Running OWASP ZAP security scan..."
        docker run -t owasp/zap2docker-stable zap-baseline.py \
            -t "$TEST_BASE_URL" \
            -J test-results/zap-report.json \
            -w test-results/zap-report.md || log_warning "ZAP scan failed"
    fi

    log_success "Security tests completed"
}

# Run mobile tests
run_mobile_tests() {
    log_info "Running mobile tests..."

    npx playwright test \
        --config=tests/config/playwright.production.config.ts \
        --project=mobile-chrome,mobile-safari,tablet-ipad \
        tests/mobile/ || return 1

    log_success "Mobile tests completed"
}

# Generate reports
generate_reports() {
    log_info "Generating test reports..."

    # Merge Playwright reports if multiple exist
    if [ -d "test-results" ] && [ "$(ls -A test-results/)" ]; then
        npx playwright merge-reports test-results --reporter=html,json
    fi

    # Generate combined coverage report if available
    if [ -f "coverage/lcov.info" ]; then
        log_info "Generating coverage report..."
        npx nyc report --reporter=html --report-dir=test-results/coverage
    fi

    # Generate performance summary
    if [ -f "test-results/lighthouse-report.json" ]; then
        log_info "Processing performance metrics..."
        node -e "
            const fs = require('fs');
            const lighthouse = JSON.parse(fs.readFileSync('test-results/lighthouse-report.json'));
            const summary = {
                performance: lighthouse.categories.performance.score * 100,
                accessibility: lighthouse.categories.accessibility.score * 100,
                bestPractices: lighthouse.categories['best-practices'].score * 100,
                seo: lighthouse.categories.seo.score * 100,
                fcp: lighthouse.audits['first-contentful-paint'].numericValue,
                lcp: lighthouse.audits['largest-contentful-paint'].numericValue,
                tbt: lighthouse.audits['total-blocking-time'].numericValue,
                cls: lighthouse.audits['cumulative-layout-shift'].numericValue
            };
            fs.writeFileSync('test-results/performance-summary.json', JSON.stringify(summary, null, 2));
            console.log('Performance Summary:', summary);
        "
    fi

    log_success "Reports generated in test-results/ directory"
}

# Cleanup function
cleanup() {
    if [ "$CLEANUP" = "true" ]; then
        log_info "Cleaning up..."

        # Kill background processes
        [ -n "$APP_PID" ] && kill $APP_PID 2>/dev/null || true
        [ -n "$FIREBASE_PID" ] && kill $FIREBASE_PID 2>/dev/null || true

        # Clean up temporary files
        rm -rf .tmp-test-* 2>/dev/null || true

        log_success "Cleanup completed"
    fi
}

# Signal handlers
trap cleanup EXIT
trap 'cleanup; exit 130' INT
trap 'cleanup; exit 143' TERM

# Main execution
main() {
    log_info "Starting Production Test Suite"
    log_info "Environment: $ENVIRONMENT"
    log_info "Test Suite: $TEST_SUITE"
    log_info "Browser: $BROWSER"
    log_info "Parallel: $PARALLEL"

    # Check prerequisites
    check_prerequisites

    # Setup environment
    setup_environment

    # Start required services
    start_services

    # Run tests based on suite selection
    local test_failed=false

    case $TEST_SUITE in
        all)
            run_integration_tests || test_failed=true
            run_e2e_tests || test_failed=true
            run_performance_tests || test_failed=true
            run_security_tests || test_failed=true
            run_mobile_tests || test_failed=true
            ;;
        integration)
            run_integration_tests || test_failed=true
            ;;
        e2e)
            run_e2e_tests || test_failed=true
            ;;
        performance)
            run_performance_tests || test_failed=true
            ;;
        security)
            run_security_tests || test_failed=true
            ;;
        mobile)
            run_mobile_tests || test_failed=true
            ;;
        *)
            log_error "Unknown test suite: $TEST_SUITE"
            exit 1
            ;;
    esac

    # Generate reports
    generate_reports

    # Check results
    if [ "$test_failed" = "true" ]; then
        log_error "Some tests failed. Check test-results/ for details."
        exit 1
    else
        log_success "All tests passed successfully!"
    fi
}

# Run main function
main