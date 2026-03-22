import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { RedisService } from "src/shared/redis/redis.service";
import { LeaderboardRepository } from "./leaderboard.repo";
import {
  getCurrentPeriodKey,
  getRedisLeaderboardKey,
} from "./leaderboard.model";

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(
    private readonly leaderboardRepo: LeaderboardRepository,
    private readonly redisService: RedisService,
  ) {}

  async addXp(userId: number, xp: number) {
    const weeklyKey = getRedisLeaderboardKey(
      "WEEKLY",
      getCurrentPeriodKey("WEEKLY"),
    );
    const monthlyKey = getRedisLeaderboardKey(
      "MONTHLY",
      getCurrentPeriodKey("MONTHLY"),
    );

    await Promise.all([
      this.redisService.zincrby(weeklyKey, xp, String(userId)),
      this.redisService.zincrby(monthlyKey, xp, String(userId)),
    ]);
  }

  async getLeaderboard(period: "WEEKLY" | "MONTHLY", limit: number) {
    const periodKey = getCurrentPeriodKey(period);
    const redisKey = getRedisLeaderboardKey(period, periodKey);

    const entries = await this.redisService.zrevrangeWithScores(
      redisKey,
      0,
      limit - 1,
    );
    return entries.map((entry, index) => ({
      userId: parseInt(entry.member, 10),
      xp: entry.score,
      rank: index + 1,
    }));
  }

  async getMyRank(userId: number, period: "WEEKLY" | "MONTHLY") {
    const periodKey = getCurrentPeriodKey(period);
    const redisKey = getRedisLeaderboardKey(period, periodKey);

    const [rank, score] = await Promise.all([
      this.redisService.zrevrank(redisKey, String(userId)),
      this.redisService.zscore(redisKey, String(userId)),
    ]);

    return {
      userId,
      rank: rank !== null ? rank + 1 : null,
      xp: score ? parseInt(score, 10) : 0,
    };
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
    const redisKey = getRedisLeaderboardKey(period, periodKey);

    const entries = await this.redisService.zrevrangeWithScores(
      redisKey,
      0,
      -1,
    );
    this.logger.log(
      `Snapshot ${period} leaderboard (${periodKey}): ${entries.length} entries`,
    );

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      await this.leaderboardRepo.upsertEntry(
        parseInt(entry.member, 10),
        period,
        periodKey,
        entry.score,
        i + 1,
      );
    }
  }
}
