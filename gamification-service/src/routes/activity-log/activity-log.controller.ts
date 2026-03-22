import { Controller, Get, Query } from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from "@nestjs/swagger";
import { ActivityLogService } from "./activity-log.service";
import { ActiveUser } from "src/shared/decorators/active-user.decorator";

@ApiTags("Activity Log")
@ApiBearerAuth()
@Controller("gamification/activities")
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get()
  @ApiOperation({ summary: "Get my activity log" })
  @ApiQuery({ name: "page", type: Number, required: false })
  @ApiQuery({ name: "limit", type: Number, required: false })
  @ApiQuery({
    name: "type",
    required: false,
    enum: [
      "ATTENDANCE",
      "HOMEWORK",
      "MOCK_TEST",
      "LESSON_COMPLETED",
      "COURSE_ENROLLED",
      "FLASHCARD_GENERATED",
      "QUIZ_COMPLETED",
    ],
  })
  getMyActivities(
    @ActiveUser("userId") userId: number,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 20,
    @Query("type") type?: string,
  ) {
    return this.activityLogService.getMyActivities(
      userId,
      page,
      Math.min(limit, 100),
      type,
    );
  }
}
