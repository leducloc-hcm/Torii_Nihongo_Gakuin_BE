import { Controller, Get, Query } from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from "@nestjs/swagger";
import { LeaderboardService } from "./leaderboard.service";
import { ActiveUser } from "src/shared/decorators/active-user.decorator";
import { IsPublic } from "src/shared/decorators/auth.decorator";

@ApiTags("Leaderboard")
@ApiBearerAuth()
@Controller("gamification/leaderboard")
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  @IsPublic()
  @ApiOperation({ summary: "Get leaderboard" })
  @ApiQuery({ name: "period", enum: ["WEEKLY", "MONTHLY"], required: false })
  @ApiQuery({ name: "limit", type: Number, required: false })
  getLeaderboard(
    @Query("period") period: "WEEKLY" | "MONTHLY" = "WEEKLY",
    @Query("limit") limit: number = 20,
  ) {
    return this.leaderboardService.getLeaderboard(period, Math.min(limit, 100));
  }

  @Get("me")
  @ApiOperation({ summary: "Get my leaderboard rank" })
  @ApiQuery({ name: "period", enum: ["WEEKLY", "MONTHLY"], required: false })
  getMyRank(
    @ActiveUser("userId") userId: number,
    @Query("period") period: "WEEKLY" | "MONTHLY" = "WEEKLY",
  ) {
    return this.leaderboardService.getMyRank(userId, period);
  }
}
