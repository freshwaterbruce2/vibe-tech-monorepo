# Main Terraform Configuration for Hotel Booking Platform
terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }
  
  backend "s3" {
    bucket         = "hotel-booking-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}

# Provider configurations
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "hotel-booking"
      Environment = var.environment
      ManagedBy   = "terraform"
      CostCenter  = var.cost_center
    }
  }
}

# Data sources for existing resources
data "aws_availability_zones" "available" {
  state = "available"
}

# VPC Module for network isolation
module "vpc" {
  source = "./modules/vpc"
  
  project_name         = var.project_name
  environment          = var.environment
  vpc_cidr            = var.vpc_cidr
  availability_zones  = data.aws_availability_zones.available.names
  private_subnet_cidrs = var.private_subnet_cidrs
  public_subnet_cidrs  = var.public_subnet_cidrs
  
  enable_nat_gateway = var.enable_nat_gateway
  enable_vpn_gateway = var.enable_vpn_gateway
  enable_flow_logs   = true
  
  tags = local.common_tags
}

# EKS Cluster Module
module "eks" {
  source = "./modules/eks"
  
  cluster_name    = "${var.project_name}-${var.environment}"
  cluster_version = var.kubernetes_version
  
  vpc_id              = module.vpc.vpc_id
  private_subnet_ids  = module.vpc.private_subnet_ids
  
  # Node groups configuration
  node_groups = {
    general = {
      desired_capacity = var.environment == "production" ? 3 : 2
      min_capacity     = var.environment == "production" ? 3 : 1
      max_capacity     = var.environment == "production" ? 10 : 5
      instance_types   = ["t3.medium", "t3.large"]
      
      labels = {
        Environment = var.environment
        NodeType    = "general"
      }
      
      taints = []
    }
    
    spot = {
      desired_capacity = var.environment == "production" ? 2 : 1
      min_capacity     = 0
      max_capacity     = var.environment == "production" ? 20 : 5
      instance_types   = ["t3.medium", "t3.large", "t3a.medium", "t3a.large"]
      capacity_type    = "SPOT"
      
      labels = {
        Environment = var.environment
        NodeType    = "spot"
        Workload    = "non-critical"
      }
      
      taints = [{
        key    = "spot"
        value  = "true"
        effect = "NoSchedule"
      }]
    }
  }
  
  # OIDC provider for IRSA
  enable_irsa = true
  
  # Cluster addons
  cluster_addons = {
    coredns = {
      addon_version = "v1.10.1-eksbuild.1"
    }
    kube-proxy = {
      addon_version = "v1.28.1-eksbuild.1"
    }
    vpc-cni = {
      addon_version = "v1.15.0-eksbuild.1"
    }
    aws-ebs-csi-driver = {
      addon_version = "v1.24.0-eksbuild.1"
    }
  }
  
  tags = local.common_tags
}

# RDS Module for PostgreSQL
module "rds" {
  source = "./modules/rds"
  
  identifier = "${var.project_name}-${var.environment}"
  
  engine               = "postgres"
  engine_version       = "15.4"
  instance_class       = var.rds_instance_class
  allocated_storage    = var.rds_allocated_storage
  max_allocated_storage = var.rds_max_allocated_storage
  
  database_name = "hotelbooking"
  username      = "dbadmin"
  
  vpc_id                  = module.vpc.vpc_id
  database_subnet_ids     = module.vpc.database_subnet_ids
  allowed_security_groups = [module.eks.cluster_security_group_id]
  
  backup_retention_period = var.environment == "production" ? 30 : 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  multi_az               = var.environment == "production" ? true : false
  deletion_protection    = var.environment == "production" ? true : false
  skip_final_snapshot    = var.environment == "production" ? false : true
  
  enabled_cloudwatch_logs_exports = ["postgresql"]
  
  performance_insights_enabled = var.environment == "production" ? true : false
  monitoring_interval         = var.environment == "production" ? 60 : 0
  
  tags = local.common_tags
}

# ElastiCache Redis Module
module "elasticache" {
  source = "./modules/elasticache"
  
  cluster_id = "${var.project_name}-${var.environment}"
  
  engine               = "redis"
  engine_version       = "7.0"
  node_type           = var.redis_node_type
  num_cache_nodes     = var.environment == "production" ? 3 : 1
  parameter_group_family = "redis7"
  
  vpc_id                  = module.vpc.vpc_id
  subnet_ids              = module.vpc.private_subnet_ids
  allowed_security_groups = [module.eks.cluster_security_group_id]
  
  automatic_failover_enabled = var.environment == "production" ? true : false
  multi_az_enabled          = var.environment == "production" ? true : false
  
