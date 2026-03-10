# Production Environment Configuration

environment = "production"
aws_region  = "us-east-1"

# VPC Configuration
vpc_cidr = "10.0.0.0/16"
private_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
public_subnet_cidrs  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

enable_nat_gateway = true
enable_vpn_gateway = true

# Kubernetes Configuration
kubernetes_version = "1.28"

# RDS Configuration - Production sizing
rds_instance_class = "db.r5.xlarge"
rds_allocated_storage = 500
rds_max_allocated_storage = 2000

# Redis Configuration - Production sizing
redis_node_type = "cache.r6g.large"

# Domain Configuration
domain_name = "hotelbooking.com"
create_hosted_zone = true
acm_certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# WAF Configuration
waf_ip_allowlist = []
waf_ip_blocklist = []

# Alert Configuration
alert_subscriptions = [
  {
    protocol = "email"
    endpoint = "ops-team@hotelbooking.com"
  },
  {
    protocol = "sms"
    endpoint = "+1234567890"
  }
]