# ===== API DOCS SERVICE =====

resource "aws_ecs_task_definition" "api_docs" {
  family                   = "${var.project_name}-api-docs"
  network_mode             = "host"
  requires_compatibilities = ["EC2"]
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name              = "api-docs"
    image             = "${aws_ecr_repository.api_docs.repository_url}:latest"
    essential         = true
    memory            = 256
    memoryReservation = 128
    portMappings = [{
      containerPort = 80
      protocol      = "tcp"
    }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "api-docs"
      }
    }
    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost/ || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 30
    }
  }])
}

resource "aws_ecs_service" "api_docs" {
  name            = "${var.project_name}-api-docs"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api_docs.arn
  desired_count   = 1

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.ec2.name
    weight            = 1
    base              = 0
  }

  depends_on = [
    aws_iam_role_policy_attachment.ecs_task_execution,
    aws_ecs_cluster_capacity_providers.main
  ]
}
# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"

  setting {
    name  = "containerInsights"
    value = "disabled"
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

  # Allow inter-service communication within ECS (service discovery)
  ingress {
    from_port = 0
    to_port   = 65535
    protocol  = "tcp"
    self      = true
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
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

# Allow ECS task execution role to read secrets (needed for secrets in container defs)
resource "aws_iam_role_policy" "ecs_execution_secrets" {
  name = "${var.project_name}-ecs-execution-secrets-policy"
  role = aws_iam_role.ecs_task_execution.id

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
    jwt_secret            = var.jwt_secret
    access_token_secret   = var.access_token_secret
    refresh_token_secret  = var.refresh_token_secret
    secret_api_key        = var.secret_api_key
    admin_password        = var.admin_password
    resend_api_key        = var.resend_api_key
    google_client_secret  = var.google_client_secret
    aws_access_key_id     = var.aws_access_key_id
    aws_secret_access_key = var.aws_secret_access_key
    claude_api_key        = var.claude_api_key
    sepay_access_key      = var.sepay_access_key
    firebase_private_key  = var.firebase_private_key
    payment_api_key       = var.payment_api_key
  })
}

# ===== API GATEWAY (Kong) =====

resource "aws_ecs_task_definition" "api_gateway" {
  family                   = "${var.project_name}-api-gateway"
  network_mode             = "host"
  requires_compatibilities = ["EC2"]
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name              = "api-gateway"
    image             = "${aws_ecr_repository.api_gateway.repository_url}:latest"
    essential         = true
    memory            = 512
    memoryReservation = 256

    portMappings = [{
      containerPort = 8000
      hostPort      = 8000
      protocol      = "tcp"
    }]

    environment = [
      { name = "KONG_DATABASE", value = "off" },
      { name = "KONG_DECLARATIVE_CONFIG", value = "/usr/local/kong/kong.yml" },
      { name = "KONG_PROXY_ACCESS_LOG", value = "/dev/stdout" },
      { name = "KONG_ADMIN_ACCESS_LOG", value = "/dev/stdout" },
      { name = "KONG_PROXY_ERROR_LOG", value = "/dev/stderr" },
      { name = "KONG_ADMIN_ERROR_LOG", value = "/dev/stderr" },
      { name = "KONG_ADMIN_LISTEN", value = "0.0.0.0:8001" },
      { name = "KONG_PROXY_LISTEN", value = "0.0.0.0:8000" },
      { name = "KONG_PLUGINS", value = "bundled,jwt-validator" },
      { name = "REDIS_HOST", value = "localhost" },
      { name = "REDIS_PORT", value = "6379" },
      { name = "REDIS_PASSWORD", value = "" },
      # Host network mode: all services on localhost
      { name = "LEARNING_SERVICE_HOST", value = "localhost" },
      { name = "ASSESSMENT_SERVICE_HOST", value = "localhost" },
      { name = "GAMIFICATION_SERVICE_HOST", value = "localhost" },
      { name = "API_DOCS_HOST", value = "localhost" },
      { name = "REDIS_ECS_HOST", value = "localhost" }
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
      command     = ["CMD-SHELL", "kong health || exit 1"]
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
  desired_count   = 1

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.ec2.name
    weight            = 1
    base              = 0
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api_gateway.arn
    container_name   = "api-gateway"
    container_port   = 8000
  }

  depends_on = [
    aws_lb_listener.http,
    aws_iam_role_policy_attachment.ecs_task_execution,
    aws_ecs_cluster_capacity_providers.main
  ]
}

