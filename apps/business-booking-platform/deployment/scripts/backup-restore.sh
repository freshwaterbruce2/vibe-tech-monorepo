#!/bin/bash
# Comprehensive Backup and Disaster Recovery Script for Hotel Booking Platform

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_BUCKET="${BACKUP_BUCKET:-hotel-booking-backups}"
BACKUP_PREFIX="${BACKUP_PREFIX:-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY}"
NOTIFICATION_WEBHOOK="${NOTIFICATION_WEBHOOK}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging functions
log_info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} INFO: $1" | tee -a backup.log
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} SUCCESS: $1" | tee -a backup.log
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} ERROR: $1" | tee -a backup.log
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} WARNING: $1" | tee -a backup.log
}

# Send notification
send_notification() {
    local level="$1"
    local message="$2"
    
    if [ -n "$NOTIFICATION_WEBHOOK" ]; then
        curl -X POST "$NOTIFICATION_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{\"level\":\"$level\",\"message\":\"$message\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" \
            || log_warning "Failed to send notification"
    fi
}

# Create backup directory structure
create_backup_structure() {
    local backup_date="$1"
    local backup_path="$BACKUP_PREFIX/$backup_date"
    
    log_info "Creating backup structure for $backup_date"
    
    # Create local directories
    mkdir -p "/tmp/backup/$backup_path"/{database,redis,configs,volumes,kubernetes}
}

# Backup PostgreSQL database
backup_postgresql() {
    local backup_date="$1"
    local backup_path="$BACKUP_PREFIX/$backup_date/database"
    
    log_info "Starting PostgreSQL backup..."
    
    # Get database credentials from Kubernetes secret
    DB_HOST=$(kubectl get secret database-credentials -n hotel-booking-production -o jsonpath='{.data.host}' | base64 -d)
    DB_PORT=$(kubectl get secret database-credentials -n hotel-booking-production -o jsonpath='{.data.port}' | base64 -d)
    DB_NAME=$(kubectl get secret database-credentials -n hotel-booking-production -o jsonpath='{.data.database}' | base64 -d)
    DB_USER=$(kubectl get secret database-credentials -n hotel-booking-production -o jsonpath='{.data.username}' | base64 -d)
    DB_PASS=$(kubectl get secret database-credentials -n hotel-booking-production -o jsonpath='{.data.password}' | base64 -d)
    
    # Create backup pod
    kubectl run pg-backup-$backup_date \
        --image=postgres:15-alpine \
        --rm \
        -i \
        --restart=Never \
        --namespace=hotel-booking-production \
        --env="PGPASSWORD=$DB_PASS" \
        -- pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --format=custom \
        --compress=9 \
        --verbose \
        --no-owner \
        --no-privileges \
        > "/tmp/backup/$backup_path/database-$backup_date.dump"
    
    # Encrypt backup
    if [ -n "$ENCRYPTION_KEY" ]; then
        openssl enc -aes-256-cbc -salt -in "/tmp/backup/$backup_path/database-$backup_date.dump" \
            -out "/tmp/backup/$backup_path/database-$backup_date.dump.enc" \
            -k "$ENCRYPTION_KEY"
        rm "/tmp/backup/$backup_path/database-$backup_date.dump"
        BACKUP_FILE="/tmp/backup/$backup_path/database-$backup_date.dump.enc"
    else
        BACKUP_FILE="/tmp/backup/$backup_path/database-$backup_date.dump"
    fi
    
    # Upload to S3
    aws s3 cp "$BACKUP_FILE" "s3://$BACKUP_BUCKET/$backup_path/" \
        --storage-class STANDARD_IA \
        --server-side-encryption AES256
    
    log_success "PostgreSQL backup completed"
}

