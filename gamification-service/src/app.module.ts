import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { SharedModule } from "./shared/shared.module";
import { RedisModule } from "./shared/redis/redis.module";
import { RabbitMQModule } from "./shared/rabbitmq/rabbitmq.module";
import { PointsModule } from "./routes/points/points.module";
import { StreakModule } from "./routes/streak/streak.module";
import { AchievementModule } from "./routes/achievement/achievement.module";
import { LeaderboardModule } from "./routes/leaderboard/leaderboard.module";
import { RewardModule } from "./routes/reward/reward.module";
import { ActivityLogModule } from "./routes/activity-log/activity-log.module";
import { SeasonalEventModule } from "./routes/seasonal-event/seasonal-event.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    ScheduleModule.forRoot(),
    SharedModule,
    RedisModule,
    RabbitMQModule,
    PointsModule,
    StreakModule,
    AchievementModule,
    LeaderboardModule,
    RewardModule,
    ActivityLogModule,
    SeasonalEventModule,
  ],
})
export class AppModule {}
