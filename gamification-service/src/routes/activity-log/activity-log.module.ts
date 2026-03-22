import { Module } from "@nestjs/common";
import { ActivityLogController } from "./activity-log.controller";
import { ActivityLogService } from "./activity-log.service";
import { ActivityLogRepository } from "./activity-log.repo";

@Module({
  controllers: [ActivityLogController],
  providers: [ActivityLogService, ActivityLogRepository],
  exports: [ActivityLogService],
})
export class ActivityLogModule {}
