# RDS Security Group (ECS tasks still need to reach the existing RDS)
resource "aws_security_group" "rds" {
  name        = "${var.project_name}-rds-sg"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
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
    Name = "${var.project_name}-rds-sg"
  }
}

# Use existing RDS instance (already provisioned outside Terraform)
# Endpoint: database.czgcs6yqwtym.ap-southeast-1.rds.amazonaws.com
# Database: postgres
locals {
  rds_endpoint = var.existing_rds_endpoint
  rds_db_name  = var.existing_rds_db_name
}
