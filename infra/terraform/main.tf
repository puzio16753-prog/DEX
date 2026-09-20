terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

module "vpc" {
  source = "./modules/vpc"

  name_prefix          = local.name_prefix
  cidr_block           = var.vpc_cidr
  azs                  = var.availability_zones
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
}

module "ecr" {
  source = "./modules/ecr"

  repository_name = "${local.name_prefix}-scanner"
}

module "rds" {
  source = "./modules/rds"

  name_prefix         = local.name_prefix
  vpc_id              = module.vpc.vpc_id
  private_subnet_ids  = module.vpc.private_subnet_ids
  allowed_cidr_blocks = [var.vpc_cidr]
  db_name             = var.db_name
  db_username         = var.db_username
  db_password         = var.db_password
  instance_class      = var.db_instance_class
}

module "elasticache" {
  source = "./modules/elasticache"

  name_prefix         = local.name_prefix
  vpc_id              = module.vpc.vpc_id
  private_subnet_ids  = module.vpc.private_subnet_ids
  allowed_cidr_blocks = [var.vpc_cidr]
  node_type           = var.redis_node_type
}

module "ecs" {
  source = "./modules/ecs"

  name_prefix             = local.name_prefix
  vpc_id                  = module.vpc.vpc_id
  public_subnet_ids       = module.vpc.public_subnet_ids
  private_subnet_ids      = module.vpc.private_subnet_ids
  container_image         = var.scanner_image != "" ? var.scanner_image : "${module.ecr.repository_url}:latest"
  container_port          = 8080
  desired_count           = var.scanner_desired_count
  cpu                     = var.scanner_cpu
  memory                  = var.scanner_memory
  database_url            = module.rds.connection_url
  redis_url               = module.elasticache.redis_url
  scan_interval_ms        = var.scan_interval_ms
  chain_id                = var.chain_id
  rpc_url                 = var.rpc_url
  alb_ingress_cidr_blocks = var.alb_ingress_cidr_blocks
}
