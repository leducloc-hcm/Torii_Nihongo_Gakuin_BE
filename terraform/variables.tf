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

# ===== Existing RDS Configuration =====

variable "existing_rds_endpoint" {
  description = "Endpoint of the existing RDS instance (host:port)"
  type        = string
  default     = "database-1.cjo8kkoui65a.ap-southeast-1.rds.amazonaws.com:5432"
}

variable "existing_rds_db_name" {
  description = "Database name on the existing RDS instance"
  type        = string
  default     = "postgres"
}

variable "database_username" {
  description = "RDS master username"
  type        = string
  default     = "postgres"
}

variable "database_password" {
  description = "RDS master password"
  type        = string
  sensitive   = true
}

# ===== EC2 Configuration =====

variable "ec2_instance_type" {
  description = "EC2 instance type for ECS container instances"
  type        = string
  default     = "m7i-flex.large"
}

# ===== Networking =====

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access services"
  type        = list(string)
  default     = ["0.0.0.0/0"] # Restrict in production
}

# ===== Application Secrets =====

variable "jwt_secret" {
  description = "JWT secret key"
  type        = string
  sensitive   = true
}

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

variable "admin_phone_number" {
  description = "Admin phone number"
  type        = string
  default     = ""
}

# ===== AWS S3 Configuration =====

variable "s3_bucket_name" {
  description = "S3 bucket name for file storage"
  type        = string
  default     = "torii-nihongo-storage-v2"
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

# ===== Email Configuration =====

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

# ===== Google OAuth Configuration =====

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

# ===== Application URLs =====

variable "frontend_url" {
  description = "Frontend application URL"
  type        = string
  default     = "https://torii-nihongo-gakuin.io.vn"
}

# ===== Claude (Anthropic) Configuration =====

variable "claude_api_key" {
  description = "Claude (Anthropic) API key"
  type        = string
  sensitive   = true
  default     = ""
}

# ===== Payment Configuration (SEPAY) =====

variable "sepay_access_key" {
  description = "Sepay access key for payment processing"
  type        = string
  sensitive   = true
  default     = ""
}

variable "sepay_account_number" {
  description = "Sepay account number"
  type        = string
  default     = ""
}

variable "sepay_bank_code" {
  description = "Sepay bank code"
  type        = string
  default     = ""
}

variable "sepay_api_url" {
  description = "Sepay API URL"
  type        = string
  default     = "https://my.sepay.vn/userapi/transactions/create"
}

variable "sepay_webhook_url" {
  description = "Sepay webhook URL"
  type        = string
  default     = ""
}

variable "payment_api_key" {
  description = "Payment API key"
  type        = string
  sensitive   = true
  default     = ""
}

# ===== Firebase Configuration =====

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

variable "firebase_client_email" {
  description = "Firebase client email"
  type        = string
  default     = ""
}

# ===== Janus WebRTC Configuration =====

variable "janus_http_url" {
  description = "Janus HTTP URL"
  type        = string
  default     = ""
}

variable "janus_server_url" {
  description = "Janus server URL"
  type        = string
  default     = ""
}

variable "janus_ws_url" {
  description = "Janus WebSocket URL"
  type        = string
  default     = ""
}

variable "janus_admin_secret" {
  description = "Janus admin secret"
  type        = string
  sensitive   = true
  default     = ""
}

variable "janus_api_secret" {
  description = "Janus API secret"
  type        = string
  sensitive   = true
  default     = ""
}

variable "janus_stun_url" {
  description = "Janus STUN URL"
  type        = string
  default     = ""
}

variable "janus_turn_url" {
  description = "Janus TURN URL"
  type        = string
  default     = ""
}

variable "janus_turn_username" {
  description = "Janus TURN username"
  type        = string
  default     = ""
}

variable "janus_turn_password" {
  description = "Janus TURN password"
  type        = string
  sensitive   = true
  default     = ""
}

variable "janus_ssh_user" {
  description = "Janus SSH user"
  type        = string
  default     = ""
}

variable "janus_ssh_key" {
  description = "Janus SSH key"
  type        = string
  sensitive   = true
  default     = ""
}

# ===== MCP Server Configuration =====

variable "mcp_course_server_url" {
  description = "MCP Course Server URL"
  type        = string
  default     = ""
}

variable "mcp_lesson_server_url" {
  description = "MCP Lesson Server URL"
  type        = string
  default     = ""
}

variable "mcp_flashcard_server_url" {
  description = "MCP Flashcard Server URL"
  type        = string
  default     = ""
}

variable "mcp_blog_server_url" {
  description = "MCP Blog Server URL"
  type        = string
  default     = ""
}

variable "mcp_enrollment_server_url" {
  description = "MCP Enrollment Server URL"
  type        = string
  default     = ""
}

variable "mcp_assessment_server_url" {
  description = "MCP Assessment Server URL"
  type        = string
  default     = ""
}

variable "mcp_assessment_history_server_url" {
  description = "MCP Assessment History Server URL"
  type        = string
  default     = ""
}
