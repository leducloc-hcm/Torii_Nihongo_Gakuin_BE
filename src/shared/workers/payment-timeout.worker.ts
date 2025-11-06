import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../services/prisma.service'
import { PaymentTransactionService } from '../../routes/payment/payment-transaction.service'
import { NotificationGateway } from '../../websockets/notification.gateway'

@Injectable()
export class PaymentTimeoutWorker {
  private readonly logger = new Logger(PaymentTimeoutWorker.name)
  private readonly PAYMENT_TIMEOUT_MINUTES = 15

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentTransactionService: PaymentTransactionService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  /**
   * Run every 2 minutes to check for expired payments
   */
  @Cron('*/2 * * * *') // Every 2 minutes
  async handlePaymentTimeouts() {
    try {
      this.logger.log('Checking for expired payments...')

      // Calculate cutoff time (15 minutes ago)
      const cutoffTime = new Date()
      cutoffTime.setMinutes(cutoffTime.getMinutes() - this.PAYMENT_TIMEOUT_MINUTES)

      // Find pending payments older than 15 minutes
      const expiredPayments = await this.prisma.payment.findMany({
        where: {
          status: 'PENDING',
          createdAt: {
            lt: cutoffTime,
          },
        },
        include: {
          order: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              items: {
                include: {
                  course: {
                    select: {
                      id: true,
                      title: true,
                    },
                  },
                },
              },
              coupon: {
                select: {
                  code: true,
                  title: true,
                },
              },
            },
          },
        },
      })

      if (expiredPayments.length === 0) {
        this.logger.log('No expired payments found')
        return
      }

      this.logger.log(`Found ${expiredPayments.length} expired payments`)

      // Process each expired payment
      for (const payment of expiredPayments) {
        await this.processExpiredPayment(payment)
      }

      this.logger.log(`Processed ${expiredPayments.length} expired payments`)
    } catch (error) {
      this.logger.error('Error processing payment timeouts:', error)
    }
  }

  /**
   * Process a single expired payment
   */
  private async processExpiredPayment(payment: any) {
    try {
      const timeElapsed = Date.now() - payment.createdAt.getTime()
      const minutesElapsed = Math.floor(timeElapsed / (1000 * 60))

      this.logger.log(
        `Processing expired payment ${payment.id} for order ${payment.orderId} (${minutesElapsed} minutes old)`,
      )

      // Mark payment as failed
      await this.paymentTransactionService.markPaymentFailed(
        payment.id,
        `Payment timeout: No confirmation received within ${this.PAYMENT_TIMEOUT_MINUTES} minutes`,
      )

      // Handle coupon redemption failure if applicable
      if (payment.order.coupon) {
        await this.handleCouponRedemptionFailure(payment.order)
      }

      // Send timeout notification to user
      await this.notifyPaymentTimeout(payment)

      this.logger.log(`Successfully processed expired payment ${payment.id}`)
    } catch (error) {
      this.logger.error(`Error processing expired payment ${payment.id}:`, error)
    }
  }

  /**
   * Handle coupon redemption failure for timed out payments
   */
  private async handleCouponRedemptionFailure(order: any) {
    try {
      if (!order.couponId) return

      // Update coupon redemption status to FAILED
      await this.prisma.couponRedemption.updateMany({
        where: {
          orderId: order.id,
          couponId: order.couponId,
          status: 'PENDING',
        },
        data: {
          status: 'FAILED',
        },
      })

      this.logger.log(`Updated coupon redemption to FAILED for order ${order.id}`)
    } catch (error) {
      this.logger.error(`Error handling coupon redemption failure for order ${order.id}:`, error)
    }
  }

  /**
   * Send timeout notification to user
   */
  private async notifyPaymentTimeout(payment: any) {
    try {
      const order = payment.order
      const courseNames = order.items.map((item: any) => item.course?.title || 'Unknown Course').join(', ')

      // Send real-time notification
      this.notificationGateway.notifyPaymentFailed(order.user.id, {
        orderId: order.id,
        amount: payment.amount,
        errorMessage: `Thanh toán đã hết hạn sau ${this.PAYMENT_TIMEOUT_MINUTES} phút. Vui lòng thử lại.`,
        message: `Đơn hàng #${order.id} - ${courseNames}${order.coupon?.code ? ` (${order.coupon.code})` : ''}`,
      })

      // Create notification record
      await this.prisma.notification.create({
        data: {
          userId: order.user.id,
          type: 'SYSTEM',
          title: 'Thanh toán hết hạn',
          message: `Thanh toán cho đơn hàng #${order.id} đã hết hạn sau ${this.PAYMENT_TIMEOUT_MINUTES} phút. Bạn có thể thử thanh toán lại.`,
          priority: 'NORMAL',
          data: {
            orderId: order.id,
            paymentId: payment.id,
            amount: payment.amount,
            courses: courseNames,
            timeoutMinutes: this.PAYMENT_TIMEOUT_MINUTES,
          },
        },
      })

      this.logger.log(`Sent timeout notification for payment ${payment.id} to user ${order.user.id}`)
    } catch (error) {
      this.logger.error(`Error sending timeout notification for payment ${payment.id}:`, error)
    }
  }

  /**
   * Manual method to check and process timeouts (for testing)
   */
  async processTimeoutsManually() {
    this.logger.log('Manually triggering payment timeout check...')
    await this.handlePaymentTimeouts()
  }

  /**
   * Get payment timeout statistics
   */
  async getTimeoutStatistics(days: number = 7) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const stats = await this.prisma.payment.groupBy({
      by: ['status'],
      where: {
        createdAt: {
          gte: startDate,
        },
        failureReason: {
          contains: 'Payment timeout',
        },
      },
      _count: {
        status: true,
      },
    })

    const totalTimeouts = await this.prisma.payment.count({
      where: {
        createdAt: {
          gte: startDate,
        },
        status: 'FAILED',
        failureReason: {
          contains: 'Payment timeout',
        },
      },
    })

    return {
      timeoutCount: totalTimeouts,
      period: `${days} days`,
      statusBreakdown: stats,
    }
  }

  /**
   * Get payments that are close to timeout (within 5 minutes)
   */
  async getPaymentsNearTimeout() {
    const warningTime = new Date()
    warningTime.setMinutes(warningTime.getMinutes() - (this.PAYMENT_TIMEOUT_MINUTES - 5))

    const timeoutTime = new Date()
    timeoutTime.setMinutes(timeoutTime.getMinutes() - this.PAYMENT_TIMEOUT_MINUTES)

    return await this.prisma.payment.findMany({
      where: {
        status: 'PENDING',
        createdAt: {
          lt: warningTime,
          gte: timeoutTime,
        },
      },
      include: {
        order: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })
  }
}
