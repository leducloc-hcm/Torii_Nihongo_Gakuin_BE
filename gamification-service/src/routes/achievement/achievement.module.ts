import { forwardRef, Module } from "@nestjs/common";
import { AchievementController } from "./achievement.controller";
import { AchievementService } from "./achievement.service";
import { AchievementRepository } from "./achievement.repo";
import { PointsModule } from "../points/points.module";
import { BossBattleModule } from "../boss-battle/boss-battle.module";

@Module({
  imports: [forwardRef(() => PointsModule), forwardRef(() => BossBattleModule)],
  controllers: [AchievementController],
  providers: [AchievementService, AchievementRepository],
  exports: [AchievementService],
})
export class AchievementModule {}