# Backup Redis data
backup_redis() {
    local backup_date="$1"
    local backup_path="$BACKUP_PREFIX/$backup_date/redis"
    
    log_info "Starting Redis backup..."
    
    # Get Redis credentials
    REDIS_HOST=$(kubectl get secret redis-credentials -n hotel-booking-production -o jsonpath='{.data.host}' | base64 -d)
    REDIS_PORT=$(kubectl get secret redis-credentials -n hotel-booking-production -o jsonpath='{.data.port}' | base64 -d)
    REDIS_AUTH=$(kubectl get secret redis-credentials -n hotel-booking-production -o jsonpath='{.data.auth_token}' | base64 -d)
    
    # Trigger Redis BGSAVE
    kubectl run redis-backup-$backup_date \
        --image=redis:7-alpine \
        --rm \
        -i \
        --restart=Never \
        --namespace=hotel-booking-production \
        -- redis-cli \
        -h "$REDIS_HOST" \
        -p "$REDIS_PORT" \
        -a "$REDIS_AUTH" \
        BGSAVE
    
    # Wait for backup to complete
    sleep 30
    
    # Copy RDB file
    kubectl cp hotel-booking-production/redis-pod:/data/dump.rdb "/tmp/backup/$backup_path/redis-$backup_date.rdb"
    
    # Compress and encrypt
    gzip "/tmp/backup/$backup_path/redis-$backup_date.rdb"
    
    if [ -n "$ENCRYPTION_KEY" ]; then
        openssl enc -aes-256-cbc -salt \
            -in "/tmp/backup/$backup_path/redis-$backup_date.rdb.gz" \
            -out "/tmp/backup/$backup_path/redis-$backup_date.rdb.gz.enc" \
            -k "$ENCRYPTION_KEY"
        rm "/tmp/backup/$backup_path/redis-$backup_date.rdb.gz"
        BACKUP_FILE="/tmp/backup/$backup_path/redis-$backup_date.rdb.gz.enc"
    else
        BACKUP_FILE="/tmp/backup/$backup_path/redis-$backup_date.rdb.gz"
    fi
    
    # Upload to S3
    aws s3 cp "$BACKUP_FILE" "s3://$BACKUP_BUCKET/$backup_path/"
    
    log_success "Redis backup completed"
}

# Backup Kubernetes resources
backup_kubernetes() {
    local backup_date="$1"
    local backup_path="$BACKUP_PREFIX/$backup_date/kubernetes"
    
    log_info "Starting Kubernetes resource backup..."
    
    # Backup namespaces
    NAMESPACES=("hotel-booking-production" "hotel-booking-staging")
    
    for ns in "${NAMESPACES[@]}"; do
        log_info "Backing up namespace: $ns"
        
        # Export all resources
        kubectl get all,cm,secret,pvc,ingress,svc,deployment,sts,ds,job,cronjob \
            -n "$ns" \
            -o yaml \
            > "/tmp/backup/$backup_path/$ns-resources-$backup_date.yaml"
        
        # Compress
        gzip "/tmp/backup/$backup_path/$ns-resources-$backup_date.yaml"
        
        # Upload
        aws s3 cp "/tmp/backup/$backup_path/$ns-resources-$backup_date.yaml.gz" \
            "s3://$BACKUP_BUCKET/$backup_path/"
    done
    
    log_success "Kubernetes resource backup completed"
}

