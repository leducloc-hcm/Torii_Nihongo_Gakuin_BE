import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/shared/services/prisma.service";

@Injectable()
export class LeaderboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertEntry(
    userId: number,
    period: string,
    periodKey: string,
    xp: number,
    rank: number,
  ) {
    return this.prisma.leaderboardEntry.upsert({
      where: {
        userId_period_periodKey: { userId, period: period as any, periodKey },
      },
      update: { xp, rank },
      create: { userId, period: period as any, periodKey, xp, rank },
    });
  }

  async getEntries(period: string, periodKey: string, limit: number) {
    return this.prisma.leaderboardEntry.findMany({
      where: { period: period as any, periodKey },
      orderBy: { xp: "desc" },
      take: limit,
    });
  }
}
