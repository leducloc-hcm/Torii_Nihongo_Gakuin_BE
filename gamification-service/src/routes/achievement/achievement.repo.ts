import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/shared/services/prisma.service";
import { CreateAchievementType } from "./achievement.model";

@Injectable()
export class AchievementRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.achievement.findMany({ orderBy: { id: "asc" } });
  }

  async findById(id: number) {
    return this.prisma.achievement.findUnique({ where: { id } });
  }

  async create(data: CreateAchievementType) {
    return this.prisma.achievement.create({
      data: data as Required<CreateAchievementType>,
    });
  }

  async getUserAchievements(userId: number) {
    return this.prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { unlockedAt: "desc" },
    });
  }

  async getUserAchievementIds(userId: number): Promise<number[]> {
    const records = await this.prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true },
    });
    return records.map((r) => r.achievementId);
  }

  async unlockAchievement(userId: number, achievementId: number) {
    return this.prisma.userAchievement.create({
      data: { userId, achievementId },
      include: { achievement: true },
    });
  }

  async countUserActivitiesByType(
    userId: number,
    type: string,
  ): Promise<number> {
    return this.prisma.activityLog.count({
      where: { userId, type: type as any },
    });
  }

  async getUserStreakCurrent(userId: number): Promise<number> {
    const streak = await this.prisma.streak.findUnique({ where: { userId } });
    return streak?.longest ?? 0;
  }

  async getUserTotalXp(userId: number): Promise<number> {
    const stats = await this.prisma.userStats.findUnique({ where: { userId } });
    return stats?.totalXp ?? 0;
  }
}