# Backup persistent volumes
backup_volumes() {
    local backup_date="$1"
    local backup_path="$BACKUP_PREFIX/$backup_date/volumes"
    
    log_info "Starting persistent volume backup..."
    
    # Get all PVCs
    PVCS=$(kubectl get pvc -n hotel-booking-production -o jsonpath='{.items[*].metadata.name}')
    
    for pvc in $PVCS; do
        log_info "Backing up PVC: $pvc"
        
        # Create snapshot
        kubectl apply -f - <<EOF
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: $pvc-snapshot-$backup_date
  namespace: hotel-booking-production
spec:
  volumeSnapshotClassName: csi-aws-vsc
  source:
    persistentVolumeClaimName: $pvc
EOF
        
        # Wait for snapshot to be ready
        kubectl wait --for=condition=ready \
            volumesnapshot/$pvc-snapshot-$backup_date \
            -n hotel-booking-production \
            --timeout=300s
        
        # Export snapshot metadata
        kubectl get volumesnapshot $pvc-snapshot-$backup_date \
            -n hotel-booking-production \
            -o yaml \
            > "/tmp/backup/$backup_path/$pvc-snapshot-$backup_date.yaml"
    done
    
    # Compress and upload metadata
    tar czf "/tmp/backup/$backup_path/volume-snapshots-$backup_date.tar.gz" \
        -C "/tmp/backup/$backup_path" .
    
    aws s3 cp "/tmp/backup/$backup_path/volume-snapshots-$backup_date.tar.gz" \
        "s3://$BACKUP_BUCKET/$backup_path/"
    
    log_success "Volume backup completed"
}

# Verify backup integrity
verify_backup() {
    local backup_date="$1"
    local backup_path="$BACKUP_PREFIX/$backup_date"
    
    log_info "Verifying backup integrity..."
    
    # Check S3 objects
    aws s3 ls "s3://$BACKUP_BUCKET/$backup_path/" --recursive > /tmp/backup-manifest.txt
    
    # Verify each component
    REQUIRED_BACKUPS=(
        "database/database-$backup_date.dump"
        "redis/redis-$backup_date.rdb"
        "kubernetes/hotel-booking-production-resources-$backup_date.yaml.gz"
        "volumes/volume-snapshots-$backup_date.tar.gz"
    )
    
    local all_present=true
    for backup in "${REQUIRED_BACKUPS[@]}"; do
        if ! grep -q "$backup" /tmp/backup-manifest.txt; then
            log_error "Missing backup: $backup"
            all_present=false
        fi
    done
    
    if [ "$all_present" = true ]; then
        log_success "Backup verification passed"
        return 0
    else
        log_error "Backup verification failed"
        return 1
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log_info "Cleaning up backups older than $RETENTION_DAYS days..."
    
    # Calculate cutoff date
    CUTOFF_DATE=$(date -d "$RETENTION_DAYS days ago" +%Y%m%d)
    
    # List all backup prefixes
    aws s3 ls "s3://$BACKUP_BUCKET/$BACKUP_PREFIX/" | while read -r line; do
        backup_date=$(echo "$line" | awk '{print $2}' | sed 's/\///')
        
        # Check if backup is older than retention period
        if [[ "$backup_date" < "$CUTOFF_DATE" ]]; then
            log_info "Deleting old backup: $backup_date"
            aws s3 rm "s3://$BACKUP_BUCKET/$BACKUP_PREFIX/$backup_date/" --recursive
        fi
    done
    
    log_success "Cleanup completed"
}

