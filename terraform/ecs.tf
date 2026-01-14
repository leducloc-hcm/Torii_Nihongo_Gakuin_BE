# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "${var.project_name}-cluster"
  }
}

# ECS Security Group
resource "aws_security_group" "ecs" {
  name        = "${var.project_name}-ecs-sg"
  description = "Security group for ECS tasks"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port    = 0
    protocol   = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-ecs-sg"
  }
}

# ECS Task Execution Role
resource "aws_iam_role" "ecs_task_execution" {
  name = "${var.project_name}-ecs-task-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ECS Task Role
resource "aws_iam_role" "ecs_task" {
  name = "${var.project_name}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })
}

# CloudWatch Logs Group
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/${var.project_name}"
  retention_in_days = 7
}

# Additional IAM policies for ECS Task Role
resource "aws_iam_role_policy" "ecs_task_s3" {
  name = "${var.project_name}-ecs-task-s3-policy"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ]
      Resource = [
        "arn:aws:s3:::${var.s3_bucket_name}",
        "arn:aws:s3:::${var.s3_bucket_name}/*"
      ]
    }]
  })
}

resource "aws_iam_role_policy" "ecs_task_secrets" {
  name = "${var.project_name}-ecs-task-secrets-policy"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "secretsmanager:GetSecretValue"
      ]
      Resource = [
        aws_secretsmanager_secret.rabbitmq.arn,
        aws_secretsmanager_secret.app_secrets.arn
      ]
    }]
  })
}

# Secrets Manager for application secrets
resource "aws_secretsmanager_secret" "app_secrets" {
  name = "${var.project_name}/app/secrets"
}

resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id
  secret_string = jsonencode({
    jwt_secret              = var.jwt_secret
    access_token_secret     = var.access_token_secret
    refresh_token_secret    = var.refresh_token_secret
    secret_api_key          = var.secret_api_key
    admin_password          = var.admin_password
    resend_api_key          = var.resend_api_key
    google_client_secret    = var.google_client_secret
    aws_access_key_id       = var.aws_access_key_id
    aws_secret_access_key   = var.aws_secret_access_key
    openai_api_key          = var.openai_api_key
    sepay_access_key        = var.sepay_access_key
    firebase_private_key    = var.firebase_private_key
  })
}

# ===== API GATEWAY =====

resource "aws_ecs_task_definition" "api_gateway" {
  family                   = "${var.project_name}-api-gateway"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "api-gateway"
    image     = "${aws_ecr_repository.api_gateway.repository_url}:latest"
    essential = true

    portMappings = [{
      containerPort = 8080
      protocol      = "tcp"
    }]

    environment = [
      { name = "SPRING_PROFILES_ACTIVE", value = var.environment },
      { name = "SERVER_PORT", value = "8080" },
      { name = "GATEWAY_LEARNING_SERVICE_URL", value = "http://learning-service.${var.project_name}.local:4001" },
      { name = "GATEWAY_ASSESSMENT_SERVICE_URL", value = "http://assessment-service.${var.project_name}.local:4002" },
      { name = "REDIS_HOST", value = aws_elasticache_replication_group.main.configuration_endpoint_address },
      { name = "REDIS_PORT", value = "6379" },
      { name = "REDIS_DB", value = "0" }
    ]

    secrets = [{
      name      = "JWT_SECRET"
      valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:jwt_secret::"
    }]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "api-gateway"
      }
    }

    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:8080/actuator/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }
  }])
}

resource "aws_ecs_service" "api_gateway" {
  name            = "${var.project_name}-api-gateway"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api_gateway.arn
  desired_count   = var.api_gateway_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api_gateway.arn
    container_name   = "api-gateway"
    container_port   = 8080
  }

  service_registries {
    registry_arn = aws_service_discovery_service.api_gateway.arn
  }

  depends_on = [
    aws_lb_listener.http,
    aws_iam_role_policy_attachment.ecs_task_execution
  ]
}

# ===== LEARNING SERVICE =====

