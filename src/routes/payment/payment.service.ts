import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import { CartService } from '../cart/cart.service'
import { SepayService } from './sepay.service'

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly sepayService: SepayService,
  ) {}

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

  async createSepayPayment(userId: number): Promise<{
    success: boolean
    message: string
    qrUrl: string
    orderId: number
    amount: number
    content: string
  }> {
    const cartValidation = await this.cartService.validateCartForCheckout(userId)
    if (!cartValidation.isValid) {
      throw new BadRequestException(`Cart validation failed: ${cartValidation.errors.join(', ')}`)
    }

    const cartSummary = await this.cartService.getCartSummary(userId)
    if (!cartSummary || cartSummary.totalAmount === 0) {
      throw new BadRequestException('Cart is empty or has no amount to pay')
    }

    const totalAmount = cartSummary.totalAmount

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

    const orderInfo = `Thanh toán khóa học - Đơn hàng ${order.id}`
    const paymentData = await this.sepayService.createPaymentUrl({
      orderId: order.id,
      amount: totalAmount,
      orderInfo,
      userId,
    })

    this.logger.log(`Created SePay payment for order ${order.id}, amount: ${totalAmount}`)

    return {
      success: true,
      message: 'SePay QR code created successfully',
      ...paymentData,
    }
  }

  async handleSepayWebhook(webhookData: any) {
    return await this.sepayService.handleWebhook(webhookData)
  }

  async checkSepayPaymentStatus(paymentCode: string) {
    return await this.sepayService.checkPaymentStatus(paymentCode)
  }

  async getOrderByPaymentCode(paymentCode: string) {
    return await this.sepayService.getOrderByPaymentCode(paymentCode)
  }

  async buyCourseDirectWithSepay(
    userId: number,
    courseId: number,
    couponCode?: string,
  ): Promise<{
    success: boolean
    message: string
    qrUrl: string
    orderId: number
    amount: number
    content: string
  }> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        title: true,
        slug: true,
        price: true,
        status: true,
      },
    })

    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`)
    }

    if (course.status !== 'PUBLISHED') {
      throw new BadRequestException('Course is not available for purchase')
    }

    if (course.price === 0) {
      throw new BadRequestException('Free courses cannot be purchased. Please enroll directly.')
    }

    const existingEnrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    })

    if (existingEnrollment) {
      throw new BadRequestException('You are already enrolled in this course')
    }

    let finalAmount = course.price
    let appliedCoupon: any = null

    if (couponCode) {
      const coupon = await this.prisma.promotion.findFirst({
        where: {
          code: couponCode,
          active: true,
          startsAt: { lte: new Date() },
          endsAt: { gte: new Date() },
        },
      })

      if (coupon) {
        if (coupon.maxUsage && coupon.used >= coupon.maxUsage) {
          throw new BadRequestException('Coupon has reached maximum usage limit')
        }

        if (coupon.discountPct) {
          const discount = Math.floor((course.price * coupon.discountPct) / 100)
          finalAmount = course.price - discount
        } else if (coupon.discountAmt) {
          finalAmount = Math.max(0, course.price - coupon.discountAmt)
        }

        appliedCoupon = coupon
      } else {
        throw new BadRequestException('Invalid or expired coupon code')
      }
    }

    const order = await this.prisma.order.create({
      data: {
        userId,
        totalAmount: finalAmount,
        status: 'PENDING',
        couponId: appliedCoupon?.id,
        items: {
          create: {
            type: 'COURSE',
            courseId,
            unitPrice: course.price,
          },
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
        coupon: true,
      },
    })

    // Generate SePay QR code
    const orderInfo = `Mua khóa học: ${course.title} - Đơn hàng ${order.id}`
    const paymentData = await this.sepayService.createPaymentUrl({
      orderId: order.id,
      amount: finalAmount,
      orderInfo,
      userId,
    })

    this.logger.log(
      `Created direct purchase for course ${courseId}, order ${order.id}, amount: ${finalAmount}${appliedCoupon ? ` (coupon: ${couponCode})` : ''}`,
    )

    return {
      success: true,
      message: `SePay QR code created for ${course.title}`,
      ...paymentData,
    }
  }
}
