import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/shared/services/prisma.service";

@Injectable()
export class RewardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.reward.findMany({
      where: { isActive: true },
      orderBy: { cost: "asc" },
    });
  }

  async findById(id: number) {
    return this.prisma.reward.findUnique({ where: { id } });
  }

  async decrementStock(id: number) {
    return this.prisma.reward.update({
      where: { id },
      data: { stock: { decrement: 1 } },
    });
  }

  async createRedemption(userId: number, rewardId: number) {
    return this.prisma.rewardRedemption.create({
      data: { userId, rewardId },
      include: { reward: true },
    });
  }

  async getUserRedemptions(userId: number) {
    return this.prisma.rewardRedemption.findMany({
      where: { userId },
      include: { reward: true },
      orderBy: { redeemedAt: "desc" },
    });
  }
}
