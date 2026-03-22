import { Module } from "@nestjs/common";
import { StreakController } from "./streak.controller";
import { StreakService } from "./streak.service";
import { StreakRepository } from "./streak.repo";

@Module({
  controllers: [StreakController],
  providers: [StreakService, StreakRepository],
  exports: [StreakService],
})
export class StreakModule {}
