// Enhanced Payment Service with Coupon Integration

import { BadRequestException, Injectable, Logger, NotFoundException, Inject, forwardRef } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import { CartService } from '../cart/cart.service'
import { CouponService } from '../coupon/coupon.service'
import { SepayService } from './sepay.service'

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name)

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => CartService))
    private readonly cartService: CartService,
    @Inject(forwardRef(() => CouponService))
    private readonly couponService: CouponService,
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
            type: true,
            discountType: true,
            discountValue: true,
          },
        },
        redemption: {
          select: {
            discountApplied: true,
            status: true,
          },
        },
      },
    })

    if (!order) {
      throw new NotFoundException('Order not found')
    }

    return order
  }

  async getUserOrders(userId: number, params: { page?: number; limit?: number } = {}) {
    const { page = 1, limit = 10 } = params
    const skip = (page - 1) * limit

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
              type: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where: { userId } }),
    ])

    return {
      orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async getAllOrders(params: { page?: number; limit?: number; status?: string; userId?: number } = {}) {
    const { page = 1, limit = 10, status, userId } = params
    const skip = (page - 1) * limit

    const where: any = {}
    if (status) {
      where.status = status
    }
    if (userId) {
      where.userId = userId
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
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
              type: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ])

    return {
      orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async createSepayPaymentWithCoupon(
    userId: number,
    couponCode?: string,
  ): Promise<{
    success: boolean
    message: string
    qrUrl: string
    orderId: number
    amount: number
    content: string
    couponApplied?: {
      code: string
      discountAmount: number
      originalAmount: number
    }
  }> {
    const cartValidation = await this.cartService.validateCartForCheckout(userId, couponCode)
    if (!cartValidation.isValid) {
      throw new BadRequestException(`Cart validation failed: ${cartValidation.errors.join(', ')}`)
    }

    // Calculate final amount with coupon
    const checkoutCalculation = await this.cartService.calculateCheckoutAmount(userId, couponCode)

    if (checkoutCalculation.finalAmount === 0) {
      throw new BadRequestException('Cannot create payment for zero amount')
    }

    const cartSummary = await this.cartService.getCartSummary(userId)
    if (!cartSummary || cartSummary.totalAmount === 0) {
      throw new BadRequestException('Cart is empty or has no amount to pay')
    }

    // Create order with coupon support
    const orderData: any = {
      userId,
      totalAmount: checkoutCalculation.finalAmount,
      status: 'PENDING',
      items: {
        create: cartSummary.items.map((item) => ({
          type: 'COURSE',
          courseId: item.courseId,
          unitPrice: item.course?.price || 0,
          classId: item.classId,
        })),
      },
    }

    let coupon: any = null
    if (couponCode) {
      coupon = await this.prisma.coupon.findUnique({
        where: { code: couponCode },
      })

      if (coupon) {
        orderData.couponId = coupon.id
      }
    }

    const order = await this.prisma.order.create({
      data: orderData,
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

    // Create coupon redemption in PENDING status (will be updated to COMPLETED by webhook)
    if (coupon && coupon.type !== 'GIFT') {
      await this.prisma.couponRedemption.create({
        data: {
          couponId: coupon.id,
          userId,
          orderId: order.id,
          discountApplied: checkoutCalculation.discountAmount,
          status: 'PENDING', // Changed to PENDING - will be COMPLETED when payment succeeds
        },
      })
    }

    const orderInfo = `Thanh toán khóa học${couponCode ? ` (${couponCode})` : ''} - Đơn hàng ${order.id}`
    const paymentData = await this.sepayService.createPaymentUrl({
      orderId: order.id,
      amount: checkoutCalculation.finalAmount,
      orderInfo,
      userId,
    })

    this.logger.log(
      `Created SePay payment for order ${order.id}, amount: ${checkoutCalculation.finalAmount}${couponCode ? `, coupon: ${couponCode}` : ''}`,
    )

    const response: any = {
      success: true,
      message: 'SePay QR code created successfully',
      ...paymentData,
    }

    if (couponCode && checkoutCalculation.discountAmount > 0) {
      response.couponApplied = {
        code: couponCode,
        discountAmount: checkoutCalculation.discountAmount,
        originalAmount: checkoutCalculation.subtotal,
      }
    }

    return response
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

  async buyCourseDirectWithCoupon(
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
    couponApplied?: {
      code: string
      discountAmount: number
      originalAmount: number
    }
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
    let discountAmount = 0
    let appliedCoupon: any = null

    if (couponCode) {
      const validation = await this.couponService.validateCoupon(
        {
          code: couponCode,
          courseIds: [courseId],
          totalAmount: course.price,
        },
        userId,
      )

      if (!validation.isValid) {
        throw new BadRequestException(`Coupon validation failed: ${validation.errors.join(', ')}`)
      }

      if (validation.discount) {
        discountAmount = validation.discount.appliedAmount
        finalAmount = Math.max(0, course.price - discountAmount)

        appliedCoupon = await this.prisma.coupon.findUnique({
          where: { code: couponCode },
        })
      }
    }

    if (finalAmount === 0) {
      throw new BadRequestException('Cannot create payment for zero amount')
    }

    const orderData: any = {
      userId,
      totalAmount: finalAmount,
      status: 'PENDING',
      items: {
        create: {
          type: 'COURSE',
          courseId,
          unitPrice: course.price,
        },
      },
    }

    if (appliedCoupon) {
      orderData.couponId = appliedCoupon.id
    }

    const order = await this.prisma.order.create({
      data: orderData,
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

    // Create coupon redemption in PENDING status (will be updated to COMPLETED by webhook)
    if (appliedCoupon && appliedCoupon.type !== 'GIFT') {
      await this.prisma.couponRedemption.create({
        data: {
          couponId: appliedCoupon.id,
          userId,
          orderId: order.id,
          discountApplied: discountAmount,
          status: 'PENDING', // Changed to PENDING - will be COMPLETED when payment succeeds
        },
      })
    }

    // Generate SePay QR code
    const orderInfo = `Mua khóa học: ${course.title}${couponCode ? ` (${couponCode})` : ''} - Đơn hàng ${order.id}`
    const paymentData = await this.sepayService.createPaymentUrl({
      orderId: order.id,
      amount: finalAmount,
      orderInfo,
      userId,
    })

    this.logger.log(
      `Created direct purchase for course ${courseId}, order ${order.id}, amount: ${finalAmount}${appliedCoupon ? ` (coupon: ${couponCode})` : ''}`,
    )

    const response: any = {
      success: true,
      message: `SePay QR code created for ${course.title}`,
      ...paymentData,
    }

    if (couponCode && discountAmount > 0) {
      response.couponApplied = {
        code: couponCode,
        discountAmount,
        originalAmount: course.price,
      }
    }

    return response
  }

  // ===== Gift Coupon Payment =====

  async createGiftCouponPayment(
    userId: number,
    couponId: number,
    totalAmount: number,
    courses: Array<{ id: number; title: string; price: number }>,
  ): Promise<{
    success: boolean
    message: string
    qrUrl: string
    orderId: number
    amount: number
    content: string
  }> {
    // Create order for gift coupon purchase
    const orderData = {
      userId,
      totalAmount,
      status: 'PENDING' as const,
      couponId, // Link to the gift coupon being purchased
      items: {
        create: courses.map((course) => ({
          type: 'COURSE' as const,
          courseId: course.id,
          unitPrice: course.price,
        })),
      },
    }

    const order = await this.prisma.order.create({
      data: orderData,
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

    // Generate payment QR code
    const courseNames = courses.map((c) => c.title).join(', ')
    const orderInfo = `Gift Coupon - ${courseNames} - Order ${order.id}`

    const paymentData = await this.sepayService.createPaymentUrl({
      orderId: order.id,
      amount: totalAmount,
      orderInfo,
      userId,
    })

    this.logger.log(`Created gift coupon payment for order ${order.id}, amount: ${totalAmount}`)

    return {
      success: true,
      message: 'Gift coupon payment created successfully',
      ...paymentData,
    }
  }
}
