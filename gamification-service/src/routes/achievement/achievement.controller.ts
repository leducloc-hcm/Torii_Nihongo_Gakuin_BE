import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { AchievementService } from "./achievement.service";
import { ActiveUser } from "src/shared/decorators/active-user.decorator";
import { IsPublic } from "src/shared/decorators/auth.decorator";
import { CreateAchievementDTO } from "./achievement.dto";

@ApiTags("Achievements")
@ApiBearerAuth()
@Controller("gamification/achievements")
export class AchievementController {
  constructor(private readonly achievementService: AchievementService) {}

  @Get()
  @IsPublic()
  @ApiOperation({ summary: "Get all achievement definitions" })
  getAllAchievements() {
    return this.achievementService.getAllAchievements();
  }

  @Get("me")
  @ApiOperation({ summary: "Get current user unlocked achievements" })
  getMyAchievements(@ActiveUser("userId") userId: number) {
    return this.achievementService.getUserAchievements(userId);
  }

  @Post()
  @ApiOperation({ summary: "Create a new achievement definition (admin)" })
  createAchievement(@Body() body: CreateAchievementDTO) {
    return this.achievementService.createAchievement(body);
  }
}