# ===== LEARNING SERVICE =====

resource "aws_ecs_task_definition" "learning_service" {
  family                   = "${var.project_name}-learning-service"
  network_mode             = "host"
  requires_compatibilities = ["EC2"]
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name              = "learning-service"
    image             = "${aws_ecr_repository.learning_service.repository_url}:latest"
    essential         = true
    memory            = 2048
    memoryReservation = 1024

    portMappings = [{
      containerPort = 4001
      hostPort      = 4001
      protocol      = "tcp"
    }]

    environment = [
      { name = "NODE_ENV", value = var.environment },
      { name = "PORT", value = "4001" },
      { name = "DATABASE_URL", value = "postgresql://${var.database_username}:${var.database_password}@${local.rds_endpoint}/${local.rds_db_name}?schema=learning&sslmode=no-verify" },
      { name = "REDIS_URL", value = "redis://localhost:6379" },
      { name = "REDIS_HOST", value = "localhost" },
      { name = "REDIS_PORT", value = "6379" },
      { name = "REDIS_USERNAME", value = "" },
      { name = "REDIS_PASSWORD", value = "" },
      { name = "REDIS_DB", value = "0" },
      { name = "REDIS_TLS", value = "false" },
      { name = "REDIS_TTL", value = "3600" },
      { name = "RABBITMQ_URL", value = "amqp://admin:${random_password.rabbitmq_password.result}@localhost:5672" },
      { name = "RABBITMQ_HOST", value = "localhost" },
      { name = "RABBITMQ_PORT", value = "5672" },
      { name = "RABBITMQ_USERNAME", value = "admin" },
      { name = "ACCESS_TOKEN_EXPIRES_IN", value = "1h" },
      { name = "REFRESH_TOKEN_EXPIRES_IN", value = "1d" },
      { name = "ADMIN_NAME", value = var.admin_name },
      { name = "ADMIN_EMAIL", value = var.admin_email },
      { name = "ADMIN_PHONE_NUMBER", value = var.admin_phone_number },
      { name = "OTP_EXPIRES_IN", value = "5m" },
      { name = "RESEND_FROM_ADDRESS", value = var.resend_from_address },
      { name = "GOOGLE_CLIENT_ID", value = var.google_client_id },
      { name = "GOOGLE_REDIRECT_URI", value = var.google_redirect_uri },
      { name = "GOOGLE_CLIENT_REDIRECT_URI", value = var.google_client_redirect_uri },
      { name = "APP_NAME", value = "Torii Nihongo Gakuin" },
      { name = "FRONTEND_URL", value = var.frontend_url },
      { name = "AWS_REGION", value = var.aws_region },
      { name = "AWS_S3_BUCKET_NAME", value = var.s3_bucket_name },
      { name = "CLAUDE_MODEL", value = "claude-sonnet-4-20250514" },
      { name = "CLAUDE_TEMPERATURE", value = "0.3" },
      { name = "CLAUDE_MAX_TOKENS", value = "4096" },
      { name = "MCP_ENABLED", value = "true" },
      { name = "MCP_TOOL_APPROVAL_REQUIRED", value = "false" },
      { name = "MCP_MAX_TOOL_EXECUTIONS", value = "10" },
      { name = "MCP_COURSE_SERVER_URL", value = var.mcp_course_server_url },
      { name = "MCP_COURSE_ENABLED", value = "true" },
      { name = "MCP_LESSON_SERVER_URL", value = var.mcp_lesson_server_url },
      { name = "MCP_LESSON_ENABLED", value = "true" },
      { name = "MCP_FLASHCARD_SERVER_URL", value = var.mcp_flashcard_server_url },
      { name = "MCP_FLASHCARD_ENABLED", value = "true" },
      { name = "MCP_BLOG_SERVER_URL", value = var.mcp_blog_server_url },
      { name = "MCP_BLOG_ENABLED", value = "true" },
      { name = "MCP_ENROLLMENT_SERVER_URL", value = var.mcp_enrollment_server_url },
      { name = "MCP_ENROLLMENT_ENABLED", value = "true" },
      { name = "MCP_ASSESSMENT_SERVER_URL", value = var.mcp_assessment_server_url },
      { name = "MCP_ASSESSMENT_ENABLED", value = "true" },
      { name = "MCP_ASSESSMENT_HISTORY_SERVER_URL", value = var.mcp_assessment_history_server_url },
      { name = "MCP_ASSESSMENT_HISTORY_ENABLED", value = "true" },
      { name = "FIREBASE_PROJECT_ID", value = var.firebase_project_id },
      { name = "FIREBASE_CLIENT_EMAIL", value = var.firebase_client_email },
      # Payment (SEPAY)
      { name = "SEPAY_ACCOUNT_NUMBER", value = var.sepay_account_number },
      { name = "SEPAY_BANK_CODE", value = var.sepay_bank_code },
      { name = "SEPAY_API_URL", value = var.sepay_api_url },
      { name = "SEPAY_WEBHOOK_URL", value = var.sepay_webhook_url },
      # Janus WebRTC
      { name = "JANUS_HTTP_URL", value = var.janus_http_url },
      { name = "JANUS_SERVER_URL", value = var.janus_server_url },
      { name = "JANUS_WS_URL", value = var.janus_ws_url },
      { name = "JANUS_ADMIN_SECRET", value = var.janus_admin_secret },
      { name = "JANUS_API_SECRET", value = var.janus_api_secret },
      { name = "JANUS_STUN_URL", value = var.janus_stun_url },
      { name = "JANUS_TURN_URL", value = var.janus_turn_url },
      { name = "JANUS_TURN_USERNAME", value = var.janus_turn_username },
      { name = "JANUS_TURN_PASSWORD", value = var.janus_turn_password },
      { name = "JANUS_SSH_USER", value = var.janus_ssh_user },
      { name = "JANUS_SSH_KEY", value = var.janus_ssh_key }
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
      { name = "CLAUDE_API_KEY", valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:claude_api_key::" },
      { name = "RABBITMQ_PASSWORD", valueFrom = aws_secretsmanager_secret.rabbitmq.arn },
      { name = "SEPAY_ACCESS_KEY", valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:sepay_access_key::" },
      { name = "FIREBASE_PRIVATE_KEY", valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:firebase_private_key::" },
      { name = "PAYMENT_API_KEY", valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:payment_api_key::" }
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
  desired_count   = 1

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.ec2.name
    weight            = 1
    base              = 0
  }

  depends_on = [
    aws_iam_role_policy_attachment.ecs_task_execution,
    aws_ecs_cluster_capacity_providers.main,
    aws_ecs_service.redis,
    aws_ecs_service.rabbitmq
  ]
}

# ===== ASSESSMENT SERVICE =====

resource "aws_ecs_task_definition" "assessment_service" {
  family                   = "${var.project_name}-assessment-service"
  network_mode             = "host"
  requires_compatibilities = ["EC2"]
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name              = "assessment-service"
    image             = "${aws_ecr_repository.assessment_service.repository_url}:latest"
    essential         = true
    memory            = 1024
    memoryReservation = 512

    portMappings = [{
      containerPort = 4002
      hostPort      = 4002
      protocol      = "tcp"
    }]

    environment = [
      { name = "SPRING_PROFILES_ACTIVE", value = var.environment },
      { name = "SERVER_PORT", value = "4002" },
      { name = "SPRING_DATASOURCE_URL", value = "jdbc:postgresql://${local.rds_endpoint}/${local.rds_db_name}?currentSchema=assessment" },
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
      { name = "SPRING_REDIS_HOST", value = "localhost" },
      { name = "SPRING_REDIS_PORT", value = "6379" },
      { name = "SPRING_REDIS_USERNAME", value = "" },
      { name = "SPRING_REDIS_PASSWORD", value = "" },
      { name = "SPRING_REDIS_DB", value = "0" },
      { name = "SPRING_REDIS_TIMEOUT", value = "2000" },
      { name = "SPRING_RABBITMQ_HOST", value = "localhost" },
      { name = "SPRING_RABBITMQ_PORT", value = "5672" },
      { name = "SPRING_RABBITMQ_USERNAME", value = "admin" },
      { name = "SPRING_RABBITMQ_SSL_ENABLED", value = "false" },
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
  desired_count   = 1

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.ec2.name
    weight            = 1
    base              = 0
  }

  depends_on = [
    aws_iam_role_policy_attachment.ecs_task_execution,
    aws_ecs_cluster_capacity_providers.main,
    aws_ecs_service.redis,
    aws_ecs_service.rabbitmq
  ]
}

# ===== GAMIFICATION SERVICE =====

resource "aws_ecs_task_definition" "gamification_service" {
  family                   = "${var.project_name}-gamification-service"
  network_mode             = "host"
  requires_compatibilities = ["EC2"]
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name              = "gamification-service"
    image             = "${aws_ecr_repository.gamification_service.repository_url}:latest"
    essential         = true
    memory            = 1024
    memoryReservation = 512

    portMappings = [{
      containerPort = 4003
      hostPort      = 4003
      protocol      = "tcp"
    }]

    environment = [
      { name = "NODE_ENV", value = var.environment },
      { name = "PORT", value = "4003" },
      { name = "DATABASE_URL", value = "postgresql://${var.database_username}:${var.database_password}@${local.rds_endpoint}/${local.rds_db_name}?schema=gamification&sslmode=no-verify" },
      { name = "REDIS_URL", value = "redis://localhost:6379" },
      { name = "REDIS_HOST", value = "localhost" },
      { name = "REDIS_PORT", value = "6379" },
      { name = "REDIS_USERNAME", value = "" },
      { name = "REDIS_PASSWORD", value = "" },
      { name = "REDIS_DB", value = "0" },
      { name = "REDIS_TLS", value = "false" },
      { name = "RABBITMQ_URL", value = "amqp://admin:${random_password.rabbitmq_password.result}@localhost:5672" },
      { name = "RABBITMQ_HOST", value = "localhost" },
      { name = "RABBITMQ_PORT", value = "5672" },
      { name = "RABBITMQ_USERNAME", value = "admin" }
    ]

    secrets = [
      { name = "ACCESS_TOKEN_SECRET", valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:access_token_secret::" },
      { name = "SECRET_API_KEY", valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:secret_api_key::" },
      { name = "RABBITMQ_PASSWORD", valueFrom = aws_secretsmanager_secret.rabbitmq.arn }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "gamification-service"
      }
    }

    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:4003/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }
  }])
}

resource "aws_ecs_service" "gamification_service" {
  name            = "${var.project_name}-gamification-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.gamification_service.arn
  desired_count   = 1

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.ec2.name
    weight            = 1
    base              = 0
  }

  depends_on = [
    aws_iam_role_policy_attachment.ecs_task_execution,
    aws_ecs_cluster_capacity_providers.main,
    aws_ecs_service.redis,
    aws_ecs_service.rabbitmq
  ]
}
