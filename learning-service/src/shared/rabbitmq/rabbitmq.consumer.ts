import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { RabbitMQService } from "./rabbitmq.service";

@Injectable()
export class RabbitMQConsumer implements OnModuleInit {
  private readonly logger = new Logger(RabbitMQConsumer.name);

  constructor(private rabbitmqService: RabbitMQService) {}

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
}
