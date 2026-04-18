// Coupon Repository

import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/shared/services/prisma.service";
import {
  CouponType,
  CouponStatus,
  RedemptionStatus,
  CouponWhereInput,
  CouponWithRelations,
} from "./coupon.model";

@Injectable()
export class CouponRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any) {
    return await this.prisma.coupon.create({
      data,
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        courses: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                slug: true,
                price: true,
                courseType: true,
                level: true,
              },
            },
          },
        },
      },
    });
  }

  async findById(id: number): Promise<CouponWithRelations | null> {
    return (await this.prisma.coupon.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        approver: {
          select: { id: true, name: true, email: true },
        },
        rejector: {
          select: { id: true, name: true, email: true },
        },
        courses: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                slug: true,
                price: true,
                courseType: true,
                level: true,
              },
            },
          },
        },
        redemptions: {
          select: { id: true, userId: true },
        },
      },
    })) as CouponWithRelations | null;
  }

  async findByCode(code: string): Promise<CouponWithRelations | null> {
    return (await this.prisma.coupon.findUnique({
      where: { code },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        courses: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                slug: true,
                price: true,
                courseType: true,
                level: true,
              },
            },
          },
        },
        redemptions: {
          where: {
            status: { in: ["COMPLETED", "PARTIALLY_COMPLETED"] },
          },
          select: { id: true, userId: true },
        },
      },
    })) as CouponWithRelations | null;
  }

  async findMany(params: {
    page?: number;
    limit?: number;
    type?: CouponType;
    status?: CouponStatus;
    search?: string;
    createdBy?: number;
  }) {
    const { page = 1, limit = 10, type, status, search, createdBy } = params;
    const skip = (page - 1) * limit;

    const where: CouponWhereInput = {};

    if (type) where.type = type;
    if (status) where.status = status;
    if (createdBy) where.createdBy = createdBy;
    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
      ];
    }

    const [coupons, total] = await Promise.all([
      this.prisma.coupon.findMany({
        where,
        include: {
          creator: {
            select: { id: true, name: true, email: true },
          },
          approver: {
            select: { id: true, name: true, email: true },
          },
          courses: {
            include: {
              course: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  price: true,
                  courseType: true,
                  level: true,
                },
              },
            },
          },
          redemptions: {
            select: { id: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: Number(limit),
      }),
      this.prisma.coupon.count({ where }),
    ]);

    return {
      coupons,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(id: number, data: any): Promise<CouponWithRelations> {
    return (await this.prisma.coupon.update({
      where: { id },
      data,
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        approver: {
          select: { id: true, name: true, email: true },
        },
        rejector: {
          select: { id: true, name: true, email: true },
        },
        courses: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                slug: true,
                price: true,
                courseType: true,
                level: true,
              },
            },
          },
        },
      },
    })) as CouponWithRelations;
  }

  async delete(id: number) {
    return await this.prisma.coupon.delete({ where: { id } });
  }

  async createRedemption(data: any) {
    return await this.prisma.couponRedemption.create({
      data,
      include: {
        coupon: {
          select: { code: true, title: true, type: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async findRedemption(couponId: number, userId: number) {
    return await this.prisma.couponRedemption.findUnique({
      where: {
        couponId_userId: { couponId, userId },
      },
      include: {
        coupon: {
          select: { code: true, title: true, type: true },
        },
      },
    });
  }

  async updateRedemption(id: number, data: any) {
    return await this.prisma.couponRedemption.update({
      where: { id },
      data,
    });
  }

  async createAuditLog(data: any) {
    return await this.prisma.couponAuditLog.create({ data });
  }

  async getRedemptionStats(couponId: number) {
    const stats = await this.prisma.couponRedemption.groupBy({
      by: ["status"],
      where: { couponId },
      _count: { _all: true },
    });

    return stats.reduce(
      (acc, stat) => {
        acc[stat.status.toLowerCase()] = stat._count._all;
        return acc;
      },
      { completed: 0, pending: 0, failed: 0, partially_completed: 0 },
    );
  }

  async getUserRedemptionCount(couponId: number, userId: number) {
    return await this.prisma.couponRedemption.count({
      where: {
        couponId,
        userId,
        status: { in: ["COMPLETED", "PARTIALLY_COMPLETED"] },
      },
    });
  }

  async getUserRedemptions(
    userId: number,
    params: { page?: number; limit?: number } = {},
  ) {
    const { page = 1, limit = 10 } = params;
    const skip = (page - 1) * limit;

    const [redemptions, total] = await Promise.all([
      this.prisma.couponRedemption.findMany({
        where: { userId },
        include: {
          coupon: {
            select: {
              code: true,
              title: true,
              type: true,
              giftMessage: true,
            },
          },
        },
        orderBy: { redeemedAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.couponRedemption.count({ where: { userId } }),
    ]);

    return {
      redemptions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async checkCouponExists(code: string, excludeId?: number) {
    const where: CouponWhereInput = { code };
    if (excludeId) {
      where.id = { not: excludeId };
    }
    return await this.prisma.coupon.findFirst({
      where,
      select: { id: true },
    });
  }

  async getPendingApprovalCoupons() {
    return await this.prisma.coupon.findMany({
      where: { status: CouponStatus.PENDING_APPROVAL },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        courses: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                price: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  // ===== Gift Purchase Repository Methods =====

  async linkCourses(
    couponId: number,
    courses: Array<{ courseId: number; required: boolean }>,
  ) {
    await this.prisma.couponCourse.createMany({
      data: courses.map((c) => ({
        couponId,
        courseId: c.courseId,
        required: c.required,
      })),
    });
  }

  async findPurchasedGifts(userId: number, skip: number, limit: number) {
    return await this.prisma.coupon.findMany({
      where: {
        purchasedBy: userId,
        isGiftPurchase: true,
      },
      include: {
        courses: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                price: true,
                level: true,
              },
            },
          },
        },
        redemptions: {
          select: {
            id: true,
            userId: true,
            redeemedAt: true,
            status: true,
          },
        },
      },
      orderBy: { purchasedAt: "desc" },
      skip,
      take: limit,
    });
  }

  async countPurchasedGifts(userId: number): Promise<number> {
    return await this.prisma.coupon.count({
      where: {
        purchasedBy: userId,
        isGiftPurchase: true,
      },
    });
  }

  async findActiveDiscountCoupons() {
    const now = new Date();
    return await this.prisma.coupon.findMany({
      where: {
        status: CouponStatus.ACTIVE,
        type: { in: ["DISCOUNT_SINGLE", "DISCOUNT_MULTI"] },
        isGiftPurchase: false,
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
      include: {
        courses: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                slug: true,
                price: true,
                courseType: true,
                level: true,
              },
            },
          },
        },
        redemptions: {
          where: { status: { in: ["COMPLETED", "PARTIALLY_COMPLETED"] } },
          select: { id: true, userId: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getCouponUsageLogs(params: {
    page?: number;
    limit?: number;
    couponId?: number;
    userId?: number;
  }) {
    const { page = 1, limit = 20, couponId, userId } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (couponId) where.couponId = couponId;
    if (userId) where.userId = userId;

    const [logs, total] = await Promise.all([
      this.prisma.couponRedemption.findMany({
        where,
        include: {
          coupon: {
            select: {
              id: true,
              code: true,
              title: true,
              type: true,
              discountType: true,
              discountValue: true,
            },
          },
          user: {
            select: { id: true, name: true, email: true },
          },
          order: {
            select: {
              id: true,
              totalAmount: true,
              status: true,
              createdAt: true,
            },
          },
        },
        orderBy: { redeemedAt: "desc" },
        skip,
        take: Number(limit),
      }),
      this.prisma.couponRedemption.count({ where }),
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
