import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { AchievementService } from "./achievement.service";
import { ActiveUser } from "src/shared/decorators/active-user.decorator";
import { IsPublic } from "src/shared/decorators/auth.decorator";
import { CreateAchievementDTO, UpdateAchievementDTO } from "./achievement.dto";

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

  @Patch(":id")
  @ApiOperation({ summary: "Update an achievement definition (admin)" })
  updateAchievement(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateAchievementDTO,
  ) {
    return this.achievementService.updateAchievement(id, body);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete an achievement definition (admin)" })
  deleteAchievement(@Param("id", ParseIntPipe) id: number) {
    return this.achievementService.deleteAchievement(id);
  }
}
