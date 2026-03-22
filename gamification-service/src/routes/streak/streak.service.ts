import { Injectable, Logger } from "@nestjs/common";
import { StreakRepository } from "./streak.repo";
import { RedisService } from "src/shared/redis/redis.service";
import { RabbitMQPublisher } from "src/shared/rabbitmq/rabbitmq.publisher";

@Injectable()
export class StreakService {
  private readonly logger = new Logger(StreakService.name);
  private readonly MILESTONE_DAYS = [7, 14, 30, 60, 100, 365];

  constructor(
    private readonly streakRepo: StreakRepository,
    private readonly redisService: RedisService,
    private readonly rabbitMQPublisher: RabbitMQPublisher,
  ) {}

  async recordActivity(userId: number) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const existing = await this.streakRepo.getStreak(userId);

    if (!existing) {
      // First activity ever
      await this.streakRepo.upsertStreak(userId, {
        startDate: today,
        lastDate: today,
        current: 1,
        longest: 1,
      });
      await this.redisService.del(`gamification:streak:${userId}`);
      return { current: 1, longest: 1 };
    }

    const lastDate = new Date(existing.lastDate);
    const lastDay = new Date(
      lastDate.getFullYear(),
      lastDate.getMonth(),
      lastDate.getDate(),
    );
    const diffMs = today.getTime() - lastDay.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Already recorded today
      return { current: existing.current, longest: existing.longest };
    }

    let newCurrent: number;
    let newStart: Date;

    if (diffDays === 1) {
      // Consecutive day
      newCurrent = existing.current + 1;
      newStart = existing.startDate;
    } else {
      // Streak broken, start fresh
      newCurrent = 1;
      newStart = today;
    }

    const newLongest = Math.max(existing.longest, newCurrent);

    await this.streakRepo.upsertStreak(userId, {
      startDate: newStart,
      lastDate: today,
      current: newCurrent,
      longest: newLongest,
    });

    await this.redisService.del(`gamification:streak:${userId}`);

    // Check for milestone
    if (this.MILESTONE_DAYS.includes(newCurrent)) {
      this.logger.log(
        `User ${userId} hit streak milestone: ${newCurrent} days`,
      );
      await this.rabbitMQPublisher.publishStreakMilestone(userId, newCurrent);
    }

    return { current: newCurrent, longest: newLongest };
  }

  async getStreak(userId: number) {
    return this.redisService.getOrSet(
      `gamification:streak:${userId}`,
      async () => {
        const streak = await this.streakRepo.getStreak(userId);
        return (
          streak || { current: 0, longest: 0, startDate: null, lastDate: null }
        );
      },
      300,
    );
  }
}
