import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/shared/services/prisma.service";

@Injectable()
export class PointsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async addLedgerEntry(
    userId: number,
    delta: number,
    reason: string,
    meta?: any,
  ) {
    return this.prisma.pointsLedger.create({
      data: { userId, delta, reason, meta },
    });
  }

  async getHistory(userId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.pointsLedger.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.pointsLedger.count({ where: { userId } }),
    ]);
    return { items, total, page, limit };
  }

  async upsertUserStats(
    userId: number,
    xpDelta: number,
    coinsDelta: number,
    newLevel: number,
  ) {
    return this.prisma.userStats.upsert({
      where: { userId },
      create: {
        userId,
        totalXp: Math.max(0, xpDelta),
        totalCoins: Math.max(0, coinsDelta),
        level: newLevel,
      },
      update: {
        totalXp: { increment: xpDelta },
        totalCoins: { increment: coinsDelta },
        level: newLevel,
      },
    });
  }

  async getUserStats(userId: number) {
    return this.prisma.userStats.findUnique({ where: { userId } });
  }

  async getOrCreateUserStats(userId: number) {
    let stats = await this.prisma.userStats.findUnique({ where: { userId } });
    if (!stats) {
      stats = await this.prisma.userStats.create({
        data: { userId, totalXp: 0, totalCoins: 0, level: 1 },
      });
    }
    return stats;
  }

  async updateUserName(userId: number, name: string) {
    return this.prisma.userStats.upsert({
      where: { userId },
      create: { userId, totalXp: 0, totalCoins: 0, level: 1, name },
      update: { name },
    });
  }

  async updateUserRole(userId: number, role: string) {
    return this.prisma.userStats.upsert({
      where: { userId },
      create: { userId, totalXp: 0, totalCoins: 0, level: 1, role },
      update: { role },
    });
  }

  async getUserRole(userId: number): Promise<string | null> {
    const stats = await this.prisma.userStats.findUnique({
      where: { userId },
      select: { role: true },
    });
    return stats?.role ?? null;
  }

  async getUserNamesByIds(userIds: number[]) {
    if (userIds.length === 0) return [];
    return this.prisma.userStats.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, name: true },
    });
  }

  async getUsersByIds(userIds: number[]) {
    if (userIds.length === 0) return [];
    return this.prisma.userStats.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, name: true, role: true },
    });
  }

  async getAllUsersWithXp() {
    return this.prisma.userStats.findMany({
      where: {
        totalXp: { gt: 0 },
        role: "CUSTOMER",
      },
      select: { userId: true, totalXp: true },
      orderBy: { totalXp: "desc" },
    });
  }

  async getTopCustomersByXp(limit: number) {
    return this.prisma.userStats.findMany({
      where: { role: "CUSTOMER", totalXp: { gt: 0 } },
      orderBy: { totalXp: "desc" },
      take: limit,
      select: { userId: true, totalXp: true, name: true },
    });
  }

  async getCustomerRank(userId: number) {
    const me = await this.prisma.userStats.findUnique({
      where: { userId },
      select: { userId: true, totalXp: true, name: true, role: true },
    });
    if (!me || me.role !== "CUSTOMER") return null;

    const above = await this.prisma.userStats.count({
      where: { role: "CUSTOMER", totalXp: { gt: me.totalXp } },
    });

    return { userId: me.userId, rank: above + 1, xp: me.totalXp, name: me.name };
  }
}
