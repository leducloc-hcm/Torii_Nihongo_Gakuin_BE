# Assessment Service

Spring Boot microservice for handling assessment-related functionality.

## Responsibilities

- **Assessment Catalog**: AssessmentPaper/Test, Sections, Items/Questions, Options
- **Attempts**: Create attempt, submit answers, auto-scoring/manual scoring
- **Results**: Results, feedback, score aggregation
- **Score Profile & Analytics**: Score profiles, history, aggregates, dashboards
- **Caching**: Redis for dashboards and catalog caches

## Database Schema

Uses PostgreSQL with `assessment` schema. Migrations are managed via Flyway.

## Setup

1. Install dependencies:
   ```bash
   ./mvnw clean install
   ```

2. Run Flyway migrations:
   ```bash
   ./mvnw flyway:migrate
   ```

3. Run the service:
   ```bash
   ./mvnw spring-boot:run
   ```

## Environment Variables

- `SPRING_DATASOURCE_URL`: PostgreSQL connection URL with `currentSchema=assessment`
- `SPRING_DATASOURCE_USERNAME`: Database username
- `SPRING_DATASOURCE_PASSWORD`: Database password
- `SPRING_REDIS_HOST`: Redis host
- `SPRING_REDIS_PORT`: Redis port
- `SPRING_RABBITMQ_HOST`: RabbitMQ host
- `SPRING_RABBITMQ_PORT`: RabbitMQ port
- `SPRING_RABBITMQ_USERNAME`: RabbitMQ username
- `SPRING_RABBITMQ_PASSWORD`: RabbitMQ password

## RabbitMQ Events

### Published Events
- `attempt.submitted` - When an attempt is submitted
- `attempt.graded` - When an attempt is graded

### Consumed Events
- `course.enrolled` - From learning-service to gate assessment availability
- `payment.completed` - From learning-service to unlock tests

## API Endpoints

- `/health` - Health check endpoint
- `/assessment/**` - Assessment management endpoints
- `/score-profile/**` - Score profile endpoints