resource "aws_ecs_task_definition" "learning_service" {
  family                   = "${var.project_name}-learning-service"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "1024"
  memory                   = "2048"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "learning-service"
    image     = "${aws_ecr_repository.learning_service.repository_url}:latest"
    essential = true

    portMappings = [{
      containerPort = 4001
      protocol      = "tcp"
    }]

    environment = [
      { name = "NODE_ENV", value = var.environment },
      { name = "PORT", value = "4001" },
      { name = "DATABASE_URL", value = "postgresql://${var.database_username}:${var.database_password}@${aws_db_instance.main.endpoint}/${aws_db_instance.main.db_name}?schema=learning" },
      { name = "REDIS_URL", value = "redis://${aws_elasticache_replication_group.main.configuration_endpoint_address}:6379" },
      { name = "REDIS_HOST", value = aws_elasticache_replication_group.main.configuration_endpoint_address },
      { name = "REDIS_PORT", value = "6379" },
      { name = "REDIS_DB", value = "0" },
      { name = "REDIS_TLS", value = "false" },
      { name = "REDIS_TTL", value = "3600" },
      { name = "RABBITMQ_URL", value = "amqp://admin:${random_password.rabbitmq_password.result}@${aws_mq_broker.main.instances[0].endpoints[0]}" },
      { name = "RABBITMQ_HOST", value = split(":", aws_mq_broker.main.instances[0].endpoints[0])[0] },
      { name = "RABBITMQ_PORT", value = "5672" },
      { name = "RABBITMQ_USERNAME", value = "admin" },
      { name = "ACCESS_TOKEN_EXPIRES_IN", value = "1h" },
      { name = "REFRESH_TOKEN_EXPIRES_IN", value = "1d" },
      { name = "ADMIN_NAME", value = var.admin_name },
      { name = "ADMIN_EMAIL", value = var.admin_email },
      { name = "OTP_EXPIRES_IN", value = "5m" },
      { name = "RESEND_FROM_ADDRESS", value = var.resend_from_address },
      { name = "GOOGLE_CLIENT_ID", value = var.google_client_id },
      { name = "GOOGLE_REDIRECT_URI", value = var.google_redirect_uri },
      { name = "GOOGLE_CLIENT_REDIRECT_URI", value = var.google_client_redirect_uri },
      { name = "APP_NAME", value = "Torii Nihongo Gakuin" },
      { name = "FRONTEND_URL", value = var.frontend_url },
      { name = "AWS_REGION", value = var.aws_region },
      { name = "AWS_S3_BUCKET_NAME", value = var.s3_bucket_name },
      { name = "OPENAI_MODEL", value = "gpt-4" },
      { name = "OPENAI_TEMPERATURE", value = "0.3" },
      { name = "OPENAI_MAX_TOKENS", value = "0" },
      { name = "MCP_ENABLED", value = "true" },
      { name = "MCP_TOOL_APPROVAL_REQUIRED", value = "false" },
      { name = "MCP_MAX_TOOL_EXECUTIONS", value = "10" },
      { name = "FIREBASE_PROJECT_ID", value = var.firebase_project_id }
    ]

    secrets = [
      { name = "JWT_SECRET", valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:jwt_secret::" },
      { name = "ACCESS_TOKEN_SECRET", valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:access_token_secret::" },
      { name = "REFRESH_TOKEN_SECRET", valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:refresh_token_secret::" },
      { name = "SECRET_API_KEY", valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:secret_api_key::" },
      { name = "ADMIN_PASSWORD", valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:admin_password::" },
      { name = "RESEND_API_KEY", valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:resend_api_key::" },
      { name = "GOOGLE_CLIENT_SECRET", valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:google_client_secret::" },
      { name = "AWS_ACCESS_KEY_ID", valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:aws_access_key_id::" },
      { name = "AWS_SECRET_ACCESS_KEY", valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:aws_secret_access_key::" },
      { name = "OPENAI_API_KEY", valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:openai_api_key::" },
      { name = "RABBITMQ_PASSWORD", valueFrom = aws_secretsmanager_secret.rabbitmq.arn },
      { name = "SEPAY_ACCESS_KEY", valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:sepay_access_key::" },
      { name = "FIREBASE_PRIVATE_KEY", valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:firebase_private_key::" }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "learning-service"
      }
    }

    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:4001/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }
  }])
}

resource "aws_ecs_service" "learning_service" {
  name            = "${var.project_name}-learning-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.learning_service.arn
  desired_count   = var.learning_service_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.learning_service.arn
    container_name   = "learning-service"
    container_port   = 4001
  }

  service_registries {
    registry_arn = aws_service_discovery_service.learning_service.arn
  }

  depends_on = [
    aws_db_instance.main,
    aws_elasticache_replication_group.main,
    aws_mq_broker.main,
    aws_iam_role_policy_attachment.ecs_task_execution
  ]
}

# ===== ASSESSMENT SERVICE =====

resource "aws_ecs_task_definition" "assessment_service" {
  family                   = "${var.project_name}-assessment-service"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "assessment-service"
    image     = "${aws_ecr_repository.assessment_service.repository_url}:latest"
    essential = true

    portMappings = [{
      containerPort = 4002
      protocol      = "tcp"
    }]

    environment = [
      { name = "SPRING_PROFILES_ACTIVE", value = var.environment },
      { name = "SERVER_PORT", value = "4002" },
      { name = "SPRING_DATASOURCE_URL", value = "jdbc:postgresql://${aws_db_instance.main.endpoint}/${aws_db_instance.main.db_name}?currentSchema=assessment" },
      { name = "SPRING_DATASOURCE_USERNAME", value = var.database_username },
      { name = "SPRING_DATASOURCE_PASSWORD", value = var.database_password },
      { name = "SPRING_DATASOURCE_DRIVER_CLASS_NAME", value = "org.postgresql.Driver" },
      { name = "SPRING_JPA_HIBERNATE_DDL_AUTO", value = "validate" },
      { name = "SPRING_JPA_SHOW_SQL", value = "false" },
      { name = "SPRING_JPA_PROPERTIES_HIBERNATE_DIALECT", value = "org.hibernate.dialect.PostgreSQLDialect" },
      { name = "SPRING_JPA_PROPERTIES_HIBERNATE_DEFAULT_SCHEMA", value = "assessment" },
      { name = "SPRING_JPA_PROPERTIES_HIBERNATE_FORMAT_SQL", value = "true" },
      { name = "SPRING_FLYWAY_ENABLED", value = "true" },
      { name = "SPRING_FLYWAY_SCHEMAS", value = "assessment" },
      { name = "SPRING_FLYWAY_LOCATIONS", value = "classpath:db/migration" },
      { name = "SPRING_FLYWAY_BASELINE_ON_MIGRATE", value = "true" },
      { name = "SPRING_REDIS_HOST", value = aws_elasticache_replication_group.main.configuration_endpoint_address },
      { name = "SPRING_REDIS_PORT", value = "6379" },
      { name = "SPRING_REDIS_DB", value = "0" },
      { name = "SPRING_REDIS_TIMEOUT", value = "2000" },
      { name = "SPRING_RABBITMQ_HOST", value = split(":", aws_mq_broker.main.instances[0].endpoints[0])[0] },
      { name = "SPRING_RABBITMQ_PORT", value = "5672" },
      { name = "SPRING_RABBITMQ_USERNAME", value = "admin" },
      { name = "SPRING_RABBITMQ_VIRTUAL_HOST", value = "/" },
      { name = "SPRING_RABBITMQ_LISTENER_SIMPLE_ACKNOWLEDGE_MODE", value = "auto" },
      { name = "SPRING_RABBITMQ_LISTENER_SIMPLE_RETRY_ENABLED", value = "true" },
      { name = "SPRING_RABBITMQ_LISTENER_SIMPLE_RETRY_MAX_ATTEMPTS", value = "3" }
    ]

    secrets = [{
      name      = "SPRING_RABBITMQ_PASSWORD"
      valueFrom = aws_secretsmanager_secret.rabbitmq.arn
    }]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "assessment-service"
      }
    }

    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:4002/actuator/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }
  }])
}

resource "aws_ecs_service" "assessment_service" {
  name            = "${var.project_name}-assessment-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.assessment_service.arn
  desired_count   = var.assessment_service_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.assessment_service.arn
    container_name   = "assessment-service"
    container_port   = 4002
  }

  service_registries {
    registry_arn = aws_service_discovery_service.assessment_service.arn
  }

  depends_on = [
    aws_db_instance.main,
    aws_elasticache_replication_group.main,
    aws_mq_broker.main,
    aws_iam_role_policy_attachment.ecs_task_execution
  ]
}

# ===== SERVICE DISCOVERY =====

resource "aws_service_discovery_private_dns_namespace" "main" {
  name = "${var.project_name}.local"
  vpc  = aws_vpc.main.id
}

resource "aws_service_discovery_service" "api_gateway" {
  name = "api-gateway"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id
    
    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

resource "aws_service_discovery_service" "learning_service" {
  name = "learning-service"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id
    
    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

resource "aws_service_discovery_service" "assessment_service" {
  name = "assessment-service"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id
    
    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

