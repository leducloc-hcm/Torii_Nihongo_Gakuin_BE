import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as amqp from "amqplib";

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private channelModel: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private readonly exchangeName = "torii.events";
  private readonly exchangeType = "topic";

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const rabbitmqUrl =
      this.configService.get<string>("RABBITMQ_URL") ||
      "amqp://admin:admin@localhost:5672";

    try {
      this.channelModel = await amqp.connect(rabbitmqUrl);
      this.channel = await this.channelModel.createChannel();

      // Declare topic exchange
      await this.channel.assertExchange(this.exchangeName, this.exchangeType, {
        durable: true,
      });

      this.logger.log("✅ Connected to RabbitMQ");

      // Access connection for event listeners
      const connection = this.channelModel.connection;
      connection.on("error", (err) => {
        this.logger.error("RabbitMQ connection error:", err);
      });

      connection.on("close", () => {
        this.logger.warn("RabbitMQ connection closed");
      });
    } catch (error) {
      this.logger.error("Failed to connect to RabbitMQ:", error);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.channel) {
      await this.channel.close();
    }
    if (this.channelModel) {
      await this.channelModel.close();
    }
    this.logger.log("RabbitMQ connection closed");
  }

  getChannel(): amqp.Channel {
    if (!this.channel) {
      throw new Error("RabbitMQ channel not initialized");
    }
    return this.channel;
  }

  getExchangeName(): string {
    return this.exchangeName;
  }
}
