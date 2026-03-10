#!/bin/bash
# Blue-Green Deployment Script for Hotel Booking Application

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="${NAMESPACE:-hotel-booking-production}"
DEPLOYMENT_TIMEOUT="${DEPLOYMENT_TIMEOUT:-600}"
HEALTH_CHECK_RETRIES="${HEALTH_CHECK_RETRIES:-30}"
HEALTH_CHECK_INTERVAL="${HEALTH_CHECK_INTERVAL:-10}"
ROLLBACK_ON_FAILURE="${ROLLBACK_ON_FAILURE:-true}"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Get current active version
get_active_version() {
    kubectl get service hotel-booking-active -n "$NAMESPACE" -o jsonpath='{.spec.selector.version}'
}

# Get inactive version
get_inactive_version() {
    local active_version="$1"
    if [ "$active_version" == "blue" ]; then
        echo "green"
    else
        echo "blue"
    fi
}

# Check deployment status
check_deployment_status() {
    local deployment_name="$1"
    local status=$(kubectl rollout status deployment/"$deployment_name" -n "$NAMESPACE" --timeout="${DEPLOYMENT_TIMEOUT}s" 2>&1)
    
    if [[ $status == *"successfully rolled out"* ]]; then
        return 0
    else
        return 1
    fi
}

# Health check
health_check() {
    local service_name="$1"
    local retries="$HEALTH_CHECK_RETRIES"
    
    log_info "Running health checks for $service_name..."
    
    while [ $retries -gt 0 ]; do
        # Get pod IPs
        local pod_ips=$(kubectl get pods -n "$NAMESPACE" -l version="$service_name" -o jsonpath='{.items[*].status.podIP}')
        
        if [ -z "$pod_ips" ]; then
            log_warning "No pods found for $service_name"
            retries=$((retries - 1))
            sleep "$HEALTH_CHECK_INTERVAL"
            continue
        fi
        
        # Check each pod
        local all_healthy=true
        for ip in $pod_ips; do
            if ! kubectl exec -n "$NAMESPACE" deployment/hotel-booking-$service_name -- wget -qO- http://$ip:3000/health > /dev/null 2>&1; then
                all_healthy=false
                break
            fi
        done
        
        if [ "$all_healthy" = true ]; then
            log_success "All pods for $service_name are healthy"
            return 0
        fi
        
        retries=$((retries - 1))
        log_warning "Health check failed, retries remaining: $retries"
        sleep "$HEALTH_CHECK_INTERVAL"
    done
    
    log_error "Health checks failed for $service_name"
    return 1
}

# Run smoke tests
run_smoke_tests() {
    local version="$1"
    log_info "Running smoke tests for $version deployment..."
    
    # Here you would add your actual smoke test logic
    # For now, we'll simulate with a simple check
    local service_endpoint="hotel-booking-$version.$NAMESPACE.svc.cluster.local"
    
    # Test basic endpoints
    if kubectl run smoke-test-$version --image=curlimages/curl:latest --rm -it --restart=Never -- \
        curl -f "http://$service_endpoint/health" > /dev/null 2>&1; then
        log_success "Smoke tests passed for $version"
        return 0
    else
        log_error "Smoke tests failed for $version"
        return 1
    fi
}

# Switch traffic
switch_traffic() {
    local target_version="$1"
    log_info "Switching traffic to $target_version..."
    
    kubectl patch service hotel-booking-active -n "$NAMESPACE" \
        -p '{"spec":{"selector":{"version":"'$target_version'"}}}'
    
    log_success "Traffic switched to $target_version"
}

# Scale deployment
scale_deployment() {
    local deployment="$1"
    local replicas="$2"
    
    log_info "Scaling $deployment to $replicas replicas..."
    kubectl scale deployment "$deployment" -n "$NAMESPACE" --replicas="$replicas"
}

# Rollback
rollback() {
    local original_version="$1"
    log_warning "Rolling back to $original_version..."
    
    switch_traffic "$original_version"
    
    # Scale down the failed deployment
    local failed_version=$(get_inactive_version "$original_version")
    scale_deployment "hotel-booking-$failed_version" 0
    
    log_success "Rollback completed"
}

# Main deployment logic
main() {
    log_info "Starting Blue-Green deployment..."
    
    # Get current state
    local active_version=$(get_active_version)
    local inactive_version=$(get_inactive_version "$active_version")
    
    log_info "Current active version: $active_version"
    log_info "Target deployment version: $inactive_version"
    
    # Update the inactive deployment with new image
    if [ -n "${NEW_IMAGE_TAG:-}" ]; then
        log_info "Updating $inactive_version deployment with image tag: $NEW_IMAGE_TAG"
        kubectl set image deployment/hotel-booking-$inactive_version \
            -n "$NAMESPACE" \
            hotel-booking-app=hotel-booking:$NEW_IMAGE_TAG
    fi
    
    # Scale up inactive deployment
    scale_deployment "hotel-booking-$inactive_version" 3
    
    # Wait for deployment to be ready
    if ! check_deployment_status "hotel-booking-$inactive_version"; then
        log_error "Deployment failed for $inactive_version"
        if [ "$ROLLBACK_ON_FAILURE" = true ]; then
            scale_deployment "hotel-booking-$inactive_version" 0
        fi
        exit 1
    fi
    
    # Run health checks
    if ! health_check "$inactive_version"; then
        log_error "Health checks failed for $inactive_version"
        if [ "$ROLLBACK_ON_FAILURE" = true ]; then
            scale_deployment "hotel-booking-$inactive_version" 0
        fi
        exit 1
    fi
    
    # Run smoke tests
    if ! run_smoke_tests "$inactive_version"; then
        log_error "Smoke tests failed for $inactive_version"
        if [ "$ROLLBACK_ON_FAILURE" = true ]; then
            scale_deployment "hotel-booking-$inactive_version" 0
        fi
        exit 1
    fi
    
    # Switch traffic to new version
    switch_traffic "$inactive_version"
    
    # Verify traffic switch
    sleep 5
    local new_active=$(get_active_version)
    if [ "$new_active" != "$inactive_version" ]; then
        log_error "Traffic switch failed"
        if [ "$ROLLBACK_ON_FAILURE" = true ]; then
            rollback "$active_version"
        fi
        exit 1
    fi
    
    log_success "Traffic successfully switched to $inactive_version"
    
    # Monitor for issues
    log_info "Monitoring new deployment for 60 seconds..."
    sleep 60
    
    # Final health check
    if ! health_check "$inactive_version"; then
        log_error "Post-deployment health check failed"
        if [ "$ROLLBACK_ON_FAILURE" = true ]; then
            rollback "$active_version"
        fi
        exit 1
    fi
    
    # Scale down old version
    log_info "Scaling down $active_version deployment..."
    scale_deployment "hotel-booking-$active_version" 0
    
    log_success "Blue-Green deployment completed successfully!"
    log_success "Active version: $inactive_version"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --image-tag)
            NEW_IMAGE_TAG="$2"
            shift 2
            ;;
        --no-rollback)
            ROLLBACK_ON_FAILURE=false
            shift
            ;;
        --timeout)
            DEPLOYMENT_TIMEOUT="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --namespace <namespace>    Kubernetes namespace (default: hotel-booking-production)"
            echo "  --image-tag <tag>         New image tag to deploy"
            echo "  --no-rollback             Disable automatic rollback on failure"
            echo "  --timeout <seconds>       Deployment timeout (default: 600)"
            echo "  -h, --help               Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main deployment
main