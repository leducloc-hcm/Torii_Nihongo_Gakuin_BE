# RabbitMQ Security Group
resource "aws_security_group" "rabbitmq" {
  name        = "${var.project_name}-rabbitmq-sg"
  description = "Security group for RabbitMQ"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5671
    to_port         = 5671
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  ingress {
    from_port       = 15672
    to_port         = 15672
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-rabbitmq-sg"
  }
}

# AWS MQ for RabbitMQ (Managed RabbitMQ)
resource "aws_mq_broker" "main" {
  broker_name        = "${var.project_name}-rabbitmq"
  engine_type        = "RabbitMQ"
  engine_version     = "3.13"
  host_instance_type         = "mq.t3.micro" # Adjust based on needs
  auto_minor_version_upgrade = true

  security_groups = [aws_security_group.rabbitmq.id]
  deployment_mode = "SINGLE_INSTANCE"
  subnet_ids      = [aws_subnet.private[0].id]

  user {
    username = "admin"
    password = random_password.rabbitmq_password.result
  }

  logs {
    general = true
  }

  tags = {
    Name = "${var.project_name}-rabbitmq"
  }
}

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

