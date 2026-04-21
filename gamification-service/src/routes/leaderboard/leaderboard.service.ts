import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { LeaderboardRepository } from "./leaderboard.repo";
import { PointsRepository } from "../points/points.repo";
import { getCurrentPeriodKey } from "./leaderboard.model";

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(
    private readonly leaderboardRepo: LeaderboardRepository,
    private readonly pointsRepo: PointsRepository,
  ) {}

  // No-op: XP totals are maintained in user_stats by the points service.
  // The leaderboard reads directly from user_stats, so nothing extra is needed here.
  async addXp(_userId: number, _xp: number) {}

  async getLeaderboard(_period: "WEEKLY" | "MONTHLY", limit: number) {
    const top = await this.pointsRepo.getTopCustomersByXp(limit);
    return top.map((user, index) => ({
      userId: user.userId,
      xp: user.totalXp,
      rank: index + 1,
      name: user.name ?? null,
    }));
  }

  async getMyRank(userId: number, _period: "WEEKLY" | "MONTHLY") {
    const result = await this.pointsRepo.getCustomerRank(userId);
    if (!result) {
      return { userId, rank: null, xp: 0, name: null };
    }
    return result;
  }

  @Cron(CronExpression.EVERY_WEEK)
  async snapshotWeekly() {
    await this.snapshotLeaderboard("WEEKLY");
  }

  @Cron("0 0 1 * *") // first day of every month
  async snapshotMonthly() {
    await this.snapshotLeaderboard("MONTHLY");
  }

  private async snapshotLeaderboard(period: "WEEKLY" | "MONTHLY") {
    const periodKey = getCurrentPeriodKey(period);
    const top = await this.pointsRepo.getTopCustomersByXp(1000);

    this.logger.log(`Snapshot ${period} (${periodKey}): ${top.length} entries`);

    for (let i = 0; i < top.length; i++) {
      await this.leaderboardRepo.upsertEntry(
        top[i].userId,
        period,
        periodKey,
        top[i].totalXp,
        i + 1,
      );
    }
  }
}
