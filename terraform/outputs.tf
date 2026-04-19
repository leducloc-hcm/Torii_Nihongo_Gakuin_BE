output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "alb_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = aws_lb.main.dns_name
}

output "ecs_cluster_name" {
  description = "ECS Cluster name"
  value       = aws_ecs_cluster.main.name
}

# ECR Repository URLs
output "ecr_api_gateway_url" {
  description = "ECR repository URL for API Gateway"
  value       = aws_ecr_repository.api_gateway.repository_url
}

output "ecr_learning_service_url" {
  description = "ECR repository URL for Learning Service"
  value       = aws_ecr_repository.learning_service.repository_url
}

output "ecr_assessment_service_url" {
  description = "ECR repository URL for Assessment Service"
  value       = aws_ecr_repository.assessment_service.repository_url
}

output "ecr_gamification_service_url" {
  description = "ECR repository URL for Gamification Service"
  value       = aws_ecr_repository.gamification_service.repository_url
}

# Service URLs
output "application_url" {
  description = "Application URL (via ALB - HTTPS)"
  value       = "https://develop.torii-nihongo-gakuin.io.vn"
}

output "acm_certificate_arn" {
  description = "ACM Certificate ARN"
  value       = aws_acm_certificate.main.arn
}

# Secrets Manager ARNs
output "app_secrets_arn" {
  description = "Application secrets ARN in Secrets Manager"
  value       = aws_secretsmanager_secret.app_secrets.arn
  sensitive   = true
}

output "rabbitmq_password_arn" {
  description = "RabbitMQ password ARN in Secrets Manager"
  value       = aws_secretsmanager_secret.rabbitmq.arn
  sensitive   = true
}

# Connection Information
output "connection_info" {
  description = "Quick reference for connection information"
  value = {
    alb_url       = "http://${aws_lb.main.dns_name}"
    database_host = split(":", local.rds_endpoint)[0]
    database_name = local.rds_db_name
    redis_host    = "localhost (self-hosted on EC2)"
    rabbitmq_host = "localhost (self-hosted on EC2)"
    ecs_cluster   = aws_ecs_cluster.main.name
    ec2_instance  = var.ec2_instance_type
  }
}
