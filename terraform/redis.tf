# Self-hosted Redis on ECS EC2 (replaces ElastiCache for cost savings)

resource "aws_ecs_task_definition" "redis" {
  family                   = "${var.project_name}-redis"
  network_mode             = "host"
  requires_compatibilities = ["EC2"]
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([{
    name      = "redis"
    image     = "redis:7-alpine"
    essential = true
    memory    = 512
    command   = ["redis-server", "--maxmemory", "384mb", "--maxmemory-policy", "allkeys-lru", "--save", "60", "1000", "--appendonly", "yes"]

    portMappings = [{
      containerPort = 6379
      hostPort      = 6379
      protocol      = "tcp"
    }]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "redis"
      }
    }

    healthCheck = {
      command     = ["CMD-SHELL", "redis-cli ping | grep -q PONG || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 10
    }
  }])
}

resource "aws_ecs_service" "redis" {
  name            = "${var.project_name}-redis"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.redis.arn
  desired_count   = 1

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.ec2.name
    weight            = 1
    base              = 0
  }

  depends_on = [aws_ecs_cluster_capacity_providers.main]
}

