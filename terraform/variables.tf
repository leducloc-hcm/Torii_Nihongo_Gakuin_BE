variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-southeast-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "torii-nihongo-gakuin"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "database_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "database_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 100
}

variable "database_username" {
  description = "RDS master username"
  type        = string
  default     = "postgres"
}

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.medium"
}

variable "redis_num_cache_nodes" {
  description = "Number of Redis cache nodes"
  type        = number
  default     = 1
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access services"
  type        = list(string)
  default     = ["0.0.0.0/0"] # Restrict in production
}

variable "jwt_secret" {
  description = "JWT secret key"
  type        = string
  sensitive   = true
}

variable "database_password" {
  description = "RDS master password"
  type        = string
  sensitive   = true
}

# ECS Service Scaling Variables
variable "api_gateway_desired_count" {
  description = "Desired count for API Gateway service"
  type        = number
  default     = 2
}

variable "learning_service_desired_count" {
  description = "Desired count for Learning service"
  type        = number
  default     = 2
}

variable "assessment_service_desired_count" {
  description = "Desired count for Assessment service"
  type        = number
  default     = 2
}

# Application Secrets
variable "access_token_secret" {
  description = "Access token secret"
  type        = string
  sensitive   = true
  default     = ""
}

variable "refresh_token_secret" {
  description = "Refresh token secret"
  type        = string
  sensitive   = true
  default     = ""
}

variable "secret_api_key" {
  description = "Secret API key for internal services"
  type        = string
  sensitive   = true
  default     = "toriinihongogakuin"
}

variable "admin_password" {
  description = "Admin user password"
  type        = string
  sensitive   = true
}

variable "admin_name" {
  description = "Admin user name"
  type        = string
  default     = "admin"
}

variable "admin_email" {
  description = "Admin user email"
  type        = string
  default     = "admin@torii-nihongo-gakuin.io.vn"
}

# AWS S3 Configuration
variable "s3_bucket_name" {
  description = "S3 bucket name for file storage"
  type        = string
  default     = "torii-nihongo-storage"
}

variable "aws_access_key_id" {
  description = "AWS Access Key ID for S3"
  type        = string
  sensitive   = true
  default     = ""
}

variable "aws_secret_access_key" {
  description = "AWS Secret Access Key for S3"
  type        = string
  sensitive   = true
  default     = ""
}

# Email Configuration
variable "resend_api_key" {
  description = "Resend API key for email service"
  type        = string
  sensitive   = true
  default     = ""
}

variable "resend_from_address" {
  description = "Resend from email address"
  type        = string
  default     = "noreply@torii-nihongo-gakuin.io.vn"
}

# Google OAuth Configuration
variable "google_client_id" {
  description = "Google OAuth client ID"
  type        = string
  default     = ""
}

variable "google_client_secret" {
  description = "Google OAuth client secret"
  type        = string
  sensitive   = true
  default     = ""
}

variable "google_redirect_uri" {
  description = "Google OAuth redirect URI"
  type        = string
  default     = ""
}

variable "google_client_redirect_uri" {
  description = "Google OAuth client redirect URI"
  type        = string
  default     = ""
}

# Application URLs
variable "frontend_url" {
  description = "Frontend application URL"
  type        = string
  default     = "https://torii-nihongo-gakuin.io.vn"
}

# OpenAI Configuration
variable "openai_api_key" {
  description = "OpenAI API key"
  type        = string
  sensitive   = true
  default     = ""
}

# Payment Configuration
variable "sepay_access_key" {
  description = "Sepay access key for payment processing"
  type        = string
  sensitive   = true
  default     = ""
}

# Firebase Configuration
variable "firebase_project_id" {
  description = "Firebase project ID"
  type        = string
  default     = ""
}

variable "firebase_private_key" {
  description = "Firebase private key"
  type        = string
  sensitive   = true
  default     = ""
}

