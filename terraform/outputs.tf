output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "database_endpoint" {
  description = "RDS endpoint"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "database_url" {
  description = "Database connection URL"
  value       = "postgresql://${var.database_username}:${var.database_password}@${aws_db_instance.main.endpoint}/${aws_db_instance.main.db_name}"
  sensitive   = true
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = aws_elasticache_replication_group.main.configuration_endpoint_address
}

output "rabbitmq_endpoint" {
  description = "RabbitMQ broker endpoint"
  value       = aws_mq_broker.main.instances[0].endpoint
}

output "rabbitmq_amqp_endpoint" {
  description = "RabbitMQ AMQP endpoint"
  value       = aws_mq_broker.main.instances[0].endpoints[0]
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

# Service URLs
output "application_url" {
  description = "Application URL (via ALB)"
  value       = "http://${aws_lb.main.dns_name}"
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
    alb_url              = "http://${aws_lb.main.dns_name}"
    database_host        = split(":", aws_db_instance.main.endpoint)[0]
    redis_host           = aws_elasticache_replication_group.main.configuration_endpoint_address
    rabbitmq_host        = split(":", aws_mq_broker.main.instances[0].endpoints[0])[0]
    ecs_cluster          = aws_ecs_cluster.main.name
    service_discovery_ns = "${var.project_name}.local"
  }
}

