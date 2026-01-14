import { Injectable, Logger } from '@nestjs/common'
import { RabbitMQService } from './rabbitmq.service'

export interface DomainEvent {
  type: string
  payload: any
  timestamp: Date
  userId?: number
}

@Injectable()
export class RabbitMQPublisher {
  private readonly logger = new Logger(RabbitMQPublisher.name)

  constructor(private rabbitmqService: RabbitMQService) {}

  async publishEvent(routingKey: string, event: DomainEvent): Promise<void> {
    try {
      const channel = this.rabbitmqService.getChannel()
      const exchangeName = this.rabbitmqService.getExchangeName()

      const message = Buffer.from(JSON.stringify(event))

      channel.publish(exchangeName, routingKey, message, {
        persistent: true,
        timestamp: Date.now(),
      })

      this.logger.debug(`Published event: ${routingKey}`, event)
    } catch (error) {
      this.logger.error(`Failed to publish event ${routingKey}:`, error)
      throw error
    }
  }

  // Convenience methods for common events
  async publishCourseEnrolled(userId: number, courseId: number): Promise<void> {
    await this.publishEvent('course.enrolled', {
      type: 'course.enrolled',
      payload: { userId, courseId },
      timestamp: new Date(),
      userId,
    })
  }

  async publishLessonProgressed(userId: number, lessonId: number, progress: any): Promise<void> {
    await this.publishEvent('lesson.progressed', {
      type: 'lesson.progressed',
      payload: { userId, lessonId, progress },
      timestamp: new Date(),
      userId,
    })
  }

  async publishPaymentCompleted(userId: number, orderId: number, amount: number): Promise<void> {
    await this.publishEvent('payment.completed', {
      type: 'payment.completed',
      payload: { userId, orderId, amount },
      timestamp: new Date(),
      userId,
    })
  }

  async publishFlashcardGenerated(userId: number, deckId: number, cardCount: number): Promise<void> {
    await this.publishEvent('flashcard.generated', {
      type: 'flashcard.generated',
      payload: { userId, deckId, cardCount },
      timestamp: new Date(),
      userId,
    })
  }
}

