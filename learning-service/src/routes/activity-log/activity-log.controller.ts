import {
  Controller,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { ActivityLogService } from "./activity-log.service";
import { QueryActivityLogDTO } from "./activity-log.dto";
import { Auth } from "src/shared/decorators/auth.decorator";
import { AuthType } from "src/shared/constants/auth.constant";
import { Roles } from "src/shared/decorators/roles.decorator";
import { RolesGuard } from "src/shared/guards/roles.guard";
import { RoleName } from "src/shared/constants/role.constant";

@Controller("activity-logs")
@UseGuards(RolesGuard)
@Auth([AuthType.Bearer])
@Roles(RoleName.Admin)
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getActivityLogs(@Query() query: QueryActivityLogDTO) {
    return this.activityLogService.findAll(query);
  }

  @Get("summary")
  @HttpCode(HttpStatus.OK)
  async getActionSummary() {
    return this.activityLogService.getActionSummary();
  }
}
