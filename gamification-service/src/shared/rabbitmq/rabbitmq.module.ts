import { Module, Global, forwardRef } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { RabbitMQService } from "./rabbitmq.service";
import { RabbitMQPublisher } from "./rabbitmq.publisher";
import { RabbitMQConsumer } from "./rabbitmq.consumer";
import { PointsModule } from "src/routes/points/points.module";
import { StreakModule } from "src/routes/streak/streak.module";
import { AchievementModule } from "src/routes/achievement/achievement.module";
import { ActivityLogModule } from "src/routes/activity-log/activity-log.module";
import { LeaderboardModule } from "src/routes/leaderboard/leaderboard.module";

@Global()
@Module({
  imports: [
    ConfigModule,
    forwardRef(() => PointsModule),
    forwardRef(() => StreakModule),
    forwardRef(() => AchievementModule),
    forwardRef(() => ActivityLogModule),
    forwardRef(() => LeaderboardModule),
  ],
  providers: [RabbitMQService, RabbitMQPublisher, RabbitMQConsumer],
  exports: [RabbitMQService, RabbitMQPublisher, RabbitMQConsumer],
})
export class RabbitMQModule {}
