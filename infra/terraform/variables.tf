variable "aws_region" {
  type        = string
  description = "AWS region for all resources"
  default     = "us-east-1"
}

variable "project_name" {
  type        = string
  description = "Short project name used in resource naming"
  default     = "dex-scanner"
}

variable "environment" {
  type        = string
  description = "Deployment environment (e.g. staging, prod)"
  default     = "staging"
}

variable "vpc_cidr" {
  type    = string
  default = "10.40.0.0/16"
}

variable "availability_zones" {
  type    = list(string)
  default = ["us-east-1a", "us-east-1b"]
}

variable "public_subnet_cidrs" {
  type    = list(string)
  default = ["10.40.0.0/24", "10.40.1.0/24"]
}

variable "private_subnet_cidrs" {
  type    = list(string)
  default = ["10.40.10.0/24", "10.40.11.0/24"]
}

variable "db_name" {
  type    = string
  default = "scanner"
}

variable "db_username" {
  type    = string
  default = "scanner"
}

variable "db_password" {
  type        = string
  description = "RDS master password (set via TF_VAR_db_password or terraform.tfvars; never commit)"
  sensitive   = true
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "redis_node_type" {
  type    = string
  default = "cache.t4g.micro"
}

variable "scanner_image" {
  type        = string
  description = "Full container image URI. Defaults to ECR repository :latest"
  default     = ""
}

variable "scanner_desired_count" {
  type    = number
  default = 1
}

variable "scanner_cpu" {
  type    = number
  default = 256
}

variable "scanner_memory" {
  type    = number
  default = 512
}

variable "scan_interval_ms" {
  type    = number
  default = 15000
}

variable "chain_id" {
  type    = number
  default = 1
}

variable "rpc_url" {
  type        = string
  description = "Optional EVM RPC URL. Empty enables synthetic scan mode."
  default     = ""
  sensitive   = true
}

variable "alb_ingress_cidr_blocks" {
  type        = list(string)
  description = "CIDR blocks allowed to reach the public ALB"
  default     = ["0.0.0.0/0"]
}
