# Gamification Service

NestJS microservice for the Torii Nihongo Gakuin gamification system. Handles XP points, streaks, achievements, leaderboards, and rewards.

## Architecture

- **Port**: 4003
- **Database**: PostgreSQL (shared instance, `gamification` schema)
- **Cache**: Redis (shared instance)
- **Messaging**: RabbitMQ (topic exchange `torii.events`)

## Modules

| Module       | Endpoints                                                                                                | Description                         |
| ------------ | -------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Points       | `GET /gamification/points/stats`, `GET /gamification/points/history`                                     | XP/coin tracking, level progression |
| Streak       | `GET /gamification/streak`                                                                               | Login/activity streak tracking      |
| Achievement  | `GET /gamification/achievements`, `GET /gamification/achievements/me`, `POST /gamification/achievements` | Achievement definitions & unlocking |
| Leaderboard  | `GET /gamification/leaderboard`, `GET /gamification/leaderboard/me`                                      | Weekly/monthly XP leaderboards      |
| Reward       | `GET /gamification/rewards`, `POST /gamification/rewards/:id/redeem`, `GET /gamification/rewards/me`     | Coin-based reward shop              |
| Activity Log | `GET /gamification/activities`                                                                           | Activity history with pagination    |

## Events Consumed (RabbitMQ)

| Event                 | Source             | Action                       |
| --------------------- | ------------------ | ---------------------------- |
| `lesson.progressed`   | learning-service   | +10 XP, streak, achievements |
| `course.enrolled`     | learning-service   | +20 XP, achievements         |
| `attempt.graded`      | assessment-service | +20 XP, streak, achievements |
| `payment.completed`   | learning-service   | +10 XP bonus                 |
| `flashcard.generated` | learning-service   | +5 XP                        |

## Events Published

- `gamification.level.up` — when a user levels up
- `gamification.achievement.unlocked` — when an achievement is unlocked
- `gamification.streak.milestone` — at streak milestones (7, 14, 30, 60, 100, 365 days)

## Setup

```bash
cp .env.example .env
npm install
npx prisma generate
npx prisma db push
npm run start:dev
```

## Docker

```bash
docker compose up gamification-service
```
