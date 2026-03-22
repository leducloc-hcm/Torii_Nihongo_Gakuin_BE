import { Module } from "@nestjs/common";
import { RewardController } from "./reward.controller";
import { RewardService } from "./reward.service";
import { RewardRepository } from "./reward.repo";

@Module({
  controllers: [RewardController],
  providers: [RewardService, RewardRepository],
  exports: [RewardService],
})
export class RewardModule {}
