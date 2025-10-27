import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'
import { PrismaService } from 'src/shared/services/prisma.service'
import { NotificationGateway } from 'src/websockets/notification.gateway'
import { CartService } from '../cart/cart.service'

interface SepayConfig {
  accountNumber: string
  bankCode: string
  accessKey: string
  apiUrl: string
  webhookUrl: string
}

interface CreatePaymentRequest {
  orderId: number
  amount: number
  orderInfo: string
  userId: number
}

interface SepayWebhookData {
  id: string
  gateway: string
  transactionDate: string
  accountNumber?: string
  code?: string
  content?: string
  transferType: 'in' | 'out'
  transferAmount: number
  accumulated: number
  subAccount?: string
  referenceCode?: string
  description: string
}

@Injectable()
export class SepayService {
  private readonly logger = new Logger(SepayService.name)
  private config: SepayConfig

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly notificationGateway: NotificationGateway,
    private readonly cartService: CartService,
  ) {
    this.config = {
      accountNumber: this.configService.get<string>('SEPAY_ACCOUNT_NUMBER') || '',
      bankCode: this.configService.get<string>('SEPAY_BANK_CODE') || '',
      accessKey: this.configService.get<string>('SEPAY_ACCESS_KEY') || '',
      apiUrl: this.configService.get<string>('SEPAY_API_URL') || '',
      webhookUrl: this.configService.get<string>('SEPAY_WEBHOOK_URL') || '',
    }
  }

  /**
   * Create payment QR code URL
   */
  async createPaymentUrl(payload: CreatePaymentRequest): Promise<{
    qrUrl: string
    orderId: number
    amount: number
    content: string
  }> {
    if (payload.amount < 10000) {
      throw new BadRequestException('Số tiền tối thiểu là 10,000 VND')
    }

    // Generate payment content code
    const paymentCode = `TKPTPR DHMC${payload.orderId}T${Date.now()}`

    // Update order with provider reference
    await this.prisma.order.update({
      where: { id: payload.orderId },
      data: {
        providerRef: paymentCode,
        status: 'PENDING',
      },
    })

    // Generate QR code URL
    const qrUrl = `https://qr.sepay.vn/img?acc=${this.config.accountNumber}&bank=${this.config.bankCode}&amount=${payload.amount}&des=${encodeURIComponent(paymentCode)}`

    // Send pending notification to user
    this.notificationGateway.notifyPaymentPending(payload.userId, {
      orderId: payload.orderId,
      amount: payload.amount,
      qrUrl,
      message: `Đơn hàng #${payload.orderId} đang chờ thanh toán. Vui lòng quét mã QR.`,
    })

    this.logger.log(`Created SePay QR for order ${payload.orderId}, amount: ${payload.amount}`)

    return {
      qrUrl,
      orderId: payload.orderId,
      amount: payload.amount,
      content: paymentCode,
    }
  }

  /**
   * Handle SePay webhook notification
   */
  async handleWebhook(webhookData: SepayWebhookData): Promise<{
    success: boolean
    message: string
    orderId?: number
    transactionId?: string
  }> {
    try {
      this.logger.log(`Received SePay webhook: ${JSON.stringify(webhookData)}`)

      // Validate webhook data
      if (webhookData.transferType !== 'in') {
        throw new BadRequestException('Invalid transfer type - must be incoming transaction')
      }

      // Extract payment code from content
      const paymentCode = this.extractPaymentCode(webhookData.content || webhookData.code || '')

      if (!paymentCode) {
        throw new BadRequestException('Payment code not found in transaction content')
      }

      // Find order by provider reference
      const order = await this.prisma.order.findFirst({
        where: { providerRef: paymentCode },
        include: {
          user: true,
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
          coupon: true,
        },
      })

      if (!order) {
        throw new BadRequestException(`Order not found for payment code: ${paymentCode}`)
      }

      if (order.status !== 'PENDING') {
        this.logger.warn(`Order ${order.id} already processed with status: ${order.status}`)
        return {
          success: false,
          message: 'Order already processed',
          orderId: order.id,
        }
      }

      // Verify amount (allow 1% tolerance for fees)
      const expectedAmount = order.totalAmount
      const receivedAmount = webhookData.transferAmount
      const tolerance = expectedAmount * 0.01

      if (receivedAmount < expectedAmount - tolerance) {
        // Send payment failed notification
        this.notificationGateway.notifyPaymentFailed(order.userId, {
          orderId: order.id,
          amount: order.totalAmount,
          errorMessage: `Số tiền không khớp. Mong đợi: ${expectedAmount}, Nhận: ${receivedAmount}`,
        })

        throw new BadRequestException(
          `Payment amount mismatch. Expected: ${expectedAmount}, Received: ${receivedAmount}`,
        )
      }

      // Process payment in transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Update order status
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: 'PAID',
            providerRef: `${paymentCode}:${webhookData.id}`, // Include transaction ID
          },
        })

        // Create enrollments
        const enrollments: Array<{
          courseId: number
          courseTitle: string
          courseThumbnail?: string
          expiresAt: Date
        }> = []

        const expiresAt = new Date()
        expiresAt.setFullYear(expiresAt.getFullYear() + 1)

        for (const item of order.items) {
          if (item.courseId) {
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
                  courseType: 'VIDEO_QUIZ',
                  expiresAt,
                },
              })

              enrollments.push({
                courseId: item.courseId,
                courseTitle: item.course?.title || 'Unknown Course',
                courseThumbnail: item.course?.thumbnailUrl || undefined,
                expiresAt,
              })

              // Send enrollment notification for each course
              this.notificationGateway.notifyEnrollmentCreated(order.userId, {
                courseId: item.courseId,
                courseTitle: item.course?.title || 'Unknown Course',
                courseThumbnail: item.course?.thumbnailUrl || undefined,
                expiresAt,
              })
              if (item.classId) {
                const existingMember = await tx.classMember.findUnique({
                  where: {
                    classId_userId: {
                      userId: order.userId,
                      classId: item.classId,
                    },
                  },
                })
                if (!existingMember) {
                  await tx.classMember.create({
                    data: {
                      userId: order.userId,
                      classId: item.classId,
                      role: 'CUSTOMER', // Enrolled users are customers in the class
                    },
                  })
                }
              }
            }
          }
        }

        // Update coupon usage
        if (order.couponId) {
          await tx.promotion.update({
            where: { id: order.couponId },
            data: { used: { increment: 1 } },
          })
        }

        return enrollments
      })

      await this.cartService.clearCart(order.userId)

      this.notificationGateway.notifyPaymentSuccess(order.userId, {
        orderId: order.id,
        transactionId: webhookData.id,
        amount: receivedAmount,
        courseIds: result.map((e) => e.courseId),
        message: `Thanh toán thành công cho đơn hàng #${order.id}. Bạn đã được ghi danh vào ${result.length} khóa học.`,
      })

      this.logger.log(
        `Payment successful for order ${order.id}, transaction ${webhookData.id}, created ${result.length} enrollments`,
      )

      return {
        success: true,
        message: 'Payment processed successfully',
        orderId: order.id,
        transactionId: webhookData.id,
      }
    } catch (error) {
      this.logger.error(`SePay webhook error: ${error.message}`, error.stack)

      // Try to send failure notification if we have order info
      if (error instanceof Error) {
        try {
          const paymentCode = this.extractPaymentCode(webhookData.content || webhookData.code || '')
          if (paymentCode) {
            const order = await this.prisma.order.findFirst({
              where: { providerRef: paymentCode },
            })

            if (order) {
              await this.prisma.order.update({
                where: { id: order.id },
                data: { status: 'FAILED' },
              })

              this.notificationGateway.notifyPaymentFailed(order.userId, {
                orderId: order.id,
                amount: order.totalAmount,
                errorMessage: error.message,
              })
            }
          }
        } catch (notifError) {
          this.logger.error(`Failed to send error notification: ${notifError.message}`)
        }
      }

      throw error
    }
  }

  async checkPaymentStatus(orderCode: string): Promise<{
    success: boolean
    message: string
    transaction?: any
  }> {
    try {
      if (!this.config.accessKey) {
        throw new BadRequestException('SePay access key not configured')
      }

      const response = await axios.get(`${this.config.apiUrl}/transactions/list?limit=20`, {
        headers: {
          Authorization: `Bearer ${this.config.accessKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.data.status === 200) {
        const transactions = response.data.transactions || []
        const transaction = transactions.find(
          (txn: any) => txn.content?.includes(orderCode) || txn.code?.includes(orderCode),
        )

        if (transaction) {
          return {
            success: true,
            message: 'Payment found',
            transaction,
          }
        }
      }

      return {
        success: false,
        message: 'Payment not found',
      }
    } catch (error) {
      this.logger.error(`Check payment status error: ${error.message}`)
      return {
        success: false,
        message: `Error: ${error.message}`,
      }
    }
  }

  /**
   * Get order by payment code
   */
  async getOrderByPaymentCode(paymentCode: string) {
    return await this.prisma.order.findFirst({
      where: { providerRef: { contains: paymentCode } },
      include: {
        user: true,
        items: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                slug: true,
                thumbnailUrl: true,
                price: true,
              },
            },
          },
        },
        coupon: true,
      },
    })
  }

  /**
   * Extract payment code from transaction content
   * Format: TKPTPR{orderId}T{timestamp}
   */
  private extractPaymentCode(content: string): string | null {
    const match = content.match(/TKPTPR DHMC\d+T\d+/)
    return match ? match[0] : null
  }
}
