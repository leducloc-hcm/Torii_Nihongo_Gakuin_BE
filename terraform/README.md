# Terraform Infrastructure for Torii Nihongo Gakuin Microservices

This directory contains Terraform configuration for deploying the microservices architecture to AWS.

## Prerequisites

1. AWS CLI configured with appropriate credentials
2. Terraform >= 1.5.0
3. Access to create VPC, RDS, ElastiCache, ECS, and other AWS resources

## Architecture

- **VPC**: Multi-AZ VPC with public, private, and database subnets
- **RDS PostgreSQL**: Managed PostgreSQL database with separate schemas
- **ElastiCache Redis**: Managed Redis cluster for caching
- **AWS MQ RabbitMQ**: Managed RabbitMQ broker for messaging
- **ECS**: Container orchestration for microservices
- **Application Load Balancer**: HTTP/HTTPS load balancer

## Setup

1. Copy `terraform.tfvars.example` to `terraform.tfvars`:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. Edit `terraform.tfvars` with your values:
   ```hcl
   aws_region = "ap-southeast-1"
   environment = "dev"
   database_password = "your-secure-password"
   jwt_secret = "your-jwt-secret"
   ```

3. Configure S3 backend in `main.tf` (optional but recommended):
   ```hcl
   backend "s3" {
     bucket = "your-terraform-state-bucket"
     key    = "microservices/terraform.tfstate"
     region = "ap-southeast-1"
   }
   ```

4. Initialize Terraform:
   ```bash
   terraform init
   ```

5. Review the plan:
   ```bash
   terraform plan
   ```

6. Apply the configuration:
   ```bash
   terraform apply
   ```

## Outputs

After applying, Terraform will output:
- Database endpoint
- Redis endpoint
- RabbitMQ endpoint
- ALB DNS name
- ECS cluster name

Use these values to configure your microservices.

## Variables

See `variables.tf` for all available variables.

## Security Notes

- Database passwords and JWT secrets should be stored in AWS Secrets Manager or environment variables
- Restrict `allowed_cidr_blocks` in production
- Enable SSL/TLS for ALB in production
- Use AWS WAF for additional security
- Enable VPC Flow Logs for monitoring

## Cost Optimization

- Use smaller instance types for development
- Enable auto-scaling for RDS and ElastiCache
- Use Spot instances for ECS tasks (non-production)
- Set up CloudWatch alarms for cost monitoring

