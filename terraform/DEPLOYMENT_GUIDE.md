# Terraform Deployment Guide

## Complete Setup Guide for Torii Nihongo Gakuin Microservices

This guide walks you through deploying the complete microservices architecture on AWS using Terraform.

---

## 📋 Prerequisites

### 1. Install Required Tools

- **Terraform** >= 1.5.0 ([Download](https://www.terraform.io/downloads))
- **AWS CLI** >= 2.0 ([Download](https://aws.amazon.com/cli/))
- **Docker** (for building images) ([Download](https://www.docker.com/))

### 2. AWS Account Setup

- AWS account with appropriate permissions
- IAM user with administrator access or specific permissions for:
  - VPC, EC2, ECS, ECR
  - RDS, ElastiCache, Amazon MQ
  - IAM, Secrets Manager
  - CloudWatch, Application Load Balancer

### 3. Configure AWS CLI

```bash
aws configure
# Enter your:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region (e.g., ap-southeast-1)
# - Default output format (json)
```

---

## 🚀 Quick Start Deployment

### Step 1: Configure Terraform Variables

1. Navigate to the terraform directory:

   ```bash
   cd terraform
   ```

2. Edit `terraform.tfvars` with your actual values:

   ```bash
   # Use any text editor
   code terraform.tfvars
   # OR
   nano terraform.tfvars
   ```

3. **CRITICAL**: Update these required variables:

   - `database_password` - Strong password for PostgreSQL
   - `jwt_secret` - Random secure string for JWT signing
   - `access_token_secret` - Random secure string
   - `refresh_token_secret` - Random secure string
   - `admin_password` - Admin user password

   **Generate secure secrets:**

   ```bash
   # Generate random secrets
   openssl rand -base64 32   # For JWT secrets
   openssl rand -base64 24   # For passwords
   ```

### Step 2: Initialize Terraform

```bash
# Initialize Terraform and download providers
terraform init
```

### Step 3: Review Infrastructure Plan

```bash
# See what will be created
terraform plan
```

Review the output carefully. Terraform will create approximately 50+ resources including:

- VPC with public/private subnets across 2 AZs
- RDS PostgreSQL database
- ElastiCache Redis cluster
- Amazon MQ RabbitMQ broker
- ECS cluster with 3 services
- Application Load Balancer
- ECR repositories
- Security groups, IAM roles, etc.

### Step 4: Deploy Infrastructure

```bash
# Apply the Terraform configuration
terraform apply

# Review and type 'yes' when prompted
```

⏱️ **Deployment Time**: 15-25 minutes

The deployment will:

1. Create VPC and networking (2-3 min)
2. Provision RDS database (8-12 min)
3. Set up ElastiCache Redis (5-8 min)
4. Deploy Amazon MQ RabbitMQ (3-5 min)
5. Create ECS cluster and services (2-3 min)

### Step 5: Save Outputs

```bash
# Save important connection details
terraform output > ../deployment-info.txt

# View specific outputs
terraform output alb_dns_name
terraform output ecr_api_gateway_url
```

---

## 🐳 Build and Deploy Application Images

### Step 1: Authenticate Docker to ECR

```bash
# Get ECR login credentials
aws ecr get-login-password --region ap-southeast-1 | docker login --username AWS --password-stdin $(terraform output -raw ecr_api_gateway_url | cut -d'/' -f1)
```

### Step 2: Build and Push Images

Navigate back to project root:

```bash
cd ..
```

#### API Gateway Service

```bash
cd api-gateway
docker build -t torii-api-gateway .
docker tag torii-api-gateway:latest $(cd ../terraform && terraform output -raw ecr_api_gateway_url):latest
docker push $(cd ../terraform && terraform output -raw ecr_api_gateway_url):latest
cd ..
```

#### Learning Service

```bash
cd learning-service
docker build -t torii-learning-service .
docker tag torii-learning-service:latest $(cd ../terraform && terraform output -raw ecr_learning_service_url):latest
docker push $(cd ../terraform && terraform output -raw ecr_learning_service_url):latest
cd ..
```

#### Assessment Service

```bash
cd assessment-service
docker build -t torii-assessment-service .
docker tag torii-assessment-service:latest $(cd ../terraform && terraform output -raw ecr_assessment_service_url):latest
docker push $(cd ../terraform && terraform output -raw ecr_assessment_service_url):latest
cd ..
```

### Step 3: Deploy to ECS

```bash
# Force new deployment of all services
aws ecs update-service --cluster $(cd terraform && terraform output -raw ecs_cluster_name) --service torii-nihongo-gakuin-api-gateway --force-new-deployment

aws ecs update-service --cluster $(cd terraform && terraform output -raw ecs_cluster_name) --service torii-nihongo-gakuin-learning-service --force-new-deployment

aws ecs update-service --cluster $(cd terraform && terraform output -raw ecs_cluster_name) --service torii-nihongo-gakuin-assessment-service --force-new-deployment
```

---

## 🔍 Verify Deployment

### Check Service Status

```bash
cd terraform

# Check ECS services
aws ecs describe-services \
  --cluster $(terraform output -raw ecs_cluster_name) \
  --services torii-nihongo-gakuin-api-gateway torii-nihongo-gakuin-learning-service torii-nihongo-gakuin-assessment-service

# Check running tasks
aws ecs list-tasks --cluster $(terraform output -raw ecs_cluster_name)
```

### Test Application

```bash
# Get ALB URL
ALB_URL=$(terraform output -raw alb_dns_name)

# Test API Gateway health
curl http://$ALB_URL/actuator/health

# Expected: {"status":"UP"}
```

### View Logs

```bash
# View logs for a specific service
aws logs tail /ecs/torii-nihongo-gakuin --follow --filter-pattern "api-gateway"
```

---

## 🗄️ Database Setup

### Connect to RDS PostgreSQL

```bash
cd terraform

# Get database endpoint
DB_ENDPOINT=$(terraform output -raw database_endpoint)
DB_HOST=$(echo $DB_ENDPOINT | cut -d':' -f1)

# Connect using psql (if installed)
psql -h $DB_HOST -U postgres -d torii_db
# Enter password when prompted
```

### Run Database Migrations

The services automatically run migrations on startup:

- **Learning Service**: Prisma migrations for `learning` schema
- **Assessment Service**: Flyway migrations for `assessment` schema

Check service logs to verify migrations completed successfully.

---

## 📊 Monitoring & Maintenance

### CloudWatch Logs

View logs in AWS Console:

1. Navigate to CloudWatch → Log groups
2. Find `/ecs/torii-nihongo-gakuin`
3. Filter by service: `api-gateway`, `learning-service`, or `assessment-service`

### Service Scaling

To scale services, update `terraform.tfvars`:

```hcl
api_gateway_desired_count     = 3  # Scale to 3 instances
learning_service_desired_count = 4
assessment_service_desired_count = 2
```

Then apply:

```bash
terraform apply
```

### Resource Monitoring

```bash
# Check ECS cluster metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ClusterName,Value=$(terraform output -raw ecs_cluster_name) \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

---

## 🔒 Security Best Practices

### 1. Secure Secrets Management

```bash
# Update secrets in AWS Secrets Manager
aws secretsmanager update-secret \
  --secret-id torii-nihongo-gakuin/app/secrets \
  --secret-string '{"jwt_secret":"new-secure-value"}'

# Restart services to pick up new secrets
aws ecs update-service --cluster $(terraform output -raw ecs_cluster_name) --service torii-nihongo-gakuin-api-gateway --force-new-deployment
```

### 2. Restrict Access

Edit `terraform.tfvars`:

```hcl
# Restrict ALB access to specific IPs
allowed_cidr_blocks = ["203.0.113.0/24", "198.51.100.0/24"]
```

### 3. Enable HTTPS (Production)

1. Request ACM certificate for your domain
2. Uncomment HTTPS listener in `alb.tf`
3. Update certificate ARN
4. Apply changes

---

## 🔄 CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to ECS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-southeast-1

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Build and push images
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
        run: |
          # Build and push each service
          # See full implementation in deployment scripts
```

---

## 🧹 Cleanup & Destroy

### To destroy all resources:

```bash
cd terraform

# Review what will be deleted
terraform plan -destroy

# Destroy all resources
terraform destroy

# Type 'yes' when prompted
```

⚠️ **WARNING**: This will permanently delete:

- All databases and data
- Container images in ECR
- All networking resources
- CloudWatch logs

---

## 📝 Troubleshooting

### Issue: Services not starting

**Check task logs:**

```bash
aws ecs describe-tasks --cluster $(terraform output -raw ecs_cluster_name) --tasks $(aws ecs list-tasks --cluster $(terraform output -raw ecs_cluster_name) --query 'taskArns[0]' --output text)
```

**Common causes:**

- Database migrations failing
- Incorrect environment variables
- Network connectivity issues

### Issue: Cannot connect to database

**Verify security groups:**

```bash
# Ensure ECS security group can access RDS
aws ec2 describe-security-groups --filters "Name=group-name,Values=*rds-sg*"
```

### Issue: Container health checks failing

**Check health endpoints:**

```bash
# API Gateway & Assessment Service
curl http://<task-private-ip>:8080/actuator/health

# Learning Service
curl http://<task-private-ip>:4001/health
```

---

## 📚 Additional Resources

- [Terraform AWS Provider Docs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)
- [RDS Performance Insights](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.html)

---

## 🆘 Support

For issues or questions:

1. Check CloudWatch logs for error messages
2. Review Terraform state: `terraform show`
3. Verify AWS resource quotas
4. Check service health in ECS console

---

## 📋 Deployment Checklist

- [ ] AWS CLI configured
- [ ] Terraform installed
- [ ] `terraform.tfvars` updated with all secrets
- [ ] `terraform init` completed
- [ ] `terraform plan` reviewed
- [ ] `terraform apply` successful
- [ ] Docker images built and pushed to ECR
- [ ] ECS services deployed and running
- [ ] Database migrations completed
- [ ] Health checks passing
- [ ] ALB accessible and routing correctly
- [ ] Logs visible in CloudWatch
- [ ] Monitoring configured

---

**Deployment Date**: _Fill in after deployment_  
**Environment**: dev/staging/prod  
**Terraform Version**: `terraform version`  
**AWS Region**: ap-southeast-1
