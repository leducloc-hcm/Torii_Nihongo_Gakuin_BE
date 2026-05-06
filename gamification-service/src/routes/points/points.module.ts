import { Module } from "@nestjs/common";
import { PointsController } from "./points.controller";
import { PointsService } from "./points.service";
import { PointsRepository } from "./points.repo";
import { SeasonalEventModule } from "../seasonal-event/seasonal-event.module";

@Module({
  imports: [SeasonalEventModule],
  controllers: [PointsController],
  providers: [PointsService, PointsRepository],
  exports: [PointsService, PointsRepository],
})
export class PointsModule {}
