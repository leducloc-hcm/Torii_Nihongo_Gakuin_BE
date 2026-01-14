#!/bin/bash

# Deployment script for Torii Nihongo Gakuin Microservices
# This script builds Docker images and pushes them to AWS ECR

set -e  # Exit on any error

echo "================================================"
echo "Torii Nihongo Gakuin - Docker Build & Deploy"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -d "terraform" ]; then
    echo -e "${RED}Error: terraform directory not found. Please run this script from the project root.${NC}"
    exit 1
fi

# Navigate to terraform directory to get outputs
cd terraform

echo -e "${YELLOW}Fetching ECR repository URLs from Terraform...${NC}"

# Get ECR URLs from Terraform output
ECR_API_GATEWAY=$(terraform output -raw ecr_api_gateway_url 2>/dev/null)
ECR_LEARNING=$(terraform output -raw ecr_learning_service_url 2>/dev/null)
ECR_ASSESSMENT=$(terraform output -raw ecr_assessment_service_url 2>/dev/null)
AWS_REGION=$(terraform output -json connection_info 2>/dev/null | jq -r '.aws_region // "ap-southeast-1"')

if [ -z "$ECR_API_GATEWAY" ] || [ -z "$ECR_LEARNING" ] || [ -z "$ECR_ASSESSMENT" ]; then
    echo -e "${RED}Error: Could not fetch ECR URLs. Make sure Terraform has been applied successfully.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ ECR URLs retrieved successfully${NC}"
echo "  API Gateway: $ECR_API_GATEWAY"
echo "  Learning Service: $ECR_LEARNING"
echo "  Assessment Service: $ECR_ASSESSMENT"
echo ""

# Get AWS account ID and region
AWS_ACCOUNT_ID=$(echo $ECR_API_GATEWAY | cut -d'.' -f1)
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

echo -e "${YELLOW}Authenticating Docker with AWS ECR...${NC}"

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Successfully authenticated with ECR${NC}"
else
    echo -e "${RED}Error: Failed to authenticate with ECR${NC}"
    exit 1
fi

echo ""
cd ..

# Function to build and push service
build_and_push() {
    local SERVICE_NAME=$1
    local SERVICE_DIR=$2
    local ECR_URL=$3
    
    echo "================================================"
    echo -e "${YELLOW}Building $SERVICE_NAME...${NC}"
    echo "================================================"
    
    if [ ! -d "$SERVICE_DIR" ]; then
        echo -e "${RED}Error: Directory $SERVICE_DIR not found${NC}"
        return 1
    fi
    
    cd $SERVICE_DIR
    
    # Build Docker image
    echo "Building Docker image..."
    docker build -t $SERVICE_NAME:latest .
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to build $SERVICE_NAME${NC}"
        cd ..
        return 1
    fi
    
    echo -e "${GREEN}✓ Built $SERVICE_NAME successfully${NC}"
    
    # Tag image
    echo "Tagging image for ECR..."
    docker tag $SERVICE_NAME:latest $ECR_URL:latest
    
    # Push to ECR
    echo "Pushing to ECR..."
    docker push $ECR_URL:latest
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to push $SERVICE_NAME to ECR${NC}"
        cd ..
        return 1
    fi
    
    echo -e "${GREEN}✓ Pushed $SERVICE_NAME to ECR successfully${NC}"
    echo ""
    
    cd ..
    return 0
}

# Build and push each service
build_and_push "torii-api-gateway" "api-gateway" "$ECR_API_GATEWAY"
API_RESULT=$?

build_and_push "torii-learning-service" "learning-service" "$ECR_LEARNING"
LEARNING_RESULT=$?

build_and_push "torii-assessment-service" "assessment-service" "$ECR_ASSESSMENT"
ASSESSMENT_RESULT=$?

echo "================================================"
echo "Build Summary"
echo "================================================"

if [ $API_RESULT -eq 0 ]; then
    echo -e "${GREEN}✓ API Gateway: SUCCESS${NC}"
else
    echo -e "${RED}✗ API Gateway: FAILED${NC}"
fi

if [ $LEARNING_RESULT -eq 0 ]; then
    echo -e "${GREEN}✓ Learning Service: SUCCESS${NC}"
else
    echo -e "${RED}✗ Learning Service: FAILED${NC}"
fi

if [ $ASSESSMENT_RESULT -eq 0 ]; then
    echo -e "${GREEN}✓ Assessment Service: SUCCESS${NC}"
else
    echo -e "${RED}✗ Assessment Service: FAILED${NC}"
fi

echo ""

# Deploy to ECS if all builds succeeded
if [ $API_RESULT -eq 0 ] && [ $LEARNING_RESULT -eq 0 ] && [ $ASSESSMENT_RESULT -eq 0 ]; then
    echo -e "${YELLOW}All images built successfully. Deploying to ECS...${NC}"
    echo ""
    
    cd terraform
    ECS_CLUSTER=$(terraform output -raw ecs_cluster_name)
    cd ..
    
    echo "Updating ECS services..."
    
    aws ecs update-service \
        --cluster $ECS_CLUSTER \
        --service torii-nihongo-gakuin-api-gateway \
        --force-new-deployment \
        --region $AWS_REGION \
        > /dev/null
    
    aws ecs update-service \
        --cluster $ECS_CLUSTER \
        --service torii-nihongo-gakuin-learning-service \
        --force-new-deployment \
        --region $AWS_REGION \
        > /dev/null
    
    aws ecs update-service \
        --cluster $ECS_CLUSTER \
        --service torii-nihongo-gakuin-assessment-service \
        --force-new-deployment \
        --region $AWS_REGION \
        > /dev/null
    
    echo -e "${GREEN}✓ ECS services updated. Deployment in progress...${NC}"
    echo ""
    echo "Monitor deployment status:"
    echo "  aws ecs describe-services --cluster $ECS_CLUSTER --services torii-nihongo-gakuin-api-gateway torii-nihongo-gakuin-learning-service torii-nihongo-gakuin-assessment-service"
    echo ""
    echo "View logs:"
    echo "  aws logs tail /ecs/torii-nihongo-gakuin --follow"
else
    echo -e "${RED}Some builds failed. Please fix errors and try again.${NC}"
    exit 1
fi

echo "================================================"
echo -e "${GREEN}Deployment script completed successfully!${NC}"
echo "================================================"
