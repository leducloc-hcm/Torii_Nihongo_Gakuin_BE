import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import { CartService } from '../cart/cart.service'
import { VNPayService } from './vnpay.service'
import { CreatePaymentDTO, PaymentResponseDTO, PaymentCallbackResponseDTO, VNPayCallbackDTO } from './payment.dto'

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly vnpayService: VNPayService,
  ) {}

  async createPayment(userId: number, ipAddr: string): Promise<PaymentResponseDTO> {
    // Validate cart
    const cartValidation = await this.cartService.validateCartForCheckout(userId)
    if (!cartValidation.isValid) {
      throw new BadRequestException(`Cart validation failed: ${cartValidation.errors.join(', ')}`)
    }

    // Get cart summary
    const cartSummary = await this.cartService.getCartSummary(userId)
    if (!cartSummary || cartSummary.totalAmount === 0) {
      throw new BadRequestException('Cart is empty or has no amount to pay')
    }

    const totalAmount = cartSummary.totalAmount

    // Create order in database
    const order = await this.prisma.order.create({
      data: {
        userId,
        totalAmount,
        status: 'PENDING',
        items: {
          create: cartSummary.items.map((item) => ({
            type: 'COURSE',
            courseId: item.courseId,
            unitPrice: item.course?.price || 0,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        items: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },
          },
        },
      },
    })

    // Create VNPay payment URL
    const orderInfo = `Thanh toan khoa hoc - Don hang ${order.id}`
    const paymentUrl = this.vnpayService.createPaymentUrl({
      orderId: order.id.toString(),
      amount: totalAmount,
      orderInfo,
      ipAddr,
    })

    this.logger.log(`Created payment for order ${order.id}, amount: ${totalAmount}`)

    return {
      success: true,
      message: 'Payment URL created successfully',
      paymentUrl,
      orderId: order.id,
      totalAmount,
    }
  }

  async handleVNPayCallback(callbackData: VNPayCallbackDTO): Promise<PaymentCallbackResponseDTO> {
    // Verify callback
    const verification = this.vnpayService.verifyCallback(callbackData)

    if (!verification.isValid) {
      this.logger.error(`VNPay callback verification failed: ${verification.message}`)
      return {
        success: false,
        message: verification.message,
      }
    }

    const orderId = parseInt(callbackData.vnp_TxnRef)
    const transactionId = callbackData.vnp_TransactionNo

    // Find order
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        items: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },
          },
        },
        coupon: true,
      },
    })

    if (!order) {
      return {
        success: false,
        message: 'Order not found',
      }
    }

    if (order.status !== 'PENDING') {
      return {
        success: false,
        message: 'Order has already been processed',
      }
    }

    try {
      // Update order status and create enrollments in a transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Update order status
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: 'PAID',
            providerRef: transactionId,
          },
        })

        // Create enrollments for each course
        const enrollments: { courseId: number; courseName: string; expiresAt: Date }[] = []
        const expiresAt = new Date()
        expiresAt.setFullYear(expiresAt.getFullYear() + 1) // 1 year from now

        for (const item of order.items) {
          if (item.courseId) {
            // Check if enrollment already exists (to prevent duplicates)
            const existingEnrollment = await tx.enrollment.findUnique({
              where: {
                userId_courseId: {
                  userId: order.userId,
                  courseId: item.courseId,
                },
              },
            })

            if (!existingEnrollment) {
              await tx.enrollment.create({
                data: {
                  userId: order.userId,
                  courseId: item.courseId,
                  courseType: 'VIDEO_QUIZ', // Default course type
                  expiresAt,
                },
              })

              enrollments.push({
                courseId: item.courseId,
                courseName: item.course?.title || 'Unknown Course',
                expiresAt,
              })
            }
          }
        }

        // Update coupon usage if coupon was applied
        if (order.couponId) {
          await tx.promotion.update({
            where: { id: order.couponId },
            data: {
              used: { increment: 1 },
            },
          })
        }

        // Clear user's cart
        await this.cartService.clearCart(order.userId)

        return enrollments
      })

      this.logger.log(`Payment successful for order ${orderId}, created ${result.length} enrollments`)

      return {
        success: true,
        message: 'Payment processed successfully',
        orderId,
        transactionId,
        enrollments: result,
      }
    } catch (error) {
      this.logger.error(`Error processing payment callback: ${error.message}`)

      // Update order status to failed
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'FAILED' },
      })

      return {
        success: false,
        message: 'Failed to process payment',
      }
    }
  }

  async getOrderStatus(orderId: number, userId: number) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
      include: {
        items: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },
          },
        },
        coupon: {
          select: {
            code: true,
            title: true,
            discountPct: true,
            discountAmt: true,
          },
        },
      },
    })

    if (!order) {
      throw new NotFoundException('Order not found')
    }

    return order
  }

  async getUserOrders(userId: number, params: { skip?: number; take?: number } = {}) {
    const { skip = 0, take = 10 } = params

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId },
        include: {
          items: {
            include: {
              course: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  thumbnailUrl: true,
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
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.order.count({ where: { userId } }),
    ])

    return { orders, total }
  }
}
