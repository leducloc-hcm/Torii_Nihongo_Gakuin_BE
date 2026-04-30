#!/bin/bash
set -e

REGION="ap-southeast-1"
ACCOUNT_ID="942548380551"
REPO_PREFIX="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"
PROJECT="torii-nihongo-gakuin"

echo "Logging into ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $REPO_PREFIX

# 1. API Gateway
echo "Building api-gateway..."
docker build --no-cache -t $PROJECT/api-gateway -f api-gateway/Dockerfile api-gateway
docker tag $PROJECT/api-gateway:latest $REPO_PREFIX/$PROJECT/api-gateway:latest
echo "Pushing api-gateway..."
docker push $REPO_PREFIX/$PROJECT/api-gateway:latest

# 2. Learning Service
echo "Building learning-service..."
docker build --no-cache -t $PROJECT/learning-service -f learning-service/Dockerfile learning-service
docker tag $PROJECT/learning-service:latest $REPO_PREFIX/$PROJECT/learning-service:latest
echo "Pushing learning-service..."
docker push $REPO_PREFIX/$PROJECT/learning-service:latest

# 3. Assessment Service
echo "Building assessment-service..."
docker build --no-cache -t $PROJECT/assessment-service -f assessment-service/Dockerfile assessment-service
docker tag $PROJECT/assessment-service:latest $REPO_PREFIX/$PROJECT/assessment-service:latest
echo "Pushing assessment-service..."
docker push $REPO_PREFIX/$PROJECT/assessment-service:latest

# 4. Gamification Service
echo "Building gamification-service..."
docker build --no-cache -t $PROJECT/gamification-service -f gamification-service/Dockerfile gamification-service
docker tag $PROJECT/gamification-service:latest $REPO_PREFIX/$PROJECT/gamification-service:latest
echo "Pushing gamification-service..."
docker push $REPO_PREFIX/$PROJECT/gamification-service:latest


# 5. API Docs Service
echo "Building api-docs..."
docker build --no-cache -t $PROJECT/api-docs -f api-docs/Dockerfile api-docs
docker tag $PROJECT/api-docs:latest $REPO_PREFIX/$PROJECT/api-docs:latest
echo "Pushing api-docs..."
docker push $REPO_PREFIX/$PROJECT/api-docs:latest

echo "✅ All images pushed successfully!"
echo "ECS will automatically pull these images and start the services shortly."
