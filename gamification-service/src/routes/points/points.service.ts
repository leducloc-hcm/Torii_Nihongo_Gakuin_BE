import { Injectable, Logger } from "@nestjs/common";
import { PointsRepository } from "./points.repo";
import { levelFromXp } from "./points.model";
import { RedisService } from "src/shared/redis/redis.service";
import { RabbitMQPublisher } from "src/shared/rabbitmq/rabbitmq.publisher";
import { SeasonalEventService } from "../seasonal-event/seasonal-event.service";

@Injectable()
export class PointsService {
  private readonly logger = new Logger(PointsService.name);

  constructor(
    private readonly pointsRepo: PointsRepository,
    private readonly redisService: RedisService,
    private readonly rabbitMQPublisher: RabbitMQPublisher,
    private readonly seasonalEventService: SeasonalEventService,
  ) {}

  async addPoints(
    userId: number,
    delta: number,
    reason: string,
    meta?: any,
    coinsDelta?: number,
  ) {
    // Apply active seasonal event multiplier
    const { multiplier, bonusCoins, eventName } =
      await this.seasonalEventService.getActiveMultiplier();

    const effectiveDelta = Math.round(delta * multiplier);
    const effectiveCoins =
      (coinsDelta !== undefined ? coinsDelta : delta) + bonusCoins;

    const augmentedMeta =
      multiplier !== 1.0 || bonusCoins > 0
        ? { ...meta, seasonalEvent: eventName, multiplier, bonusCoins }
        : meta;

    // Record ledger entry with effective values
    await this.pointsRepo.addLedgerEntry(
      userId,
      effectiveDelta,
      reason,
      augmentedMeta,
    );

    // Get current stats
    const stats = await this.pointsRepo.getOrCreateUserStats(userId);
    const newTotalXp = stats.totalXp + effectiveDelta;
    const newTotalCoins = stats.totalCoins + effectiveCoins;
    const oldLevel = stats.level;
    const newLevel = levelFromXp(newTotalXp);

    // Update user stats
    await this.pointsRepo.upsertUserStats(
      userId,
      effectiveDelta,
      effectiveCoins,
      newLevel,
    );

    // Invalidate cache
    await this.redisService.del(`gamification:user-stats:${userId}`);

    // Check for level up
    if (newLevel > oldLevel) {
      this.logger.log(`User ${userId} leveled up: ${oldLevel} -> ${newLevel}`);
      await this.rabbitMQPublisher.publishLevelUp(userId, newLevel, newTotalXp);
    }

    if (multiplier !== 1.0 || bonusCoins > 0) {
      this.logger.log(
        `Seasonal event "${eventName}" applied: ${delta} -> ${effectiveDelta} XP, +${bonusCoins} bonus coins for user ${userId}`,
      );
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

  async updateUserName(userId: number, name: string) {
    return this.pointsRepo.updateUserName(userId, name);
  }

  async updateUserRole(userId: number, role: string) {
    return this.pointsRepo.updateUserRole(userId, role);
  }

  async getUserRole(userId: number): Promise<string | null> {
    return this.pointsRepo.getUserRole(userId);
  }
}
