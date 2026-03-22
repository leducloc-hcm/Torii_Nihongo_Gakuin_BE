import { Injectable, Logger } from "@nestjs/common";
import { RabbitMQService } from "./rabbitmq.service";

export interface DomainEvent {
  type: string;
  payload: any;
  timestamp: Date;
  userId?: number;
}

@Injectable()
export class RabbitMQPublisher {
  private readonly logger = new Logger(RabbitMQPublisher.name);

  constructor(private rabbitmqService: RabbitMQService) {}

  async publishEvent(routingKey: string, event: DomainEvent): Promise<void> {
    try {
      const channel = this.rabbitmqService.getChannel();
      const exchangeName = this.rabbitmqService.getExchangeName();
      const message = Buffer.from(JSON.stringify(event));

      channel.publish(exchangeName, routingKey, message, {
        persistent: true,
        timestamp: Date.now(),
      });

      this.logger.debug(`Published event: ${routingKey}`, event);
    } catch (error) {
      this.logger.error(`Failed to publish event ${routingKey}:`, error);
      throw error;
    }
  }

  async publishLevelUp(
    userId: number,
    newLevel: number,
    totalXp: number,
  ): Promise<void> {
    await this.publishEvent("gamification.level.up", {
      type: "gamification.level.up",
      payload: { userId, newLevel, totalXp },
      timestamp: new Date(),
      userId,
    });
  }

  async publishAchievementUnlocked(
    userId: number,
    achievementId: number,
    name: string,
  ): Promise<void> {
    await this.publishEvent("gamification.achievement.unlocked", {
      type: "gamification.achievement.unlocked",
      payload: { userId, achievementId, name },
      timestamp: new Date(),
      userId,
    });
  }

  async publishStreakMilestone(
    userId: number,
    streakDays: number,
  ): Promise<void> {
    await this.publishEvent("gamification.streak.milestone", {
      type: "gamification.streak.milestone",
      payload: { userId, streakDays },
      timestamp: new Date(),
      userId,
    });
  }
}
