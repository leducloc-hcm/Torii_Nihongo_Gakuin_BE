# Learning Service

NestJS microservice for handling learning-related functionality.

## Responsibilities

- **Auth & Users**: Authentication, user management, roles/permissions, profiles
- **Learning Domain**: Courses, modules, lessons, enrollments, lesson progress
- **Flashcards**: Decks, cards, generation via MCP, suggestions
- **Blog/Content**: Posts, tags, listing
- **Payments**: Orders, payments, coupons, carts
- **Realtime/RTC**: Online classes, signaling, websockets
- **AI/MCP**: Agent endpoints, MCP tool execution, chat sessions
- **Caching**: Redis for hot reads (course lists, blog lists, user dashboards)

## Setup

1. Copy route modules from the monolithic app (`Torii_Nihongo_Gakuin_BE/src/routes/`):
   - auth, profile, course, module, lesson, enrollment, lesson-progress
   - flashcard, blog, tag, cart, payment, coupon
   - online-class, ai-chat, dashboard, notification
   - Remove assessment-related routes

2. Copy shared modules from the monolithic app:
   - `src/shared/` (excluding assessment-specific code)

3. Update Prisma schema:
   - Copy relevant models from monolithic schema
   - Set schema to `learning`
   - Remove assessment-related models

4. Install dependencies:
   ```bash
   npm install
   ```

5. Generate Prisma client:
   ```bash
   npm run prisma:generate
   ```

6. Run migrations:
   ```bash
   npm run prisma:migrate
   ```

## Environment Variables

See `.env.example` for required environment variables.

## Running

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## RabbitMQ Events

### Published Events
- `course.enrolled` - When a user enrolls in a course
- `lesson.progressed` - When lesson progress is updated
- `payment.completed` - When a payment is completed
- `flashcard.generated` - When flashcards are generated

### Consumed Events
- `attempt.graded` - From assessment-service when an attempt is graded

