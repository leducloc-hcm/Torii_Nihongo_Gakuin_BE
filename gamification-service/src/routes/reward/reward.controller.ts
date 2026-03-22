import { Controller, Get, Param, ParseIntPipe, Post } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { RewardService } from "./reward.service";
import { ActiveUser } from "src/shared/decorators/active-user.decorator";
import { IsPublic } from "src/shared/decorators/auth.decorator";

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
