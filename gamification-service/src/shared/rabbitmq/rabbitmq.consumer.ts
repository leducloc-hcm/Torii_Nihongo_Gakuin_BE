import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { RabbitMQService } from "./rabbitmq.service";
import { PointsService } from "src/routes/points/points.service";
import { StreakService } from "src/routes/streak/streak.service";
import { AchievementService } from "src/routes/achievement/achievement.service";
import { ActivityLogService } from "src/routes/activity-log/activity-log.service";
import { LeaderboardService } from "src/routes/leaderboard/leaderboard.service";

@Injectable()
export class RabbitMQConsumer implements OnModuleInit {
  private readonly logger = new Logger(RabbitMQConsumer.name);

  constructor(
    private rabbitmqService: RabbitMQService,
    private pointsService: PointsService,
    private streakService: StreakService,
    private achievementService: AchievementService,
    private activityLogService: ActivityLogService,
    private leaderboardService: LeaderboardService,
  ) {}

  async onModuleInit() {
    await this.waitForRabbitMQReady();
    await this.setupConsumers();
  }

  private async waitForRabbitMQReady(maxRetries = 10, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        this.rabbitmqService.getChannel();
        return;
      } catch {
        if (i === maxRetries - 1) {
          this.logger.error("RabbitMQ service not ready after max retries");
          throw new Error("RabbitMQ not ready");
        }
        this.logger.debug(`Waiting for RabbitMQ... (${i + 1}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  private async setupConsumers() {
    const channel = this.rabbitmqService.getChannel();
    const exchangeName = this.rabbitmqService.getExchangeName();

    // Consume lesson progress events from learning-service
    await this.consumeEvent(
      channel,
      exchangeName,
      "lesson.progressed",
      "gamification.lesson.progressed",
      async (data) => {
        const { userId, lessonId, progress } = data.payload;
        this.logger.log(
          `Lesson progressed: user=${userId}, lesson=${lessonId}`,
        );

        await this.activityLogService.logActivity(
          userId,
          "LESSON_COMPLETED",
          10,
          { lessonId, progress },
        );
        await this.pointsService.addPoints(userId, 10, "Lesson completed", {
          lessonId,
        });
        await this.streakService.recordActivity(userId);
        await this.leaderboardService.addXp(userId, 10);
        await this.achievementService.checkAndUnlock(userId);
      },
    );

    // Consume course enrolled events from learning-service
    await this.consumeEvent(
      channel,
      exchangeName,
      "course.enrolled",
      "gamification.course.enrolled",
      async (data) => {
        const { userId, courseId } = data.payload;
        this.logger.log(`Course enrolled: user=${userId}, course=${courseId}`);

        await this.activityLogService.logActivity(
          userId,
          "COURSE_ENROLLED",
          20,
          { courseId },
        );
        await this.pointsService.addPoints(userId, 20, "Course enrolled", {
          courseId,
        });
        await this.leaderboardService.addXp(userId, 20);
        await this.achievementService.checkAndUnlock(userId);
      },
    );

    // Consume attempt graded events from assessment-service
    await this.consumeEvent(
      channel,
      exchangeName,
      "attempt.graded",
      "gamification.attempt.graded",
      async (data) => {
        const { userId, score, paperId, totalQuestions } = data.payload;
        this.logger.log(`Attempt graded: user=${userId}, score=${score}`);

        const points = 20;
        await this.activityLogService.logActivity(userId, "MOCK_TEST", points, {
          score,
          paperId,
          totalQuestions,
        });
        await this.pointsService.addPoints(
          userId,
          points,
          "Mock test completed",
          { score, paperId },
        );
        await this.streakService.recordActivity(userId);
        await this.leaderboardService.addXp(userId, points);
        await this.achievementService.checkAndUnlock(userId);
      },
    );

    // Consume payment completed events (attendance proxy) from learning-service
    await this.consumeEvent(
      channel,
      exchangeName,
      "payment.completed",
      "gamification.payment.completed",
      async (data) => {
        const { userId, orderId, amount } = data.payload;
        this.logger.log(`Payment completed: user=${userId}, order=${orderId}`);

        await this.pointsService.addPoints(
          userId,
          10,
          "Payment completed bonus",
          { orderId, amount },
        );
        await this.leaderboardService.addXp(userId, 10);
      },
    );

    // Consume flashcard generated events from learning-service
    await this.consumeEvent(
      channel,
      exchangeName,
      "flashcard.generated",
      "gamification.flashcard.generated",
      async (data) => {
        const { userId, deckId, cardCount } = data.payload;
        this.logger.log(`Flashcard generated: user=${userId}, deck=${deckId}`);

        await this.activityLogService.logActivity(
          userId,
          "FLASHCARD_GENERATED",
          5,
          { deckId, cardCount },
        );
        await this.pointsService.addPoints(userId, 5, "Flashcards generated", {
          deckId,
          cardCount,
        });
        await this.leaderboardService.addXp(userId, 5);
      },
    );

    this.logger.log("All gamification consumers set up");
  }

  private async consumeEvent(
    channel: any,
    exchangeName: string,
    routingKey: string,
    queueName: string,
    handler: (data: any) => Promise<void>,
  ) {
    const { queue } = await channel.assertQueue(queueName, { durable: true });
    await channel.bindQueue(queue, exchangeName, routingKey);

    channel.consume(queue, async (msg: any) => {
      if (!msg) return;

      try {
        const data = JSON.parse(msg.content.toString());
        await handler(data);
        channel.ack(msg);
      } catch (error) {
        this.logger.error(`Error processing ${routingKey}:`, error);
        channel.nack(msg, false, true);
      }
    });

    this.logger.log(`Consumer set up for ${routingKey} -> ${queueName}`);
  }
}
