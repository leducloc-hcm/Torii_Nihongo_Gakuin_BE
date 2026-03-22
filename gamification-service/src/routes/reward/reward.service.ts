import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { RewardRepository } from "./reward.repo";
import { RedisService } from "src/shared/redis/redis.service";
import { PrismaService } from "src/shared/services/prisma.service";

@Injectable()
export class RewardService {
  constructor(
    private readonly rewardRepo: RewardRepository,
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async listRewards() {
    return this.redisService.getOrSet(
      "gamification:rewards:active",
      () => this.rewardRepo.findAll(),
      300,
    );
  }

  async redeemReward(userId: number, rewardId: number) {
    const reward = await this.rewardRepo.findById(rewardId);
    if (!reward || !reward.isActive) {
      throw new NotFoundException("Reward not found");
    }

    if (reward.stock !== null && reward.stock <= 0) {
      throw new BadRequestException("Reward is out of stock");
    }

    const stats = await this.prisma.userStats.findUnique({ where: { userId } });
    if (!stats || stats.totalCoins < reward.cost) {
      throw new BadRequestException("Not enough coins");
    }

    // Deduct coins and create redemption in a transaction
    const [, redemption] = await this.prisma.$transaction([
      this.prisma.userStats.update({
        where: { userId },
        data: { totalCoins: { decrement: reward.cost } },
      }),
      this.prisma.rewardRedemption.create({
        data: { userId, rewardId },
        include: { reward: true },
      }),
      ...(reward.stock !== null
        ? [
            this.prisma.reward.update({
              where: { id: rewardId },
              data: { stock: { decrement: 1 } },
            }),
          ]
        : []),
    ]);

    await Promise.all([
      this.redisService.del(`gamification:user-stats:${userId}`),
      this.redisService.del("gamification:rewards:active"),
    ]);

    return redemption;
  }

  async getMyRedemptions(userId: number) {
    return this.rewardRepo.getUserRedemptions(userId);
  }
}
