# Microservices Architecture - Torii Nihongo Gakuin

## Overview

This microservices architecture splits the monolithic NestJS application into three main services with clear separation of concerns.

## Architecture Diagram

```
                    ┌─────────────────┐
                    │   API Gateway   │
                    │  (Spring Cloud) │
                    │   Port: 8080    │
                    └────────┬────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
        ┌───────▼────────┐      ┌─────────▼────────┐
        │ Learning      │      │  Assessment       │
        │ Service       │      │  Service          │
        │ (NestJS)      │      │  (Spring Boot)   │
        │ Port: 4001    │      │  Port: 4002     │
        └───────┬───────┘      └─────────┬────────┘
                │                        │
                └────────────┬───────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
    ┌───▼────┐        ┌─────▼─────┐      ┌──────▼──────┐
    │Postgres│        │   Redis   │      │  RabbitMQ   │
    │  RDS   │        │ ElastiCache│      │   AWS MQ     │
    └────────┘        └───────────┘      └─────────────┘
    Schema:           Cache & Rate        Event Bus
    - learning        Limiting
    - assessment
```

## Services

### 1. API Gateway (Spring Cloud Gateway)

**Port**: 8080  
**Technology**: Spring Boot 3.2, Spring Cloud Gateway

**Responsibilities**:
- HTTP routing to backend services
- JWT token verification
- CORS configuration
- Rate limiting (Redis-based)
- Request/response logging
- Health checks

**Routes**:
- `/auth/**` → learning-service
- `/users/**` → learning-service
- `/courses/**` → learning-service
- `/blogs/**` → learning-service
- `/flashcards/**` → learning-service
- `/payment/**` → learning-service
- `/online-class/**` → learning-service
- `/assessment/**` → assessment-service
- `/score-profile/**` → assessment-service
- `/dashboard/**` → learning-service

**Key Features**:
- JWT authentication filter
- Global logging filter
- Redis-based rate limiting
- Public endpoint bypass

### 2. Learning Service (NestJS)

**Port**: 4001  
**Technology**: NestJS 11, Prisma, PostgreSQL, Redis, RabbitMQ

**Responsibilities**:
- **Auth & Users**: Authentication, user management, roles/permissions, profiles
- **Learning Domain**: Courses, modules, lessons, enrollments, lesson progress
- **Flashcards**: Decks, cards, generation via MCP, suggestions
- **Blog/Content**: Posts, tags, listing
- **Payments**: Orders, payments, coupons, carts
- **Realtime/RTC**: Online classes, signaling, websockets
- **AI/MCP**: Agent endpoints, MCP tool execution, chat sessions
- **Caching**: Redis for hot reads

**Database Schema**: `learning`

**RabbitMQ Events Published**:
- `course.enrolled` - When user enrolls in a course
- `lesson.progressed` - When lesson progress is updated
- `payment.completed` - When payment is completed
- `flashcard.generated` - When flashcards are generated

**RabbitMQ Events Consumed**:
- `attempt.graded` - From assessment-service to update progress/badges

### 3. Assessment Service (Spring Boot)

**Port**: 4002  
**Technology**: Spring Boot 3.2, JPA, Flyway, PostgreSQL, Redis, RabbitMQ

**Responsibilities**:
- **Assessment Catalog**: Papers, sections, items, questions, options
- **Attempts**: Create attempt, submit answers, auto-scoring/manual scoring
- **Results**: Results, feedback, score aggregation
- **Score Profile & Analytics**: Score profiles, history, aggregates, dashboards
- **Caching**: Redis for dashboards and catalog caches

**Database Schema**: `assessment`

**RabbitMQ Events Published**:
- `attempt.submitted` - When an attempt is submitted
- `attempt.graded` - When an attempt is graded

**RabbitMQ Events Consumed**:
- `course.enrolled` - Gate assessment availability
- `payment.completed` - Unlock tests

## Infrastructure

### Database (PostgreSQL)

- **Shared Instance**: Single RDS PostgreSQL instance
- **Schema Separation**:
  - `learning` schema - Learning service data
  - `assessment` schema - Assessment service data
- **Migration Tools**:
  - Learning: Prisma migrations
  - Assessment: Flyway migrations

### Cache (Redis)

- **Shared ElastiCache Cluster**
- **Use Cases**:
  - API Gateway rate limiting counters
  - Learning service: Course lists, blog lists, user dashboards
  - Assessment service: Dashboards, catalog caches
- **Key Namespacing**: `learning:*`, `assessment:*`, `gateway:*`

### Message Broker (RabbitMQ)

- **AWS MQ Managed RabbitMQ**
- **Exchange**: `torii.events` (topic exchange)
- **Event Types**:
  - Domain events for inter-service communication
  - Async processing triggers
  - Event sourcing (optional)

## Deployment

### AWS Infrastructure (Terraform)

**Components**:
- VPC with public, private, and database subnets
- RDS PostgreSQL (multi-AZ)
- ElastiCache Redis
- AWS MQ RabbitMQ
- ECS Cluster for container orchestration
- Application Load Balancer
- Security Groups and IAM roles

**See**: `terraform/` directory for full configuration

### Local Development

**Docker Compose**:
- PostgreSQL
- Redis
- RabbitMQ
- Services (optional, can run locally)

## Data Flow Examples

### User Enrolls in Course

1. Client → API Gateway → Learning Service
2. Learning Service creates enrollment
3. Learning Service publishes `course.enrolled` event
4. Assessment Service consumes event → unlocks assessments

### User Takes Assessment

1. Client → API Gateway → Assessment Service
2. Assessment Service creates attempt
3. User submits answers
4. Assessment Service grades attempt
5. Assessment Service publishes `attempt.graded` event
6. Learning Service consumes event → updates progress/badges

### Payment Completed

1. Client → API Gateway → Learning Service
2. Learning Service processes payment
3. Learning Service publishes `payment.completed` event
4. Assessment Service consumes event → unlocks premium tests

## Security

- **JWT Authentication**: Validated at API Gateway
- **Service-to-Service**: Internal network (VPC)
- **Database**: Schema-level isolation
- **Secrets**: AWS Secrets Manager
- **Network**: Security groups, private subnets

## Monitoring & Observability

- **Logging**: CloudWatch Logs
- **Metrics**: CloudWatch Metrics, ECS Container Insights
- **Tracing**: (Optional) AWS X-Ray
- **Health Checks**: Actuator endpoints, ALB health checks

## Scalability

- **Horizontal Scaling**: ECS auto-scaling
- **Database**: RDS read replicas (if needed)
- **Cache**: Redis cluster mode
- **Load Balancing**: ALB with multiple targets

## Next Steps

1. Complete route migration from monolithic app
2. Implement assessment-service controllers
3. Set up CI/CD pipelines
4. Configure monitoring and alerting
5. Load testing and optimization
6. Gradual rollout strategy

