import { forwardRef, Inject, Injectable, Logger } from "@nestjs/common";
import { AchievementRepository } from "./achievement.repo";
import { RedisService } from "src/shared/redis/redis.service";
import { RabbitMQPublisher } from "src/shared/rabbitmq/rabbitmq.publisher";
import { CreateAchievementType } from "./achievement.model";
import { PointsService } from "../points/points.service";

@Injectable()
export class AchievementService {
  private readonly logger = new Logger(AchievementService.name);

  constructor(
    private readonly achievementRepo: AchievementRepository,
    private readonly redisService: RedisService,
    private readonly rabbitMQPublisher: RabbitMQPublisher,
    @Inject(forwardRef(() => PointsService))
    private readonly pointsService: PointsService,
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

  async updateAchievement(id: number, data: Partial<CreateAchievementType>) {
    const achievement = await this.achievementRepo.update(id, data);
    await this.redisService.del("gamification:achievements:all");
    return achievement;
  }

  async deleteAchievement(id: number) {
    await this.achievementRepo.delete(id);
    await this.redisService.del("gamification:achievements:all");
    return { message: "Achievement deleted successfully" };
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

        // Award achievement rewards (coins and XP)
        if (achievement.rewardXp > 0 || achievement.rewardCoins > 0) {
          await this.pointsService.addPoints(
            userId,
            achievement.rewardXp,
            `Achievement unlocked: ${achievement.name}`,
            { achievementId: achievement.id },
            achievement.rewardCoins,
          );
        }

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
        const current = await this.achievementRepo.getUserStreakCurrent(userId);
        return current >= conditionValue;
      }
      case "KANJI": {
        // Kanji mastery tracked via LESSON_COMPLETED activities (kanji lessons)
        const count = await this.achievementRepo.countUserActivitiesByType(
          userId,
          "LESSON_COMPLETED",
        );
        return count >= conditionValue;
      }
      case "LISTENING": {
        // Listening practice tracked via MOCK_TEST activities (listening sections)
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
        const days = await this.achievementRepo.getUserLoginDays(userId);
        return days >= conditionValue;
      }
      default:
        return false;
    }
  }
}
