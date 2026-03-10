# Hotel Booking Platform - Production Runbook

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Deployment Procedures](#deployment-procedures)
4. [Monitoring & Alerts](#monitoring--alerts)
5. [Incident Response](#incident-response)
6. [Disaster Recovery](#disaster-recovery)
7. [Security Procedures](#security-procedures)
8. [Maintenance Windows](#maintenance-windows)

## Overview

This runbook provides comprehensive operational procedures for the Hotel Booking Platform production environment.

### Key Contacts

| Role                | Name          | Contact                   | Escalation         |
| ------------------- | ------------- | ------------------------- | ------------------ |
| On-Call Engineer    | Rotation      | PagerDuty                 | Primary            |
| Infrastructure Lead | Team Lead     | slack: #infrastructure    | Secondary          |
| Security Lead       | Security Team | <security@hotelbooking.com> | Security incidents |
| Database Admin      | DBA Team      | slack: #database          | Database issues    |

### Critical Services

- **Application**: <https://hotelbooking.com>
- **API**: <https://api.hotelbooking.com>
- **Admin Panel**: <https://admin.hotelbooking.com>
- **Monitoring**: <https://monitoring.hotelbooking.com>
- **Status Page**: <https://status.hotelbooking.com>

## Architecture

### Infrastructure Overview

```
┌─────────────────────────────────────────────────────┐
│                   CloudFlare CDN                     │
└─────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────┐
│              AWS Application Load Balancer           │
└─────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
┌───────────────┐                    ┌───────────────┐
│  EKS Cluster  │                    │  EKS Cluster  │
│    (Blue)     │                    │   (Green)     │
└───────────────┘                    └───────────────┘
        │                                     │
┌───────────────┐                    ┌───────────────┐
│  PostgreSQL   │                    │     Redis     │
│  (Multi-AZ)   │                    │   (Cluster)   │
└───────────────┘                    └───────────────┘
```

### Key Components

- **Kubernetes**: EKS v1.28
- **Database**: PostgreSQL 15 (RDS Multi-AZ)
- **Cache**: Redis 7 (ElastiCache)
- **Container Registry**: Amazon ECR
- **Monitoring**: Prometheus + Grafana
- **Service Mesh**: Istio
- **CI/CD**: GitHub Actions + ArgoCD

## Deployment Procedures

### Pre-Deployment Checklist

- [ ] All tests passing in CI/CD pipeline
- [ ] Security scans completed (Snyk, Trivy)
- [ ] Compliance checks passed
- [ ] Database migrations tested
- [ ] Rollback plan documented
- [ ] Communication sent to stakeholders

### Deployment Strategies

#### 1. Canary Deployment (Default)

```bash
# Deploy canary release
kubectl apply -f deployment/kubernetes/canary-deployment.yaml

# Monitor canary metrics
./deployment/scripts/monitor-canary.sh --duration 300

# Promote to full deployment
kubectl patch canary hotel-booking-canary -n hotel-booking-production \
  --type merge \
  -p '{"spec":{"analysis":{"maxWeight":100}}}'
```

#### 2. Blue-Green Deployment

```bash
# Execute blue-green deployment
./deployment/scripts/blue-green-deploy.sh \
  --namespace hotel-booking-production \
  --image-tag $NEW_IMAGE_TAG

# Verify deployment
kubectl get service hotel-booking-active -n hotel-booking-production
```

#### 3. Emergency Hotfix

```bash
# Create hotfix branch
git checkout -b hotfix/critical-fix main

# Apply fix and test
# ...

# Deploy directly to production
./deployment/scripts/emergency-deploy.sh \
  --skip-staging \
  --notify-team
```

### Rollback Procedures

#### Automatic Rollback

Triggered automatically when:

- Error rate > 5% for 5 minutes
- Response time > 1s for 5 minutes
- Health checks failing

#### Manual Rollback

```bash
# Rollback deployment
kubectl rollout undo deployment/hotel-booking \
  -n hotel-booking-production

# Verify rollback
kubectl rollout status deployment/hotel-booking \
  -n hotel-booking-production

# For blue-green deployments
./deployment/scripts/blue-green-deploy.sh --rollback
```

## Monitoring & Alerts

### Key Metrics

| Metric               | Threshold | Alert Level | Action               |
| -------------------- | --------- | ----------- | -------------------- |
| Error Rate           | > 5%      | Critical    | Immediate rollback   |
| Response Time (p95)  | > 500ms   | Warning     | Investigate          |
| CPU Usage            | > 80%     | Warning     | Scale up             |
| Memory Usage         | > 85%     | Warning     | Scale up             |
| Database Connections | > 80%     | Critical    | Increase pool        |
| Booking Success Rate | < 95%     | Critical    | Investigate payments |

### Monitoring Dashboards

1. **Application Dashboard**: <https://monitoring.hotelbooking.com/d/app>
2. **Infrastructure Dashboard**: <https://monitoring.hotelbooking.com/d/infra>
3. **Business Metrics**: <https://monitoring.hotelbooking.com/d/business>

### Alert Response

#### Critical Alerts

1. **Acknowledge alert** within 5 minutes
2. **Join incident channel** #incident-YYYY-MM-DD
3. **Follow incident commander** instructions
4. **Update status page** every 30 minutes

#### Warning Alerts

1. **Investigate root cause**
2. **Document findings** in incident tracker
3. **Escalate if needed**

## Incident Response

### Incident Classification

- **P1 (Critical)**: Complete service outage, data loss risk
- **P2 (Major)**: Significant functionality impaired
- **P3 (Minor)**: Minor functionality affected
- **P4 (Low)**: Cosmetic issues

### Incident Response Process

1. **Detection** → Alert triggered or reported
2. **Triage** → Assess severity and impact
3. **Response** → Implement immediate mitigation
4. **Resolution** → Fix root cause
5. **Post-mortem** → Document and learn

### Common Issues & Solutions

#### High Error Rate

```bash
# Check application logs
kubectl logs -n hotel-booking-production -l app=hotel-booking --tail=100

# Check recent deployments
kubectl rollout history deployment/hotel-booking -n hotel-booking-production

# Scale up if load-related
kubectl scale deployment/hotel-booking --replicas=10 -n hotel-booking-production
```

#### Database Issues

```bash
# Check database connections
kubectl exec -n hotel-booking-production deployment/hotel-booking -- \
  psql -h $DB_HOST -U $DB_USER -c "SELECT count(*) FROM pg_stat_activity;"

# Kill long-running queries
kubectl exec -n hotel-booking-production deployment/hotel-booking -- \
  psql -h $DB_HOST -U $DB_USER -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active' AND query_start < now() - interval '5 minutes';"
```

#### Redis Issues

```bash
# Check Redis memory
kubectl exec -n hotel-booking-production deployment/hotel-booking -- \
  redis-cli -h $REDIS_HOST INFO memory

# Flush cache if needed (CAUTION)
kubectl exec -n hotel-booking-production deployment/hotel-booking -- \
  redis-cli -h $REDIS_HOST FLUSHDB
```

## Disaster Recovery

### Backup Schedule

- **Database**: Every 4 hours (30-day retention)
- **Application State**: Daily (7-day retention)
- **Configuration**: On every change (90-day retention)

### Recovery Procedures

#### Database Recovery

```bash
# List available backups
./deployment/scripts/backup-restore.sh list

# Restore to staging for validation
./deployment/scripts/backup-restore.sh restore 20240115-120000 staging

# Restore to production (requires approval)
./deployment/scripts/backup-restore.sh restore 20240115-120000 production
```

#### Full Environment Recovery

```bash
# Provision infrastructure
cd deployment/terraform
terraform apply -var-file=environments/dr.tfvars

# Restore data
./deployment/scripts/dr-restore.sh --environment dr

# Update DNS
./deployment/scripts/update-dns.sh --target dr
```

### RTO/RPO Targets

- **RTO (Recovery Time Objective)**: 15 minutes
- **RPO (Recovery Point Objective)**: 5 minutes

## Security Procedures

### Access Control

```bash
# Grant temporary production access
./deployment/scripts/grant-access.sh \
  --user john.doe@company.com \
  --role read-only \
  --duration 4h

# Revoke access
./deployment/scripts/revoke-access.sh \
  --user john.doe@company.com
```

### Security Scanning

```bash
# Run security audit
./deployment/scripts/security-audit.sh

# Check for vulnerabilities
trivy image hotel-booking:latest

# Review RBAC policies
kubectl auth can-i --list --namespace=hotel-booking-production
```

### Incident Response

1. **Isolate affected systems**
2. **Preserve evidence**
3. **Notify security team**
4. **Follow security runbook**

## Maintenance Windows

### Scheduled Maintenance

- **Time**: Sundays 02:00-06:00 UTC
- **Frequency**: Monthly
- **Notification**: 7 days in advance

### Maintenance Procedures

#### Database Maintenance

```bash
# Enable maintenance mode
kubectl apply -f deployment/kubernetes/maintenance-mode.yaml

# Run maintenance
./deployment/scripts/db-maintenance.sh

# Disable maintenance mode
kubectl delete -f deployment/kubernetes/maintenance-mode.yaml
```

#### Kubernetes Upgrades

```bash
# Drain nodes
kubectl drain node-1 --ignore-daemonsets --delete-emptydir-data

# Upgrade node
eksctl upgrade nodegroup --cluster=hotel-booking-production --name=general

# Uncordon node
kubectl uncordon node-1
```

## Appendix

### Useful Commands

```bash
# Get all pods in production
kubectl get pods -n hotel-booking-production

# Describe deployment
kubectl describe deployment hotel-booking -n hotel-booking-production

# View recent events
kubectl get events -n hotel-booking-production --sort-by='.lastTimestamp'

# Check cluster status
kubectl cluster-info
kubectl top nodes
kubectl top pods -n hotel-booking-production

# Database connection
kubectl run -it --rm psql --image=postgres:15 --restart=Never -- \
  psql -h $DB_HOST -U $DB_USER -d $DB_NAME

# Redis connection
kubectl run -it --rm redis-cli --image=redis:7 --restart=Never -- \
  redis-cli -h $REDIS_HOST
```

### Emergency Contacts

- **AWS Support**: 1-800-xxx-xxxx (Enterprise Support)
- **CloudFlare Support**: <support@cloudflare.com>
- **PagerDuty**: 1-844-700-DUTY

### Documentation Links

- [Architecture Documentation](./ARCHITECTURE.md)
- [API Documentation](../API_DOCUMENTATION.md)
- [Security Policies](./compliance/SECURITY.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)

---

Last Updated: January 2024
Version: 1.0.0
