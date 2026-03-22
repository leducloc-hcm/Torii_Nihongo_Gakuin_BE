import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/shared/services/prisma.service";

@Injectable()
export class StreakRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getStreak(userId: number) {
    return this.prisma.streak.findUnique({ where: { userId } });
  }

  async upsertStreak(
    userId: number,
    data: { startDate: Date; lastDate: Date; current: number; longest: number },
  ) {
    return this.prisma.streak.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }
}
