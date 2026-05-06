import { Module } from "@nestjs/common";
import { RefundController } from "./refund.controller";
import { RefundService } from "./refund.service";
import { RefundRepository } from "./refund.repo";
import { NotificationModule } from "../notification/notification.module";
import { ActivityLogModule } from "../activity-log/activity-log.module";
import { SharedModule } from "src/shared/shared.module";

@Module({
  imports: [NotificationModule, ActivityLogModule, SharedModule],
  controllers: [RefundController],
  providers: [RefundService, RefundRepository],
  exports: [RefundService],
})
export class RefundModule {}
