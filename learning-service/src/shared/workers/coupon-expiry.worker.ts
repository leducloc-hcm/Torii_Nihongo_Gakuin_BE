import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../services/prisma.service'
import { CouponRepository } from '../../routes/coupon/coupon.repo'
import { CouponStatus, CouponAuditAction } from '../../routes/coupon/coupon.model'

@Injectable()
export class CouponLifecycleWorker {
  private readonly logger = new Logger(CouponLifecycleWorker.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly couponRepository: CouponRepository,
  ) {}

  /**
   * Run every hour to check for expired coupons and activate scheduled coupons
   * This ensures coupons are marked as expired within 1 hour of their expiry time
   * and coupons are activated within 1 hour of their start time
   */
  @Cron('0 * * * *') // Every hour at minute 0
  async handleCouponLifecycle() {
    await Promise.all([this.handleCouponExpiry(), this.handleCouponActivation()])
  }

  /**
   * Check for and process expired coupons
   */
  async handleCouponExpiry() {
    try {
      this.logger.log('Checking for expired coupons...')

      const now = new Date()

      // Find active coupons that have passed their end date
      const expiredCoupons = await this.prisma.coupon.findMany({
        where: {
          status: {
            in: [CouponStatus.ACTIVE, CouponStatus.APPROVED],
          },
          endsAt: {
            lt: now,
          },
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          courses: {
            include: {
              course: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
          redemptions: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      })

      if (expiredCoupons.length === 0) {
        this.logger.log('No expired coupons found')
        return
      }

      this.logger.log(`Found ${expiredCoupons.length} expired coupons`)

      // Process each expired coupon
      for (const coupon of expiredCoupons) {
        await this.processExpiredCoupon(coupon)
      }

      this.logger.log(`Successfully processed ${expiredCoupons.length} expired coupons`)
    } catch (error) {
      this.logger.error('Error processing coupon expiry check:', error)
    }
  }

  /**
   * Check for and activate coupons that have reached their start date
   */
  async handleCouponActivation() {
    try {
      this.logger.log('Checking for coupons ready for activation...')

      const now = new Date()

      // Find approved coupons that have reached their start date
      const readyToActivate = await this.prisma.coupon.findMany({
        where: {
          status: CouponStatus.APPROVED,
          startsAt: {
            lte: now,
          },
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          courses: {
            include: {
              course: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
          _count: {
            select: {
              redemptions: true,
            },
          },
        },
      })

      if (readyToActivate.length === 0) {
        this.logger.log('No coupons ready for activation')
        return
      }

      this.logger.log(`Found ${readyToActivate.length} coupons ready for activation`)

      // Process each coupon for activation
      for (const coupon of readyToActivate) {
        await this.processActivateCoupon(coupon)
      }

      this.logger.log(`Successfully activated ${readyToActivate.length} coupons`)
    } catch (error) {
      this.logger.error('Error processing coupon activation check:', error)
    }
  }

  /**
   * Process a single expired coupon
   */
  private async processExpiredCoupon(coupon: any) {
    try {
      const hoursExpired = Math.floor((Date.now() - coupon.endsAt.getTime()) / (1000 * 60 * 60))

      this.logger.log(`Processing expired coupon ${coupon.code} (ID: ${coupon.id}) - expired ${hoursExpired} hours ago`)

      const oldStatus = coupon.status

      // Update coupon status to EXPIRED
      const updatedCoupon = await this.prisma.coupon.update({
        where: { id: coupon.id },
        data: {
          status: CouponStatus.EXPIRED,
          updatedAt: new Date(),
        },
      })

      // Create audit log for the status change
      await this.createAuditLog(
        coupon.id,
        coupon.creator.id, // Use creator as the user for system actions
        CouponAuditAction.DEACTIVATED,
        { status: oldStatus },
        { status: CouponStatus.EXPIRED },
        `Automatically expired by system - coupon end date passed ${hoursExpired} hours ago`,
      )

      // Log coupon statistics for monitoring
      const totalRedemptions = coupon.redemptions?.length || 0
      const courseNames = coupon.courses.map((cc: any) => cc.course?.title || 'Unknown').join(', ')

      this.logger.log(
        `Coupon ${coupon.code} expired successfully:
         - Type: ${coupon.type}
         - Total Redemptions: ${totalRedemptions}
         - Courses: ${courseNames}
         - Created: ${coupon.createdAt.toISOString()}
         - Expired: ${coupon.endsAt.toISOString()}
         - Hours Overdue: ${hoursExpired}`,
      )
    } catch (error) {
      this.logger.error(`Error processing expired coupon ${coupon.id} (${coupon.code}):`, error)
    }
  }

  /**
   * Process a single coupon for activation
   */
  private async processActivateCoupon(coupon: any) {
    try {
      const hoursReady = Math.floor((Date.now() - coupon.startsAt.getTime()) / (1000 * 60 * 60))

      this.logger.log(
        `Processing coupon activation ${coupon.code} (ID: ${coupon.id}) - start date passed ${hoursReady} hours ago`,
      )

      const oldStatus = coupon.status

      // Update coupon status to ACTIVE
      const updatedCoupon = await this.prisma.coupon.update({
        where: { id: coupon.id },
        data: {
          status: CouponStatus.ACTIVE,
          updatedAt: new Date(),
        },
      })

      // Create audit log for the status change
      await this.createAuditLog(
        coupon.id,
        coupon.creator.id, // Use creator as the user for system actions
        CouponAuditAction.ACTIVATED,
        { status: oldStatus },
        { status: CouponStatus.ACTIVE },
        `Automatically activated by system - coupon start date passed ${hoursReady} hours ago`,
      )

      // Log coupon statistics for monitoring
      const courseNames = coupon.courses.map((cc: any) => cc.course?.title || 'Unknown').join(', ')
      const endDate = coupon.endsAt ? coupon.endsAt.toISOString() : 'No end date'

      this.logger.log(
        `Coupon ${coupon.code} activated successfully:
         - Type: ${coupon.type}
         - Courses: ${courseNames}
         - Created: ${coupon.createdAt.toISOString()}
         - Started: ${coupon.startsAt.toISOString()}
         - Ends: ${endDate}
         - Hours Since Start: ${hoursReady}`,
      )
    } catch (error) {
      this.logger.error(`Error processing coupon activation ${coupon.id} (${coupon.code}):`, error)
    }
  }

  /**
   * Manual method to check and process expired coupons (for testing or manual triggers)
   */
  async processExpiredCouponsManually() {
    this.logger.log('Manually triggering coupon expiry check...')
    await this.handleCouponExpiry()
  }

  /**
   * Manual method to check and process coupon activation (for testing or manual triggers)
   */
  async processActivationManually() {
    this.logger.log('Manually triggering coupon activation check...')
    await this.handleCouponActivation()
  }

  /**
   * Manual method to process both expiry and activation (for testing or manual triggers)
   */
  async processLifecycleManually() {
    this.logger.log('Manually triggering coupon lifecycle check...')
    await this.handleCouponLifecycle()
  }

  /**
   * Get expired coupon statistics for monitoring
   */
  async getExpiryStatistics(days: number = 30) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const [expiredCoupons, totalCoupons, recentlyExpired] = await Promise.all([
      // Count coupons that were marked as expired in the given period
      this.prisma.coupon.count({
        where: {
          status: CouponStatus.EXPIRED,
          updatedAt: {
            gte: startDate,
          },
        },
      }),

      // Count total coupons with end dates in the given period
      this.prisma.coupon.count({
        where: {
          endsAt: {
            gte: startDate,
            lte: new Date(),
          },
        },
      }),

      // Get recently expired coupons with details
      this.prisma.coupon.findMany({
        where: {
          status: CouponStatus.EXPIRED,
          updatedAt: {
            gte: startDate,
          },
        },
        select: {
          id: true,
          code: true,
          title: true,
          type: true,
          endsAt: true,
          updatedAt: true,
          _count: {
            select: {
              redemptions: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        take: 10,
      }),
    ])

    // Get breakdown by coupon type
    const typeBreakdown = await this.prisma.coupon.groupBy({
      by: ['type'],
      where: {
        status: CouponStatus.EXPIRED,
        updatedAt: {
          gte: startDate,
        },
      },
      _count: {
        type: true,
      },
    })

    return {
      period: `${days} days`,
      expiredCount: expiredCoupons,
      totalWithEndDates: totalCoupons,
      expiryRate: totalCoupons > 0 ? ((expiredCoupons / totalCoupons) * 100).toFixed(2) + '%' : '0%',
      typeBreakdown: typeBreakdown.map((item) => ({
        type: item.type,
        count: item._count.type,
      })),
      recentlyExpired: recentlyExpired.map((coupon) => ({
        id: coupon.id,
        code: coupon.code,
        title: coupon.title,
        type: coupon.type,
        endedAt: coupon.endsAt?.toISOString(),
        expiredAt: coupon.updatedAt.toISOString(),
        totalRedemptions: coupon._count.redemptions,
        hoursOverdue: coupon.endsAt
          ? Math.floor((coupon.updatedAt.getTime() - coupon.endsAt.getTime()) / (1000 * 60 * 60))
          : 0,
      })),
    }
  }

  /**
   * Get coupons that are close to expiry (within specified hours)
   */
  async getCouponsNearExpiry(hoursUntilExpiry: number = 24) {
    const warningTime = new Date()
    warningTime.setHours(warningTime.getHours() + hoursUntilExpiry)

    return await this.prisma.coupon.findMany({
      where: {
        status: {
          in: [CouponStatus.ACTIVE, CouponStatus.APPROVED],
        },
        endsAt: {
          lte: warningTime,
          gt: new Date(), // Not yet expired
        },
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        courses: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        _count: {
          select: {
            redemptions: true,
          },
        },
      },
      orderBy: {
        endsAt: 'asc',
      },
    })
  }

  /**
   * Get coupons that are close to their start date (within specified hours)
   */
  async getCouponsNearActivation(hoursUntilStart: number = 24) {
    const activationTime = new Date()
    activationTime.setHours(activationTime.getHours() + hoursUntilStart)

    return await this.prisma.coupon.findMany({
      where: {
        status: CouponStatus.APPROVED,
        startsAt: {
          lte: activationTime,
          gt: new Date(), // Not yet started
        },
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        courses: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        _count: {
          select: {
            redemptions: true,
          },
        },
      },
      orderBy: {
        startsAt: 'asc',
      },
    })
  }

  /**
   * Get activation statistics for monitoring
   */
  async getActivationStatistics(days: number = 30) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const [activatedCoupons, totalScheduled, recentlyActivated] = await Promise.all([
      // Count coupons that were activated in the given period
      this.prisma.coupon.count({
        where: {
          status: CouponStatus.ACTIVE,
          updatedAt: {
            gte: startDate,
          },
          // Only count those that were activated by the system (have startsAt)
          startsAt: {
            not: null,
          },
        },
      }),

      // Count total coupons with start dates in the given period
      this.prisma.coupon.count({
        where: {
          startsAt: {
            gte: startDate,
            lte: new Date(),
          },
        },
      }),

      // Get recently activated coupons with details
      this.prisma.coupon.findMany({
        where: {
          status: CouponStatus.ACTIVE,
          updatedAt: {
            gte: startDate,
          },
          startsAt: {
            not: null,
          },
        },
        select: {
          id: true,
          code: true,
          title: true,
          type: true,
          startsAt: true,
          endsAt: true,
          updatedAt: true,
          _count: {
            select: {
              redemptions: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        take: 10,
      }),
    ])

    // Get breakdown by coupon type
    const typeBreakdown = await this.prisma.coupon.groupBy({
      by: ['type'],
      where: {
        status: CouponStatus.ACTIVE,
        updatedAt: {
          gte: startDate,
        },
        startsAt: {
          not: null,
        },
      },
      _count: {
        type: true,
      },
    })

    return {
      period: `${days} days`,
      activatedCount: activatedCoupons,
      totalScheduled: totalScheduled,
      activationRate: totalScheduled > 0 ? ((activatedCoupons / totalScheduled) * 100).toFixed(2) + '%' : '0%',
      typeBreakdown: typeBreakdown.map((item) => ({
        type: item.type,
        count: item._count.type,
      })),
      recentlyActivated: recentlyActivated.map((coupon) => ({
        id: coupon.id,
        code: coupon.code,
        title: coupon.title,
        type: coupon.type,
        startedAt: coupon.startsAt?.toISOString(),
        endsAt: coupon.endsAt?.toISOString(),
        activatedAt: coupon.updatedAt.toISOString(),
        totalRedemptions: coupon._count.redemptions,
        hoursAfterStart: coupon.startsAt
          ? Math.floor((coupon.updatedAt.getTime() - coupon.startsAt.getTime()) / (1000 * 60 * 60))
          : 0,
      })),
    }
  }

  /**
   * Check if there are any coupons that should have been expired but weren't processed
   * This can help identify if the worker is functioning correctly
   */
  async getOverdueCoupons() {
    const now = new Date()

    return await this.prisma.coupon.findMany({
      where: {
        status: {
          in: [CouponStatus.ACTIVE, CouponStatus.APPROVED],
        },
        endsAt: {
          lt: now,
        },
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        courses: {
          select: {
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        _count: {
          select: {
            redemptions: true,
          },
        },
      },
      orderBy: {
        endsAt: 'asc',
      },
    })
  }

  /**
   * Check if there are any coupons that should have been activated but weren't processed
   * This can help identify if the worker is functioning correctly
   */
  async getOverdueActivations() {
    const now = new Date()

    return await this.prisma.coupon.findMany({
      where: {
        status: CouponStatus.APPROVED,
        startsAt: {
          lt: now,
        },
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        courses: {
          select: {
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        _count: {
          select: {
            redemptions: true,
          },
        },
      },
      orderBy: {
        startsAt: 'asc',
      },
    })
  }

  /**
   * Create an audit log entry for coupon status changes
   */
  private async createAuditLog(
    couponId: number,
    userId: number,
    action: CouponAuditAction,
    oldValues: any,
    newValues: any,
    note?: string,
  ) {
    try {
      await this.prisma.couponAuditLog.create({
        data: {
          couponId,
          userId,
          action,
          oldValues: oldValues ? JSON.stringify(oldValues) : undefined,
          newValues: newValues ? JSON.stringify(newValues) : undefined,
          note,
        },
      })
    } catch (error) {
      this.logger.error(`Failed to create audit log for coupon ${couponId}:`, error)
    }
  }

  /**
   * Health check method to verify the worker is functioning
   */
  async healthCheck() {
    try {
      const [overdueCoupons, nearExpiryCount, overdueActivations, nearActivationCount] = await Promise.all([
        this.getOverdueCoupons(),
        this.getCouponsNearExpiry(24),
        this.getOverdueActivations(),
        this.getCouponsNearActivation(24),
      ])

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        expiry: {
          overdueCoupons: overdueCoupons.length,
          couponsNearExpiry24h: nearExpiryCount.length,
        },
        activation: {
          overdueActivations: overdueActivations.length,
          couponsNearActivation24h: nearActivationCount.length,
        },
        lastCheck: 'Worker runs every hour for both expiry and activation',
      }
    } catch (error) {
      this.logger.error('Health check failed:', error)
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
      }
    }
  }
}
