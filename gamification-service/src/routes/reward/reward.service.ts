import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomBytes } from "crypto";
import { RewardRepository } from "./reward.repo";
import { RedisService } from "src/shared/redis/redis.service";
import { PrismaService } from "src/shared/services/prisma.service";
import { S3Service } from "src/shared/services/s3.service";
import { RabbitMQPublisher } from "src/shared/rabbitmq/rabbitmq.publisher";
import { CreateRewardInputType, UpdateRewardInputType } from "./reward.model";

@Injectable()
export class RewardService {
  constructor(
    private readonly rewardRepo: RewardRepository,
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly rabbitMQPublisher: RabbitMQPublisher,
  ) {}

  async listRewards() {
    return this.redisService.getOrSet(
      "gamification:rewards:active",
      () => this.rewardRepo.findAll(),
      300,
    );
  }

  async listRewardsAdmin() {
    return this.rewardRepo.findAllAdmin();
  }

  async generateImageUploadUrl(filename: string, contentType: string) {
    return this.s3Service.generatePresignedImageUploadUrl(
      filename,
      contentType,
    );
  }

  async createReward(data: CreateRewardInputType) {
    const reward = await this.rewardRepo.create(data as any);
    await this.redisService.del("gamification:rewards:active");
    return reward;
  }

  async updateReward(id: number, data: UpdateRewardInputType) {
    const existing = await this.rewardRepo.findById(id);
    if (!existing) throw new NotFoundException("Reward not found");
    const reward = await this.rewardRepo.update(id, data as any);
    await this.redisService.del("gamification:rewards:active");
    return reward;
  }

  async deleteReward(id: number) {
    const existing = await this.rewardRepo.findById(id);
    if (!existing) throw new NotFoundException("Reward not found");
    await this.rewardRepo.delete(id);
    await this.redisService.del("gamification:rewards:active");
    return { message: "Reward deleted successfully" };
  }

  async redeemReward(userId: number, rewardId: number) {
    const reward = await this.rewardRepo.findById(rewardId);
    if (!reward || !reward.isActive) {
      throw new NotFoundException("Reward not found");
    }

    if (reward.stock !== null && reward.stock <= 0) {
      throw new BadRequestException("Reward is out of stock");
    }

    // Prevent duplicate redemption for unique reward types (BADGE, TITLE, AVATAR_FRAME)
    if (["BADGE", "TITLE", "AVATAR_FRAME"].includes(reward.type)) {
      const existing = await this.prisma.rewardRedemption.findFirst({
        where: { userId, rewardId },
      });
      if (existing) {
        throw new BadRequestException("You have already redeemed this reward");
      }
    }

    const stats = await this.prisma.userStats.findUnique({ where: { userId } });
    if (!stats || stats.totalCoins < reward.cost) {
      throw new BadRequestException("Not enough coins");
    }

    // Generate coupon code for DISCOUNT rewards
    const couponCode =
      reward.type === "DISCOUNT" ? this.generateCouponCode() : undefined;

    // Deduct coins and create redemption in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Atomic stock decrement with guard: only decrement if stock > 0
      if (reward.stock !== null) {
        const updated = await tx.reward.updateMany({
          where: { id: rewardId, stock: { gt: 0 } },
          data: { stock: { decrement: 1 } },
        });
        if (updated.count === 0) {
          throw new BadRequestException("Reward is out of stock");
        }
      }

      await tx.userStats.update({
        where: { userId },
        data: { totalCoins: { decrement: reward.cost } },
      });

      return tx.rewardRedemption.create({
        data: { userId, rewardId, couponCode },
        include: { reward: true },
      });
    });

    await Promise.all([
      this.redisService.del(`gamification:user-stats:${userId}`),
      this.redisService.del("gamification:rewards:active"),
    ]);

    // Publish reward redeemed event (learning-service will create coupon if DISCOUNT)
    await this.rabbitMQPublisher.publishRewardRedeemed(
      userId,
      rewardId,
      reward.type,
      reward.name,
      couponCode,
      reward.type === "DISCOUNT"
        ? {
            discountType: reward.discountType,
            discountValue: reward.discountValue,
            maxDiscountAmount: reward.maxDiscountAmount,
            applicableCourseIds: reward.applicableCourseIds,
          }
        : undefined,
    );

    return result;
  }

  async getMyRedemptions(userId: number) {
    return this.rewardRepo.getUserRedemptions(userId);
  }

  /**
   * Generates a human-readable coupon code in format: TORII-XXXXXXXX
   */
  private generateCouponCode(): string {
    const segment = randomBytes(4).toString("hex").toUpperCase();
    return `TORII-${segment}`;
  }
}