  snapshot_retention_limit = var.environment == "production" ? 7 : 1
  snapshot_window         = "03:00-05:00"
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  
  tags = local.common_tags
}

# Application Load Balancer
module "alb" {
  source = "./modules/alb"
  
  name = "${var.project_name}-${var.environment}"
  
  vpc_id              = module.vpc.vpc_id
  public_subnet_ids   = module.vpc.public_subnet_ids
  
  # SSL Certificate
  certificate_arn = var.acm_certificate_arn
  
  # Security rules
  ingress_rules = [
    {
      from_port   = 80
      to_port     = 80
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "HTTP from anywhere"
    },
    {
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "HTTPS from anywhere"
    }
  ]
  
  # Health check configuration
  health_check = {
    enabled             = true
    interval            = 30
    path                = "/health"
    port                = "traffic-port"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 10
    protocol            = "HTTP"
    matcher             = "200"
  }
  
  # Enable access logs
  access_logs = {
    enabled = true
    bucket  = module.s3_logs.bucket_name
    prefix  = "alb"
  }
  
  # Enable deletion protection for production
  enable_deletion_protection = var.environment == "production" ? true : false
  
  # WAF association
  web_acl_id = module.waf.web_acl_id
  
  tags = local.common_tags
}

# S3 Buckets
module "s3_logs" {
  source = "./modules/s3"
  
  bucket_name = "${var.project_name}-${var.environment}-logs"
  
  versioning_enabled = true
  
  lifecycle_rules = [
    {
      id      = "expire-old-logs"
      enabled = true
      
      transition = [
        {
          days          = 30
          storage_class = "STANDARD_IA"
        },
        {
          days          = 90
          storage_class = "GLACIER"
        }
      ]
      
      expiration = {
        days = 365
      }
    }
  ]
  
  server_side_encryption = {
    sse_algorithm = "AES256"
  }
  
  tags = local.common_tags
}

module "s3_backups" {
  source = "./modules/s3"
  
  bucket_name = "${var.project_name}-${var.environment}-backups"
  
  versioning_enabled = true
  
  lifecycle_rules = [
    {
      id      = "backup-retention"
      enabled = true
      
      transition = [
        {
          days          = 7
          storage_class = "STANDARD_IA"
        },
        {
          days          = 30
          storage_class = "GLACIER"
        },
        {
          days          = 90
          storage_class = "DEEP_ARCHIVE"
        }
      ]
      
      expiration = {
        days = 730  # 2 years
      }
    }
  ]
  
  server_side_encryption = {
    sse_algorithm     = "aws:kms"
    kms_master_key_id = module.kms.key_id
  }
  
  tags = local.common_tags
}

# KMS Module for encryption
module "kms" {
  source = "./modules/kms"
  
  alias = "${var.project_name}-${var.environment}"
  
  description = "KMS key for ${var.project_name} ${var.environment} environment"
  
  # Key policy
  key_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow services to use the key"
        Effect = "Allow"
        Principal = {
          Service = [
            "logs.amazonaws.com",
            "s3.amazonaws.com",
            "rds.amazonaws.com"
          ]
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = "*"
      }
    ]
  })
  
  tags = local.common_tags
}

# WAF Module for web application firewall
module "waf" {
  source = "./modules/waf"
  
  name = "${var.project_name}-${var.environment}"
  
  # Managed rule groups
  managed_rule_groups = [
    {
      name            = "AWSManagedRulesCommonRuleSet"
      vendor_name     = "AWS"
      priority        = 1
      override_action = "none"
    },
    {
      name            = "AWSManagedRulesKnownBadInputsRuleSet"
      vendor_name     = "AWS"
      priority        = 2
      override_action = "none"
    },
    {
      name            = "AWSManagedRulesSQLiRuleSet"
      vendor_name     = "AWS"
      priority        = 3
      override_action = "none"
    }
  ]
  
  # Rate limiting
  rate_limit_rules = [
    {
      name     = "RateLimitRule"
      priority = 10
      limit    = 2000
      action   = "block"
    }
  ]
  
  # IP allowlist/blocklist
  ip_sets = {
    allowlist = var.waf_ip_allowlist
    blocklist = var.waf_ip_blocklist
  }
  
  tags = local.common_tags
}

# Route53 Hosted Zone (if managing DNS)
module "route53" {
  source = "./modules/route53"
  count  = var.create_hosted_zone ? 1 : 0
  
  domain_name = var.domain_name
  
  # A records for ALB
  records = [
    {
      name    = var.environment == "production" ? "" : var.environment
      type    = "A"
      alias   = {
        name                   = module.alb.dns_name
        zone_id                = module.alb.zone_id
        evaluate_target_health = true
      }
    },
    {
      name    = var.environment == "production" ? "www" : "www.${var.environment}"
      type    = "A"
      alias   = {
        name                   = module.alb.dns_name
        zone_id                = module.alb.zone_id
        evaluate_target_health = true
      }
    }
  ]
  
