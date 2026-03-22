import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { StreakService } from "./streak.service";
import { ActiveUser } from "src/shared/decorators/active-user.decorator";

@ApiTags("Streak")
@ApiBearerAuth()
@Controller("gamification/streak")
export class StreakController {
  constructor(private readonly streakService: StreakService) {}

  @Get()
  @ApiOperation({ summary: "Get current user streak info" })
  getMyStreak(@ActiveUser("userId") userId: number) {
    return this.streakService.getStreak(userId);
  }
}
