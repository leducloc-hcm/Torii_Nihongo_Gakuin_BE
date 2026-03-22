import { Injectable, Logger } from "@nestjs/common";
import { AchievementRepository } from "./achievement.repo";
import { RedisService } from "src/shared/redis/redis.service";
import { RabbitMQPublisher } from "src/shared/rabbitmq/rabbitmq.publisher";
import { CreateAchievementType } from "./achievement.model";

@Injectable()
export class AchievementService {
  private readonly logger = new Logger(AchievementService.name);

  constructor(
    private readonly achievementRepo: AchievementRepository,
    private readonly redisService: RedisService,
    private readonly rabbitMQPublisher: RabbitMQPublisher,
  ) {}

  async getAllAchievements() {
    return this.redisService.getOrSet(
      "gamification:achievements:all",
      () => this.achievementRepo.findAll(),
      600,
    );
  }

  async createAchievement(data: CreateAchievementType) {
    const achievement = await this.achievementRepo.create(data);
    await this.redisService.del("gamification:achievements:all");
    return achievement;
  }

  async getUserAchievements(userId: number) {
    return this.redisService.getOrSet(
      `gamification:user-achievements:${userId}`,
      () => this.achievementRepo.getUserAchievements(userId),
      300,
    );
  }

  async checkAndUnlock(userId: number) {
    const [allAchievements, unlockedIds] = await Promise.all([
      this.achievementRepo.findAll(),
      this.achievementRepo.getUserAchievementIds(userId),
    ]);

    const locked = allAchievements.filter((a) => !unlockedIds.includes(a.id));
    const newlyUnlocked: any[] = [];

    for (const achievement of locked) {
      const met = await this.evaluateCondition(
        userId,
        achievement.conditionType,
        achievement.conditionValue,
      );
      if (met) {
        const unlocked = await this.achievementRepo.unlockAchievement(
          userId,
          achievement.id,
        );
        newlyUnlocked.push(unlocked);

        this.logger.log(
          `User ${userId} unlocked achievement: ${achievement.name}`,
        );
        await this.rabbitMQPublisher.publishAchievementUnlocked(
          userId,
          achievement.id,
          achievement.name,
        );
      }
    }

    if (newlyUnlocked.length > 0) {
      await this.redisService.del(`gamification:user-achievements:${userId}`);
    }

    return newlyUnlocked;
  }

  private async evaluateCondition(
    userId: number,
    conditionType: string,
    conditionValue: number,
  ): Promise<boolean> {
    switch (conditionType) {
      case "STREAK": {
        const longest = await this.achievementRepo.getUserStreakCurrent(userId);
        return longest >= conditionValue;
      }
      case "KANJI": {
        // Kanji count tracked via activity logs or external event metadata
        const count = await this.achievementRepo.countUserActivitiesByType(
          userId,
          "LESSON_COMPLETED",
        );
        return count >= conditionValue;
      }
      case "LISTENING": {
        // Listening score tracked via mock test activities with meta
        const count = await this.achievementRepo.countUserActivitiesByType(
          userId,
          "MOCK_TEST",
        );
        return count >= conditionValue;
      }
      case "LESSONS_COMPLETED": {
        const count = await this.achievementRepo.countUserActivitiesByType(
          userId,
          "LESSON_COMPLETED",
        );
        return count >= conditionValue;
      }
      case "COURSES_ENROLLED": {
        const count = await this.achievementRepo.countUserActivitiesByType(
          userId,
          "COURSE_ENROLLED",
        );
        return count >= conditionValue;
      }
      case "QUIZZES_PASSED": {
        const count = await this.achievementRepo.countUserActivitiesByType(
          userId,
          "QUIZ_COMPLETED",
        );
        return count >= conditionValue;
      }
      case "TOTAL_XP": {
        const totalXp = await this.achievementRepo.getUserTotalXp(userId);
        return totalXp >= conditionValue;
      }
      case "LOGIN_DAYS": {
        const longest = await this.achievementRepo.getUserStreakCurrent(userId);
        return longest >= conditionValue;
      }
      default:
        return false;
    }
  }
}
