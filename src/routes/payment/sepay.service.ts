import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'
import { PrismaService } from 'src/shared/services/prisma.service'
import { EmailService } from 'src/shared/services/email.service'
import { GoogleCalendarService } from 'src/shared/services/google-calendar.service'
import { NotificationGateway } from 'src/websockets/notification.gateway'
import { CartService } from '../cart/cart.service'
import { ClassFolderService } from '../online-class/class-folder.service'
import { PaymentTransactionService } from './payment-transaction.service'

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
    private readonly emailService: EmailService,
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly notificationGateway: NotificationGateway,
    private readonly cartService: CartService,
    private readonly classFolderService: ClassFolderService,
    private readonly paymentTransactionService: PaymentTransactionService,
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
    paymentId: number
  }> {
    if (payload.amount < 10000) {
      throw new BadRequestException('Số tiền tối thiểu là 10,000 VND')
    }

    // Generate payment content code
    const paymentCode = `TKPTPR DHMC${payload.orderId}T${Date.now()}`

    // Create payment record
    const payment = await this.paymentTransactionService.createPayment({
      orderId: payload.orderId,
      amount: payload.amount,
      method: 'SEPAY',
      providerRef: paymentCode,
    })

    // Update order with provider reference (for backward compatibility)
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

    this.logger.log(`Created SePay QR for order ${payload.orderId}, amount: ${payload.amount}, payment: ${payment.id}`)

    return {
      qrUrl,
      orderId: payload.orderId,
      amount: payload.amount,
      content: paymentCode,
      paymentId: payment.id,
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

      // Find payment by provider reference
      const payment = await this.paymentTransactionService.getPaymentByProviderRef(paymentCode)

      if (!payment) {
        throw new BadRequestException(`Payment not found for payment code: ${paymentCode}`)
      }

      if (payment.status !== 'PENDING') {
        this.logger.warn(`Payment ${payment.id} already processed with status: ${payment.status}`)
        return {
          success: false,
          message: 'Payment already processed',
          orderId: payment.orderId,
          transactionId: webhookData.id,
        }
      }

      const order = payment.order

      // Verify amount (allow 1% tolerance for fees)
      const expectedAmount = payment.amount
      const receivedAmount = webhookData.transferAmount
      const tolerance = expectedAmount * 0.01

      if (receivedAmount < expectedAmount - tolerance) {
        // Mark payment as failed
        await this.paymentTransactionService.markPaymentFailed(
          payment.id,
          `Amount mismatch. Expected: ${expectedAmount}, Received: ${receivedAmount}`,
        )

        // Send payment failed notification
        this.notificationGateway.notifyPaymentFailed(order.userId, {
          orderId: order.id,
          amount: expectedAmount,
          errorMessage: `Số tiền không khớp. Mong đợi: ${expectedAmount}, Nhận: ${receivedAmount}`,
        })

        throw new BadRequestException(
          `Payment amount mismatch. Expected: ${expectedAmount}, Received: ${receivedAmount}`,
        )
      }

      // Process payment in transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Mark payment as paid
        await this.paymentTransactionService.markPaymentPaid(payment.id, webhookData.id, webhookData)

        // Update order with transaction reference (for backward compatibility)
        await tx.order.update({
          where: { id: order.id },
          data: {
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
                  courseType: item.course!.courseType,
                  expiresAt,
                },
              })

              enrollments.push({
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

                  // Grant folder access to the new member
                  try {
                    await this.classFolderService.grantFolderAccessToMember(item.classId, order.userId, 'CUSTOMER')
                  } catch (folderError) {
                    this.logger.warn(
                      `Failed to grant folder access for user ${order.userId} to class ${item.classId}:`,
                      folderError,
                    )
                    // Don't throw, continue with other operations
                  }

                  try {
                    const calendarResult = await this.googleCalendarService.generateClassCalendar(
                      item.classId,
                      order.userId,
                    )

                    if (calendarResult.success && calendarResult.calendarData && calendarResult.events) {
                      // Get class details for email
                      const classDetails = await this.prisma.class.findUnique({
                        where: { id: item.classId },
                        include: {
                          lecturer: {
                            select: { name: true },
                          },
                          course: {
                            select: { title: true },
                          },
                        },
                      })

                      if (classDetails && calendarResult.events.length > 0) {
                        // Map events to session format for email template
                        const sessions = calendarResult.events.map((event) => ({
                          id: event.id,
                          title: event.title,
                          scheduledAt: event.scheduledAt,
                          lecturerName: event.lecturerName,
                        }))

                        await this.emailService.sendCalendarInvite({
                          email: order.user.email,
                          studentName: order.user.name,
                          classTitle: classDetails.title,
                          courseTitle: classDetails.course?.title,
                          lecturerName: classDetails.lecturer.name,
                          sessionsCount: calendarResult.events.length,
                          firstSessionDate: calendarResult.events[0].scheduledAt,
                          lastSessionDate: calendarResult.events[calendarResult.events.length - 1].scheduledAt,
                          classId: item.classId,
                          calendarData: calendarResult.calendarData,
                          bulkGoogleCalendarUrl: calendarResult.bulkGoogleCalendarUrl,
                          sessions: sessions,
                        })

                        this.logger.log(`Calendar invite sent for class ${item.classId} to user ${order.userId}`)
                      }
                    }
                  } catch (calendarError) {
                    this.logger.error(
                      `Failed to send calendar invite for class ${item.classId}: ${calendarError.message}`,
                    )
                    // Don't throw error as calendar failure shouldn't break the payment process
                  }
                }
              }
              // Send enrollment notification for each course
              this.notificationGateway.notifyEnrollmentCreated(order.userId, {
                courseId: item.courseId,
                courseTitle: item.course?.title || 'Unknown Course',
                courseThumbnail: item.course?.thumbnailUrl || undefined,
                expiresAt,
              })
              // Send welcome email for the course
              try {
                await this.emailService.sendCourseWelcome({
                  email: order.user.email,
                  studentName: order.user.name,
                  courseTitle: item.course?.title || 'Unknown Course',
                  courseThumbnail: item.course?.thumbnailUrl || undefined,
                  expiresAt,
                  courseId: item.courseId,
                })
                this.logger.log(`Welcome email sent for course ${item.courseId} to user ${order.userId}`)
              } catch (emailError) {
                this.logger.error(`Failed to send welcome email for course ${item.courseId}: ${emailError.message}`)
                // Don't throw error as email failure shouldn't break the payment process
              }
            }
          }
        }

        // Update coupon redemption status to COMPLETED
        if (order.couponId) {
          await tx.couponRedemption.updateMany({
            where: {
              orderId: order.id,
              couponId: order.couponId,
              status: 'PENDING',
            },
            data: {
              status: 'COMPLETED',
              completedAt: new Date(),
            },
          })

          this.logger.log(`Coupon redemption completed for order ${order.id}, coupon ${order.couponId}`)
        }

        // Activate gift coupon if this is a gift coupon purchase
        if (order.coupon && order.couponId && order.coupon.type === 'GIFT' && order.coupon.status === 'DRAFT') {
          await tx.coupon.update({
            where: { id: order.couponId },
            data: {
              status: 'ACTIVE',
              purchasedAt: new Date(),
            },
          })

          // Create audit log for gift coupon activation
          await tx.couponAuditLog.create({
            data: {
              couponId: order.couponId,
              userId: order.userId,
              action: 'ACTIVATED',
              oldValues: JSON.stringify({ status: 'DRAFT' }),
              newValues: JSON.stringify({ status: 'ACTIVE', purchasedAt: new Date() }),
              note: 'Gift coupon activated after payment completion',
            },
          })

          this.logger.log(`Gift coupon ${order.coupon.code} activated after payment for order ${order.id}`)
        }

        return enrollments
      })

      await this.cartService.clearCart(order.userId)

      // Send calendar invites for classes with live sessions

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
                data: { status: 'CANCELLED' },
              })

              // Update coupon redemption to FAILED
              if (order.couponId) {
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
              }

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
    const payment = await this.paymentTransactionService.getPaymentByProviderRef(paymentCode)
    return payment?.order || null
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
