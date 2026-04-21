# Self-hosted RabbitMQ on ECS EC2 (replaces Amazon MQ for cost savings)

# Random password for RabbitMQ
resource "random_password" "rabbitmq_password" {
  length           = 16
  special          = true
  override_special = "!@#$%^&*()-_+."
}

# Store RabbitMQ password in Secrets Manager
resource "aws_secretsmanager_secret" "rabbitmq" {
  name = "${var.project_name}/rabbitmq/password"
}

resource "aws_secretsmanager_secret_version" "rabbitmq" {
  secret_id     = aws_secretsmanager_secret.rabbitmq.id
  secret_string = random_password.rabbitmq_password.result
}

resource "aws_ecs_task_definition" "rabbitmq" {
  family                   = "${var.project_name}-rabbitmq"
  network_mode             = "host"
  requires_compatibilities = ["EC2"]
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([{
    name      = "rabbitmq"
    image     = "rabbitmq:3.13-management-alpine"
    essential = true
    memory    = 512

    portMappings = [
      {
        containerPort = 5672
        hostPort      = 5672
        protocol      = "tcp"
      },
      {
        containerPort = 15672
        hostPort      = 15672
        protocol      = "tcp"
      }
    ]

    environment = [
      { name = "RABBITMQ_DEFAULT_USER", value = "admin" },
      { name = "RABBITMQ_DEFAULT_PASS", value = random_password.rabbitmq_password.result }
    ]

    logConfiguration = {
      logDriver = "none"
    }

    healthCheck = {
      command     = ["CMD-SHELL", "rabbitmq-diagnostics -q check_running || exit 1"]
      interval    = 30
      timeout     = 10
      retries     = 3
      startPeriod = 60
    }
  }])
}

resource "aws_ecs_service" "rabbitmq" {
  name            = "${var.project_name}-rabbitmq"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.rabbitmq.arn
  desired_count   = 1

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.ec2.name
    weight            = 1
    base              = 0
  }

  depends_on = [aws_ecs_cluster_capacity_providers.main]
}

