import { Module } from "@nestjs/common";
import { PointsController } from "./points.controller";
import { PointsService } from "./points.service";
import { PointsRepository } from "./points.repo";

@Module({
  controllers: [PointsController],
  providers: [PointsService, PointsRepository],
  exports: [PointsService, PointsRepository],
})
export class PointsModule {}
