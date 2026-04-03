import { Module } from "@nestjs/common";
import { SeasonalEventController } from "./seasonal-event.controller";
import { SeasonalEventService } from "./seasonal-event.service";
import { SeasonalEventRepository } from "./seasonal-event.repo";

@Module({
  controllers: [SeasonalEventController],
  providers: [SeasonalEventService, SeasonalEventRepository],
  exports: [SeasonalEventService],
})
export class SeasonalEventModule {}
