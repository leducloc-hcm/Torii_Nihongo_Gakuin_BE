import { forwardRef, Module } from "@nestjs/common";
import { BossBattleController } from "./boss-battle.controller";
import { BossBattleService } from "./boss-battle.service";
import { BossBattleRepository } from "./boss-battle.repo";
import { PointsModule } from "../points/points.module";
import { AchievementModule } from "../achievement/achievement.module";
import { SeasonalEventModule } from "../seasonal-event/seasonal-event.module";

@Module({
  imports: [
    forwardRef(() => PointsModule),
    forwardRef(() => AchievementModule),
    SeasonalEventModule,
  ],
  controllers: [BossBattleController],
  providers: [BossBattleService, BossBattleRepository],
  exports: [BossBattleService],
})
export class BossBattleModule {}
