import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import { PaymentMethod, PaymentStatus, OrderStatus } from '@prisma/client'

export interface CreatePaymentData {
  orderId: number
  amount: number
  method: PaymentMethod
  providerRef?: string
}

export interface UpdatePaymentData {
  status?: PaymentStatus
  providerTransactionId?: string
  providerResponse?: any
  failureReason?: string
  processedAt?: Date
}

@Injectable()
export class PaymentTransactionService {
  private readonly logger = new Logger(PaymentTransactionService.name)

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new payment record for an order
   */
  async createPayment(data: CreatePaymentData) {
    const { orderId, amount, method, providerRef } = data

    // Verify order exists and is valid
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payments: true,
      },
    })

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`)
    }

    // Calculate total paid amount
    const totalPaid = order.payments.filter((p) => p.status === 'PAID').reduce((sum, p) => sum + p.amount, 0)

    // Check if payment amount is valid
    if (totalPaid + amount > order.totalAmount) {
      throw new BadRequestException(
        `Payment amount ${amount} exceeds remaining order amount ${order.totalAmount - totalPaid}`,
      )
    }

    const payment = await this.prisma.payment.create({
      data: {
        orderId,
        amount,
        method,
        providerRef,
        status: 'PENDING',
      },
      include: {
        order: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            items: {
              include: {
                course: { select: { id: true, title: true } },
              },
            },
          },
        },
      },
    })

    this.logger.log(`Created payment ${payment.id} for order ${orderId}, amount: ${amount}`)
    return payment
  }

  /**
   * Update payment status and related information
   */
  async updatePayment(paymentId: number, data: UpdatePaymentData) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          include: {
            payments: true,
          },
        },
      },
    })

    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`)
    }

    // Update payment
    const updatedPayment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        order: {
          include: {
            payments: true,
          },
        },
      },
    })

    // Update order status based on payment status
    if (data.status) {
      await this.updateOrderStatusBasedOnPayments(payment.orderId)
    }

    this.logger.log(`Updated payment ${paymentId} with status: ${data.status}`)
    return updatedPayment
  }

  /**
   * Get payment by provider reference
   */
  async getPaymentByProviderRef(providerRef: string) {
    return await this.prisma.payment.findFirst({
      where: { providerRef },
      include: {
        order: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            items: {
              include: {
                course: {
                  select: {
                    id: true,
                    title: true,
                    thumbnailUrl: true,
                    courseType: true,
                  },
                },
              },
            },
            coupon: {
              select: {
                code: true,
                title: true,
                type: true,
                status: true,
              },
            },
          },
        },
      },
    })
  }

  /**
   * Get payment by provider transaction ID
   */
  async getPaymentByProviderTransactionId(transactionId: string) {
    return await this.prisma.payment.findUnique({
      where: { providerTransactionId: transactionId },
      include: {
        order: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            items: {
              include: {
                course: { select: { id: true, title: true } },
              },
            },
          },
        },
      },
    })
  }

  /**
   * Get all payments for an order
   */
  async getOrderPayments(orderId: number) {
    return await this.prisma.payment.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          select: {
            id: true,
            totalAmount: true,
            status: true,
          },
        },
      },
    })
  }

  /**
   * Calculate payment summary for an order
   */
  async getOrderPaymentSummary(orderId: number) {
    const payments = await this.getOrderPayments(orderId)
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { totalAmount: true, status: true },
    })

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`)
    }

    const totalPaid = payments.filter((p) => p.status === 'PAID').reduce((sum, p) => sum + p.amount, 0)

    const totalPending = payments.filter((p) => p.status === 'PENDING').reduce((sum, p) => sum + p.amount, 0)

    const totalFailed = payments.filter((p) => p.status === 'FAILED').reduce((sum, p) => sum + p.amount, 0)

    const totalRefunded = payments.filter((p) => p.status === 'REFUNDED').reduce((sum, p) => sum + p.amount, 0)

    const remainingAmount = order.totalAmount - totalPaid

    return {
      orderId,
      orderTotal: order.totalAmount,
      orderStatus: order.status,
      totalPaid,
      totalPending,
      totalFailed,
      totalRefunded,
      remainingAmount,
      isFullyPaid: remainingAmount <= 0,
      payments,
    }
  }

  /**
   * Update order status based on payment statuses
   */
  private async updateOrderStatusBasedOnPayments(orderId: number) {
    const summary = await this.getOrderPaymentSummary(orderId)

    let newOrderStatus: OrderStatus = 'PENDING'

    if (summary.isFullyPaid) {
      newOrderStatus = 'COMPLETED'
    } else if (summary.totalPaid > 0) {
      newOrderStatus = 'PROCESSING' // Partial payment
    } else if (summary.totalFailed > 0 && summary.totalPending === 0) {
      newOrderStatus = 'CANCELLED' // All payments failed
    }

    // Update order status if it changed
    const currentOrder = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true },
    })

    if (currentOrder && currentOrder.status !== newOrderStatus) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: newOrderStatus },
      })

      this.logger.log(`Updated order ${orderId} status from ${currentOrder.status} to ${newOrderStatus}`)
    }

    return newOrderStatus
  }

  /**
   * Mark payment as failed with reason
   */
  async markPaymentFailed(paymentId: number, reason: string) {
    return await this.updatePayment(paymentId, {
      status: 'FAILED',
      failureReason: reason,
      processedAt: new Date(),
    })
  }

  /**
   * Mark payment as successful
   */
  async markPaymentPaid(paymentId: number, providerTransactionId?: string, providerResponse?: any) {
    return await this.updatePayment(paymentId, {
      status: 'PAID',
      providerTransactionId,
      providerResponse,
      processedAt: new Date(),
    })
  }

  /**
   * Create refund payment
   */
  async createRefund(originalPaymentId: number, refundAmount: number, reason?: string) {
    const originalPayment = await this.prisma.payment.findUnique({
      where: { id: originalPaymentId },
      include: { order: true },
    })

    if (!originalPayment) {
      throw new NotFoundException(`Payment ${originalPaymentId} not found`)
    }

    if (originalPayment.status !== 'PAID') {
      throw new BadRequestException('Can only refund paid payments')
    }

    if (refundAmount > originalPayment.amount) {
      throw new BadRequestException('Refund amount cannot exceed original payment amount')
    }

    // Create negative payment for refund
    const refundPayment = await this.prisma.payment.create({
      data: {
        orderId: originalPayment.orderId,
        amount: -refundAmount, // Negative amount for refund
        method: originalPayment.method,
        status: 'REFUNDED',
        providerRef: `REFUND_${originalPayment.id}_${Date.now()}`,
        failureReason: reason,
        processedAt: new Date(),
      },
    })

    // Update order status
    await this.updateOrderStatusBasedOnPayments(originalPayment.orderId)

    this.logger.log(`Created refund payment ${refundPayment.id} for ${refundAmount} from payment ${originalPaymentId}`)
    return refundPayment
  }
}
