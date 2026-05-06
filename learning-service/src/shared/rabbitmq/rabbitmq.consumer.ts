import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { RabbitMQService } from "./rabbitmq.service";
import { SepayService } from "src/routes/payment/sepay.service";
import { EnrollmentService } from "src/routes/enrollment/enrollment.service";
import { PrismaService } from "src/shared/services/prisma.service";
import { NotificationService } from "src/routes/notification/notification.service";

@Injectable()
export class RabbitMQConsumer implements OnModuleInit {
  private readonly logger = new Logger(RabbitMQConsumer.name);

  constructor(
    private rabbitmqService: RabbitMQService,
    private sepayService: SepayService,
    private enrollmentService: EnrollmentService,
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  async onModuleInit() {
    // Wait for RabbitMQ service to be ready
    await this.waitForRabbitMQReady();
    await this.setupConsumers();
  }

  private async waitForRabbitMQReady(maxRetries = 10, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        this.rabbitmqService.getChannel();
        return; // Channel is ready
      } catch (error) {
        if (i === maxRetries - 1) {
          this.logger.error("RabbitMQ service not ready after max retries");
          throw error;
        }
        this.logger.debug(
          `Waiting for RabbitMQ service to be ready... (${i + 1}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  private async setupConsumers() {
    const channel = this.rabbitmqService.getChannel();
    const exchangeName = this.rabbitmqService.getExchangeName();

    // Consume attempt.graded events from assessment-service
    await this.consumeAttemptGraded(channel, exchangeName);

    // Consume payment.sepay.webhook events from assessment-service
    await this.consumeSepayWebhook(channel, exchangeName);

    // Consume enrollment/class commands (assessment-service orchestrates)
    await this.consumeEnrollmentCreate(channel, exchangeName);
    await this.consumeClassMemberCreate(channel, exchangeName);

    // Consume achievement unlocked events from gamification-service
    await this.consumeAchievementUnlocked(channel, exchangeName);

    // Consume reward redeemed events from gamification-service (creates coupons for DISCOUNT rewards)
    await this.consumeRewardRedeemed(channel, exchangeName);
  }

  private async consumeAttemptGraded(channel: any, exchangeName: string) {
    const queueName = "learning.attempt.graded";
    const routingKey = "attempt.graded";

    await channel.assertQueue(queueName, { durable: true });
    await channel.bindQueue(queueName, exchangeName, routingKey);

    await channel.consume(queueName, async (msg: any) => {
      if (msg) {
        try {
          const event = JSON.parse(msg.content.toString());
          this.logger.log(`Received attempt.graded event:`, event);

          // Handle the event - update progress, badges, notifications, etc.
          await this.handleAttemptGraded(event);

          channel.ack(msg);
        } catch (error) {
          this.logger.error("Error processing attempt.graded event:", error);
          channel.nack(msg, false, true); // Requeue on error
        }
      }
    });

    this.logger.log(`✅ Consumer registered for ${routingKey}`);
  }

  private async handleAttemptGraded(event: any) {
    // TODO: Implement logic to:
    // 1. Update user progress
    // 2. Award badges/achievements
    // 3. Send notifications
    // 4. Update score profiles
    this.logger.debug("Handling attempt.graded event:", event);
  }

  private async consumeSepayWebhook(channel: any, exchangeName: string) {
    const queueName = "learning.payment.sepay.webhook";
    const routingKey = "payment.sepay.webhook";

    await channel.assertQueue(queueName, { durable: true });
    await channel.bindQueue(queueName, exchangeName, routingKey);

    await channel.consume(queueName, async (msg: any) => {
      if (msg) {
        try {
          const event = JSON.parse(msg.content.toString());
          this.logger.log(`Received ${routingKey} event:`, event);

          // We accept both shapes:
          // - { type, payload: <webhookData>, timestamp }
          // - <webhookData> (raw)
          const webhookData = event?.payload ?? event;

          await this.sepayService.handleWebhook(webhookData);

          channel.ack(msg);
        } catch (error) {
          this.logger.error(`Error processing ${routingKey} event:`, error);
          channel.nack(msg, false, true); // Requeue on error
        }
      }
    });

    this.logger.log(`✅ Consumer registered for ${routingKey}`);
  }

  private async consumeEnrollmentCreate(channel: any, exchangeName: string) {
    const queueName = "learning.enrollment.create";
    const routingKey = "enrollment.create";

    await channel.assertQueue(queueName, { durable: true });
    await channel.bindQueue(queueName, exchangeName, routingKey);

    await channel.consume(queueName, async (msg: any) => {
      if (msg) {
        try {
          const event = JSON.parse(msg.content.toString());
          this.logger.log(`Received ${routingKey} event:`, event);

          const payload = event?.payload ?? event;
          const userId = Number(payload.userId);
          const courseId = Number(payload.courseId);
          const courseType = payload.courseType;
          const expiresAt = payload.expiresAt;

          if (!userId || !courseId || !courseType) {
            throw new Error(
              "Invalid enrollment.create payload (userId/courseId/courseType required)",
            );
          }

          await this.enrollmentService.create(
            {
              courseId,
              courseType,
              expiresAt,
            } as any,
            userId,
          );

          channel.ack(msg);
        } catch (error) {
          this.logger.error(`Error processing ${routingKey} event:`, error);
          channel.nack(msg, false, true);
        }
      }
    });

    this.logger.log(`✅ Consumer registered for ${routingKey}`);
  }

  private async consumeClassMemberCreate(channel: any, exchangeName: string) {
    const queueName = "learning.classmember.create";
    const routingKey = "classmember.create";

    await channel.assertQueue(queueName, { durable: true });
    await channel.bindQueue(queueName, exchangeName, routingKey);

    await channel.consume(queueName, async (msg: any) => {
      if (msg) {
        try {
          const event = JSON.parse(msg.content.toString());
          this.logger.log(`Received ${routingKey} event:`, event);

          const payload = event?.payload ?? event;
          const userId = Number(payload.userId);
          const classId = Number(payload.classId);
          const role = payload.role || "CUSTOMER";

          if (!userId || !classId) {
            throw new Error(
              "Invalid classmember.create payload (userId/classId required)",
            );
          }

          // Idempotent create
          const existing = await this.prisma.classMember.findUnique({
            where: {
              classId_userId: {
                classId,
                userId,
              },
            },
          });

          if (!existing) {
            await this.prisma.classMember.create({
              data: {
                userId,
                classId,
                role,
              },
            });
          }

          channel.ack(msg);
        } catch (error) {
          this.logger.error(`Error processing ${routingKey} event:`, error);
          channel.nack(msg, false, true);
        }
      }
    });

    this.logger.log(`✅ Consumer registered for ${routingKey}`);
  }

  private async consumeAchievementUnlocked(channel: any, exchangeName: string) {
    const queueName = "learning.gamification.achievement.unlocked";
    const routingKey = "gamification.achievement.unlocked";

    await channel.assertQueue(queueName, { durable: true });
    await channel.bindQueue(queueName, exchangeName, routingKey);

    await channel.consume(queueName, async (msg: any) => {
      if (msg) {
        try {
          const event = JSON.parse(msg.content.toString());
          this.logger.log(`Received ${routingKey} event:`, event);

          const payload = event?.payload ?? event;
          const userId = Number(payload.userId);
          const achievementName = payload.name;

          if (!userId || !achievementName) {
            throw new Error("Invalid achievement.unlocked payload");
          }

          await this.notificationService.create({
            type: "ACHIEVEMENT",
            title: "Achievement Unlocked! 🏆",
            message: `Congratulations! You've unlocked the achievement: "${achievementName}"`,
            userId,
            priority: "HIGH",
            data: {
              achievementId: payload.achievementId,
              achievementName,
            },
            actionUrl: "/customer/gamification/achievements",
          });

          channel.ack(msg);
        } catch (error) {
          this.logger.error(`Error processing ${routingKey} event:`, error);
          channel.nack(msg, false, true);
        }
      }
    });

    this.logger.log(`✅ Consumer registered for ${routingKey}`);
  }

  private async consumeRewardRedeemed(channel: any, exchangeName: string) {
    const queueName = "learning.gamification.reward.redeemed";
    const routingKey = "gamification.reward.redeemed";

    await channel.assertQueue(queueName, { durable: true });
    await channel.bindQueue(queueName, exchangeName, routingKey);

    await channel.consume(queueName, async (msg: any) => {
      if (msg) {
        try {
          const event = JSON.parse(msg.content.toString());
          this.logger.log(`Received ${routingKey} event:`, event);

          const payload = event?.payload ?? event;
          await this.handleRewardRedeemed(payload);

          channel.ack(msg);
        } catch (error) {
          this.logger.error(`Error processing ${routingKey} event:`, error);
          channel.nack(msg, false, true);
        }
      }
    });

    this.logger.log(`✅ Consumer registered for ${routingKey}`);
  }

  private async handleRewardRedeemed(payload: any) {
    const { userId, rewardType, rewardName, couponCode, discountMeta } =
      payload;

    // Only create a coupon for DISCOUNT rewards
    if (rewardType !== "DISCOUNT" || !couponCode) {
      this.logger.debug(
        `Skipping coupon creation for non-DISCOUNT reward type: ${rewardType}`,
      );

      // Send notification for non-DISCOUNT rewards
      await this.notificationService.create({
        type: "REWARD",
        title: "Reward Redeemed! 🎁",
        message: `You've successfully redeemed: "${rewardName}"`,
        userId: Number(userId),
        priority: "NORMAL",
        data: { rewardType, rewardName },
        actionUrl: "/customer/gamification/shop",
      });
      return;
    }

    // Check idempotency: don't create duplicate coupon for same code
    const existingCoupon = await this.prisma.coupon.findUnique({
      where: { code: couponCode },
    });
    if (existingCoupon) {
      this.logger.warn(
        `Coupon ${couponCode} already exists, skipping creation`,
      );
      return;
    }

    const discountType = discountMeta?.discountType || "PERCENTAGE";
    const discountValue = discountMeta?.discountValue || 10;
    const maxDiscountAmount = discountMeta?.maxDiscountAmount || null;
    const applicableCourseIds: number[] =
      discountMeta?.applicableCourseIds || [];

    // Set coupon expiry to 30 days from now
    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + 30);

    // Create the coupon directly in learning DB (auto-approved, auto-active)
    const coupon = await this.prisma.coupon.create({
      data: {
        code: couponCode,
        title: `Reward: ${rewardName}`,
        description: `Auto-generated coupon from gamification reward redemption`,
        type: "DISCOUNT_SINGLE",
        discountType,
        discountValue: Math.floor(discountValue),
        maxDiscountAmount,
        maxRedemptions: 1,
        perUserLimit: 1,
        startsAt: new Date(),
        endsAt,
        status: "ACTIVE",
        createdBy: Number(userId),
        ...(applicableCourseIds.length > 0
          ? {
              courses: {
                create: applicableCourseIds.map((courseId: number) => ({
                  courseId,
                  required: false,
                })),
              },
            }
          : {}),
      },
    });

    this.logger.log(
      `Created coupon ${coupon.code} for user ${userId} from reward redemption`,
    );

    // Notify user about the coupon
    await this.notificationService.create({
      type: "REWARD",
      title: "Discount Coupon Received! 🎉",
      message: `You've redeemed "${rewardName}" and received coupon code: ${couponCode}. It's valid for 30 days.`,
      userId: Number(userId),
      priority: "HIGH",
      data: {
        couponCode,
        discountType,
        discountValue,
        rewardName,
      },
      actionUrl: "/customer/gamification/shop",
    });
  }
}