# Restore database
restore_postgresql() {
    local backup_date="$1"
    local target_env="${2:-staging}"
    
    log_info "Starting PostgreSQL restore from $backup_date to $target_env..."
    
    # Download backup
    BACKUP_FILE="/tmp/restore/database-$backup_date.dump"
    if [ -n "$ENCRYPTION_KEY" ]; then
        aws s3 cp "s3://$BACKUP_BUCKET/$BACKUP_PREFIX/$backup_date/database/database-$backup_date.dump.enc" \
            "/tmp/restore/database-$backup_date.dump.enc"
        
        openssl enc -aes-256-cbc -d \
            -in "/tmp/restore/database-$backup_date.dump.enc" \
            -out "$BACKUP_FILE" \
            -k "$ENCRYPTION_KEY"
    else
        aws s3 cp "s3://$BACKUP_BUCKET/$BACKUP_PREFIX/$backup_date/database/database-$backup_date.dump" \
            "$BACKUP_FILE"
    fi
    
    # Get target database credentials
    DB_HOST=$(kubectl get secret database-credentials -n hotel-booking-$target_env -o jsonpath='{.data.host}' | base64 -d)
    DB_PORT=$(kubectl get secret database-credentials -n hotel-booking-$target_env -o jsonpath='{.data.port}' | base64 -d)
    DB_NAME=$(kubectl get secret database-credentials -n hotel-booking-$target_env -o jsonpath='{.data.database}' | base64 -d)
    DB_USER=$(kubectl get secret database-credentials -n hotel-booking-$target_env -o jsonpath='{.data.username}' | base64 -d)
    DB_PASS=$(kubectl get secret database-credentials -n hotel-booking-$target_env -o jsonpath='{.data.password}' | base64 -d)
    
    # Create restore pod
    kubectl run pg-restore-$backup_date \
        --image=postgres:15-alpine \
        --rm \
        -i \
        --restart=Never \
        --namespace=hotel-booking-$target_env \
        --env="PGPASSWORD=$DB_PASS" \
        -- pg_restore \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --clean \
        --if-exists \
        --verbose \
        < "$BACKUP_FILE"
    
    log_success "PostgreSQL restore completed"
}

# Main backup function
perform_backup() {
    local backup_date=$(date +%Y%m%d-%H%M%S)
    
    log_info "Starting backup process for $backup_date"
    send_notification "info" "Backup started for $backup_date"
    
    # Create backup structure
    create_backup_structure "$backup_date"
    
    # Perform backups
    backup_postgresql "$backup_date" || {
        send_notification "error" "PostgreSQL backup failed"
        exit 1
    }
    
    backup_redis "$backup_date" || {
        send_notification "error" "Redis backup failed"
        exit 1
    }
    
    backup_kubernetes "$backup_date" || {
        send_notification "error" "Kubernetes backup failed"
        exit 1
    }
    
    backup_volumes "$backup_date" || {
        send_notification "error" "Volume backup failed"
        exit 1
    }
    
    # Verify backup
    if verify_backup "$backup_date"; then
        send_notification "success" "Backup completed successfully for $backup_date"
        
        # Cleanup old backups
        cleanup_old_backups
    else
        send_notification "error" "Backup verification failed for $backup_date"
        exit 1
    fi
    
    # Clean up local files
    rm -rf "/tmp/backup"
    
    log_success "Backup process completed for $backup_date"
}

# Main restore function
perform_restore() {
    local backup_date="$1"
    local target_env="${2:-staging}"
    
    log_info "Starting restore process from $backup_date to $target_env"
    send_notification "info" "Restore started from $backup_date to $target_env"
    
    # Create restore directory
    mkdir -p /tmp/restore
    
    # Restore database
    restore_postgresql "$backup_date" "$target_env" || {
        send_notification "error" "PostgreSQL restore failed"
        exit 1
    }
    
    # Additional restore operations can be added here
    
    send_notification "success" "Restore completed successfully from $backup_date to $target_env"
    log_success "Restore process completed"
}

# Parse command line arguments
case "${1:-}" in
    backup)
        perform_backup
        ;;
    restore)
        if [ -z "${2:-}" ]; then
            log_error "Backup date required for restore"
            echo "Usage: $0 restore <backup-date> [target-env]"
            exit 1
        fi
        perform_restore "$2" "${3:-staging}"
        ;;
    verify)
        if [ -z "${2:-}" ]; then
            log_error "Backup date required for verification"
            echo "Usage: $0 verify <backup-date>"
            exit 1
        fi
        verify_backup "$2"
        ;;
    cleanup)
        cleanup_old_backups
        ;;
    *)
        echo "Usage: $0 {backup|restore|verify|cleanup}"
        echo ""
        echo "Commands:"
        echo "  backup              Perform full backup"
        echo "  restore <date>      Restore from backup"
        echo "  verify <date>       Verify backup integrity"
        echo "  cleanup             Clean up old backups"
        exit 1
        ;;
esac