  tags = local.common_tags
}

# CloudWatch Monitoring
module "cloudwatch" {
  source = "./modules/cloudwatch"
  
  project_name = var.project_name
  environment  = var.environment
  
  # Log groups
  log_groups = {
    application = {
      name              = "/aws/application/${var.project_name}/${var.environment}"
      retention_in_days = var.environment == "production" ? 90 : 30
    }
    alb = {
      name              = "/aws/alb/${var.project_name}/${var.environment}"
      retention_in_days = var.environment == "production" ? 30 : 7
    }
    waf = {
      name              = "/aws/waf/${var.project_name}/${var.environment}"
      retention_in_days = var.environment == "production" ? 30 : 7
    }
  }
  
  # Alarms
  alarms = {
    high_cpu = {
      metric_name         = "CPUUtilization"
      namespace           = "AWS/ECS"
      statistic           = "Average"
      period              = 300
      evaluation_periods  = 2
      threshold           = 80
      comparison_operator = "GreaterThanThreshold"
      alarm_actions       = [module.sns.topic_arn]
    }
    
    high_memory = {
      metric_name         = "MemoryUtilization"
      namespace           = "AWS/ECS"
      statistic           = "Average"
      period              = 300
      evaluation_periods  = 2
      threshold           = 80
      comparison_operator = "GreaterThanThreshold"
      alarm_actions       = [module.sns.topic_arn]
    }
    
    alb_unhealthy_hosts = {
      metric_name         = "UnHealthyHostCount"
      namespace           = "AWS/ApplicationELB"
      statistic           = "Average"
      period              = 60
      evaluation_periods  = 2
      threshold           = 1
      comparison_operator = "GreaterThanThreshold"
      alarm_actions       = [module.sns.topic_arn]
    }
  }
  
  tags = local.common_tags
}

# SNS Topic for notifications
module "sns" {
  source = "./modules/sns"
  
  name = "${var.project_name}-${var.environment}-alerts"
  
  subscriptions = var.alert_subscriptions
  
  tags = local.common_tags
}

# Secrets Manager for sensitive data
module "secrets_manager" {
  source = "./modules/secrets_manager"
  
  secrets = {
    database_credentials = {
      name        = "${var.project_name}/${var.environment}/database"
      description = "RDS database credentials"
      secret_string = jsonencode({
        username = module.rds.db_username
        password = module.rds.db_password
        host     = module.rds.db_endpoint
        port     = module.rds.db_port
        database = module.rds.db_name
      })
    }
    
    redis_credentials = {
      name        = "${var.project_name}/${var.environment}/redis"
      description = "Redis credentials"
      secret_string = jsonencode({
        host     = module.elasticache.endpoint
        port     = module.elasticache.port
        auth_token = module.elasticache.auth_token
      })
    }
    
    api_keys = {
      name        = "${var.project_name}/${var.environment}/api-keys"
      description = "Third-party API keys"
      secret_string = jsonencode(var.api_keys)
    }
  }
  
  tags = local.common_tags
}

# Backup Module
module "backup" {
  source = "./modules/backup"
  
  backup_plan_name = "${var.project_name}-${var.environment}"
  
  # Backup rules
  rules = [
    {
      name              = "daily_backup"
      schedule          = "cron(0 5 ? * * *)"  # 5 AM UTC daily
      target_vault_name = "${var.project_name}-${var.environment}-backup-vault"
      lifecycle = {
        delete_after       = var.environment == "production" ? 30 : 7
        cold_storage_after = var.environment == "production" ? 7 : null
      }
    },
    {
      name              = "weekly_backup"
      schedule          = "cron(0 5 ? * SUN *)"  # 5 AM UTC on Sundays
      target_vault_name = "${var.project_name}-${var.environment}-backup-vault"
      lifecycle = {
        delete_after       = var.environment == "production" ? 90 : 30
        cold_storage_after = var.environment == "production" ? 30 : null
      }
    }
  ]
  
  # Resources to backup
  selection = {
    name = "backup_selection"
    resources = [
      module.rds.db_arn,
      module.efs.efs_arn
    ]
    
    tags = {
      Backup = "true"
    }
  }
  
  tags = local.common_tags
}

# Outputs
output "vpc_id" {
  value = module.vpc.vpc_id
}

output "eks_cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "alb_dns_name" {
  value = module.alb.dns_name
}

output "rds_endpoint" {
  value     = module.rds.db_endpoint
  sensitive = true
}

output "redis_endpoint" {
  value     = module.elasticache.endpoint
  sensitive = true
}