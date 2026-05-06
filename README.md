# Torii Nihongo Gakuin - Microservices Architecture

This project contains the microservices architecture for Torii Nihongo Gakuin, split from the monolithic NestJS application.

## Architecture Overview

- **API Gateway** (Spring Cloud Gateway): HTTP routing, JWT verification, CORS, rate limiting
- **learning-service** (NestJS): Auth, users, courses, modules, lessons, enrollments, flashcards, blogs, payments, online classes, AI/MCP
- **assessment-service** (Spring Boot): Assessments, attempts, scoring, score profiles

## Services

### API Gateway

- Port: 8080
- Routes: `/auth`, `/users`, `/courses`, `/blogs`, `/flashcards`, `/payment`, `/online-class`, `/assessment`, `/score-profile`, `/dashboard`
- Responsibilities: JWT verification, CORS, rate limiting, request/response logging

### Learning Service

- Port: 4001
- Database Schema: `learning`
- Responsibilities: Auth, users, courses, modules, lessons, enrollments, flashcards, blogs, payments, online classes, AI/MCP, WebRTC

### Assessment Service

- Port: 4002
- Database Schema: `assessment`
- Responsibilities: Assessments, papers, sections, items, attempts, answers, scoring, score profiles

## Infrastructure

- **PostgreSQL**: Shared database with separate schemas (`learning`, `assessment`)
- **Redis**: Shared cache for hot reads and rate limiting
- **RabbitMQ**: Message broker for domain events
- **AWS**: Infrastructure deployed via Terraform

## Local Development

```bash
# Start all services with Docker Compose
docker-compose up -d

# Or run services individually
cd api-gateway && ./mvnw spring-boot:run
cd learning-service && npm run start:dev
cd assessment-service && ./mvnw spring-boot:run
```

## 🚀 AWS Deployment

**Complete Terraform setup is now available!**

### Quick Start

1. **Read the setup guide**: [TERRAFORM_SETUP_COMPLETE.md](TERRAFORM_SETUP_COMPLETE.md)
2. **Configure secrets**: Edit `terraform/terraform.tfvars`
3. **Deploy infrastructure**:
   ```bash
   cd terraform
   terraform init
   terraform apply
   ```
4. **Deploy applications**:
   ```bash
   ./deploy.ps1  # Windows
   ./deploy.sh   # Linux/Mac
   ```

### Documentation

- 📖 **[TERRAFORM_SETUP_COMPLETE.md](TERRAFORM_SETUP_COMPLETE.md)** - Start here! Overview of the complete setup
- 📘 **[terraform/DEPLOYMENT_GUIDE.md](terraform/DEPLOYMENT_GUIDE.md)** - Detailed deployment instructions with troubleshooting
- 📙 **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Quick commands for common operations

### What's Included

- ✅ Complete VPC with multi-AZ setup
- ✅ RDS PostgreSQL (managed database)
- ✅ ElastiCache Redis (managed cache)
- ✅ Amazon MQ RabbitMQ (managed message broker)
- ✅ ECS Fargate (serverless containers)
- ✅ Application Load Balancer
- ✅ ECR repositories for Docker images
- ✅ CloudWatch logging
- ✅ Secrets Manager integration
- ✅ IAM roles and security groups
- ✅ Automated deployment scripts

**Estimated Cost**: ~$430-510/month for development environment

See [terraform/](terraform/) directory for infrastructure configuration.

# Microservices_Test
