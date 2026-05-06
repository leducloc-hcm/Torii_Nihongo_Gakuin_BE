import { Module } from "@nestjs/common";
import { RewardController } from "./reward.controller";
import { RewardService } from "./reward.service";
import { RewardRepository } from "./reward.repo";
import { S3Service } from "src/shared/services/s3.service";

@Module({
  controllers: [RewardController],
  providers: [RewardService, RewardRepository, S3Service],
  exports: [RewardService],
})
export class RewardModule {}
