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

  /**
   * Check if a user is a CUSTOMER (eligible for gamification).
   * Strict mode: only users with explicit CUSTOMER role are eligible.
   */
  private async isCustomer(userId: number): Promise<boolean> {
    const role = await this.pointsService.getUserRole(userId);
    return role === "CUSTOMER";
  }

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

        if (!(await this.isCustomer(userId))) {
          this.logger.log(`Skipping gamification for non-customer user=${userId}`);
          return;
        }

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

        if (!(await this.isCustomer(userId))) {
          this.logger.log(`Skipping gamification for non-customer user=${userId}`);
          return;
        }

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
        const payload = data?.payload ?? data;
        if (!payload || payload.userId === undefined || payload.userId === null) {
          this.logger.warn("Skipping attempt.graded event with invalid payload");
          return;
        }

        const {
          userId,
          score,
          assessmentId,
          paperId,
          totalQuestions,
          assessmentType,
        } = payload;
        const resolvedAssessmentId = assessmentId ?? paperId;
        this.logger.log(`Attempt graded: user=${userId}, score=${score}, type=${assessmentType}`);

        if (!(await this.isCustomer(userId))) {
          this.logger.log(`Skipping gamification for non-customer user=${userId}`);
          return;
        }

        const isQuiz = assessmentType === "QUIZ";
        const basePoints = isQuiz ? 15 : 20;
        const activityType = isQuiz ? "QUIZ_COMPLETED" : "MOCK_TEST";
        const scorePercent =
          totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;

        const bonusCoins = isQuiz
          ? (scorePercent === 100 ? 10 : scorePercent >= 90 ? 5 : 0)
          : (scorePercent === 100 ? 20 : scorePercent >= 90 ? 10 : scorePercent >= 80 ? 5 : 0);

        await this.activityLogService.logActivity(
          userId,
          activityType,
          basePoints,
          {
            score,
            assessmentId: resolvedAssessmentId,
            totalQuestions,
            assessmentType,
            scorePercent: Math.round(scorePercent),
            bonusCoins,
          },
        );
        await this.pointsService.addPoints(
          userId,
          basePoints,
          `${isQuiz ? "Quiz" : "Mock test"} completed (score: ${score}/${totalQuestions})`,
          { score, assessmentId: resolvedAssessmentId, assessmentType },
          basePoints + bonusCoins,
        );
        await this.streakService.recordActivity(userId);
        await this.leaderboardService.addXp(userId, basePoints);
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

        if (!(await this.isCustomer(userId))) {
          this.logger.log(`Skipping gamification for non-customer user=${userId}`);
          return;
        }

        await this.pointsService.addPoints(
          userId,
          10,
          "Payment completed bonus",
          { orderId, amount },
        );
        await this.leaderboardService.addXp(userId, 10);
        await this.achievementService.checkAndUnlock(userId);
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

        if (!(await this.isCustomer(userId))) {
          this.logger.log(`Skipping gamification for non-customer user=${userId}`);
          return;
        }

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
        await this.achievementService.checkAndUnlock(userId);
      },
    );

    // Consume user login events from learning-service
    await this.consumeEvent(
      channel,
      exchangeName,
      "user.login",
      "gamification.user.login",
      async (data) => {
        const { userId, userName, role } = data.payload;
        this.logger.log(`User login: user=${userId}, role=${role}`);

        if (userName) {
          await this.pointsService.updateUserName(userId, userName);
        }
        if (role) {
          await this.pointsService.updateUserRole(userId, role);
        }

        // Strictly process gamification only for CUSTOMER role
        if (role !== "CUSTOMER") {
          this.logger.log(`Skipping gamification for non-customer user=${userId}, role=${role}`);
          return;
        }

        await this.activityLogService.logActivity(userId, "LOGIN", 0, {});
        await this.streakService.recordActivity(userId);
        await this.achievementService.checkAndUnlock(userId);
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
