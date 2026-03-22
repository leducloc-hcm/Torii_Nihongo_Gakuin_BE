import { Injectable, Logger } from "@nestjs/common";
import { PointsRepository } from "./points.repo";
import { levelFromXp } from "./points.model";
import { RedisService } from "src/shared/redis/redis.service";
import { RabbitMQPublisher } from "src/shared/rabbitmq/rabbitmq.publisher";

@Injectable()
export class PointsService {
  private readonly logger = new Logger(PointsService.name);

  constructor(
    private readonly pointsRepo: PointsRepository,
    private readonly redisService: RedisService,
    private readonly rabbitMQPublisher: RabbitMQPublisher,
  ) {}

  async addPoints(userId: number, delta: number, reason: string, meta?: any) {
    // Record ledger entry
    await this.pointsRepo.addLedgerEntry(userId, delta, reason, meta);

    // Get current stats
    const stats = await this.pointsRepo.getOrCreateUserStats(userId);
    const newTotalXp = stats.totalXp + delta;
    const newTotalCoins = stats.totalCoins + delta;
    const oldLevel = stats.level;
    const newLevel = levelFromXp(newTotalXp);

    // Update user stats
    await this.pointsRepo.upsertUserStats(userId, delta, delta, newLevel);

    // Invalidate cache
    await this.redisService.del(`gamification:user-stats:${userId}`);

    // Check for level up
    if (newLevel > oldLevel) {
      this.logger.log(`User ${userId} leveled up: ${oldLevel} -> ${newLevel}`);
      await this.rabbitMQPublisher.publishLevelUp(userId, newLevel, newTotalXp);
    }

    return { totalXp: newTotalXp, totalCoins: newTotalCoins, level: newLevel };
  }

  async getUserStats(userId: number) {
    return this.redisService.getOrSet(
      `gamification:user-stats:${userId}`,
      () => this.pointsRepo.getOrCreateUserStats(userId),
      300,
    );
  }

  async getHistory(userId: number, page: number, limit: number) {
    return this.pointsRepo.getHistory(userId, page, limit);
  }
}
