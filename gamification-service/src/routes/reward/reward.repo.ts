import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/shared/services/prisma.service";
import { CreateRewardInputType, UpdateRewardInputType } from "./reward.model";

@Injectable()
export class RewardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.reward.findMany({
      where: { isActive: true },
      orderBy: { cost: "asc" },
    });
  }

  async findAllAdmin() {
    return this.prisma.reward.findMany({ orderBy: { cost: "asc" } });
  }

  async findById(id: number) {
    return this.prisma.reward.findUnique({ where: { id } });
  }

  async create(data: CreateRewardInputType) {
    return this.prisma.reward.create({ data: data as any });
  }

  async update(id: number, data: UpdateRewardInputType) {
    return this.prisma.reward.update({ where: { id }, data });
  }

  async delete(id: number) {
    return this.prisma.reward.delete({ where: { id } });
  }

  async decrementStock(id: number) {
    return this.prisma.reward.update({
      where: { id },
      data: { stock: { decrement: 1 } },
    });
  }

  async createRedemption(
    userId: number,
    rewardId: number,
    couponCode?: string,
  ) {
    return this.prisma.rewardRedemption.create({
      data: { userId, rewardId, couponCode },
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
