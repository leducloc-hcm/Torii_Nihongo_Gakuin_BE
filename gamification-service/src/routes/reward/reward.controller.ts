import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from "@nestjs/swagger";
import { RewardService } from "./reward.service";
import { ActiveUser } from "src/shared/decorators/active-user.decorator";
import { IsPublic } from "src/shared/decorators/auth.decorator";
import { CreateRewardDTO, UpdateRewardDTO } from "./reward.dto";

@ApiTags("Rewards")
@ApiBearerAuth()
@Controller("gamification/rewards")
export class RewardController {
  constructor(private readonly rewardService: RewardService) {}

  @Get()
  @IsPublic()
  @ApiOperation({ summary: "List all available rewards" })
  listRewards() {
    return this.rewardService.listRewards();
  }

  @Get("admin")
  @ApiOperation({ summary: "List all rewards including inactive (admin)" })
  listRewardsAdmin() {
    return this.rewardService.listRewardsAdmin();
  }

  @Get("upload-url")
  @ApiOperation({
    summary: "Generate presigned S3 URL for reward image upload",
  })
  @ApiQuery({ name: "filename", required: true })
  @ApiQuery({ name: "contentType", required: true })
  generateUploadUrl(
    @Query("filename") filename: string,
    @Query("contentType") contentType: string,
  ) {
    return this.rewardService.generateImageUploadUrl(filename, contentType);
  }

  @Post()
  @ApiOperation({ summary: "Create a new reward (admin)" })
  createReward(@Body() body: CreateRewardDTO) {
    return this.rewardService.createReward(body);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a reward (admin)" })
  updateReward(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateRewardDTO,
  ) {
    return this.rewardService.updateReward(id, body);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a reward (admin)" })
  deleteReward(@Param("id", ParseIntPipe) id: number) {
    return this.rewardService.deleteReward(id);
  }

  @Post(":id/redeem")
  @ApiOperation({ summary: "Redeem a reward using coins" })
  redeemReward(
    @ActiveUser("userId") userId: number,
    @Param("id", ParseIntPipe) rewardId: number,
  ) {
    return this.rewardService.redeemReward(userId, rewardId);
  }

  @Get("me")
  @ApiOperation({ summary: "Get my reward redemptions" })
  getMyRedemptions(@ActiveUser("userId") userId: number) {
    return this.rewardService.getMyRedemptions(userId);
  }
}
