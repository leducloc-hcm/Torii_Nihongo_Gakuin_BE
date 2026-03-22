import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { PointsService } from "./points.service";
import { ActiveUser } from "src/shared/decorators/active-user.decorator";
import { PointsHistoryQueryDTO } from "./points.dto";

@ApiTags("Points")
@ApiBearerAuth()
@Controller("gamification/points")
export class PointsController {
  constructor(private readonly pointsService: PointsService) {}

  @Get("stats")
  @ApiOperation({ summary: "Get current user XP, coins, level" })
  getMyStats(@ActiveUser("userId") userId: number) {
    return this.pointsService.getUserStats(userId);
  }

  @Get("history")
  @ApiOperation({ summary: "Get points history for current user" })
  getMyHistory(
    @ActiveUser("userId") userId: number,
    @Query() query: PointsHistoryQueryDTO,
  ) {
    return this.pointsService.getHistory(userId, query.page, query.limit);
  }
}
