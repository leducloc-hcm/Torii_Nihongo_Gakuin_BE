import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import { TimePeriod } from './dashboard.model'
import { Prisma } from '@prisma/client'

@Injectable()
export class DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Revenue related queries
  async getTotalRevenue(startDate?: Date, endDate?: Date) {
    const whereClause: Prisma.OrderWhereInput = {
      status: 'COMPLETED',
      ...(startDate &&
        endDate && {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        }),
    }

    const result = await this.prisma.order.aggregate({
      where: whereClause,
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
    })

    return {
      totalRevenue: result._sum.totalAmount || 0,
      totalOrders: result._count.id || 0,
    }
  }

  async getRevenueByPeriod(period: TimePeriod, startDate: Date, endDate: Date) {
    let dateFormat: string
    let groupByFormat: string

    switch (period) {
      case 'day':
        dateFormat = 'YYYY-MM-DD'
        groupByFormat = 'DATE("createdAt")'
        break
      case 'week':
        dateFormat = 'YYYY-"W"WW'
        groupByFormat = 'DATE_TRUNC(\'week\', "createdAt")'
        break
      case 'month':
        dateFormat = 'YYYY-MM'
        groupByFormat = 'DATE_TRUNC(\'month\', "createdAt")'
        break
      case 'quarter':
        dateFormat = 'YYYY-"Q"Q'
        groupByFormat = 'DATE_TRUNC(\'quarter\', "createdAt")'
        break
      case 'year':
        dateFormat = 'YYYY'
        groupByFormat = 'DATE_TRUNC(\'year\', "createdAt")'
        break
      default:
        dateFormat = 'YYYY-MM-DD'
        groupByFormat = 'DATE("createdAt")'
    }

    const result = await this.prisma.$queryRaw<
      Array<{
        period: Date
        revenue: bigint
        order_count: bigint
      }>
    >`
      SELECT 
        ${Prisma.raw(groupByFormat)} as period,
        COALESCE(SUM("totalAmount"), 0) as revenue,
        COUNT(*) as order_count
      FROM "Order"
      WHERE status = 'COMPLETED'
        AND "createdAt" >= ${startDate}
        AND "createdAt" <= ${endDate}
      GROUP BY ${Prisma.raw(groupByFormat)}
      ORDER BY period ASC
    `

    return result.map((row) => ({
      period: row.period,
      revenue: Number(row.revenue),
      orderCount: Number(row.order_count),
    }))
  }

  // User growth related queries
  async getTotalUsers() {
    return await this.prisma.user.count({
      where: {
        deletedAt: null,
      },
    })
  }

  async getNewUsersCount(startDate: Date, endDate: Date) {
    return await this.prisma.user.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        deletedAt: null,
      },
    })
  }

  async getUserGrowthByPeriod(period: TimePeriod, startDate: Date, endDate: Date) {
    let groupByFormat: string

    switch (period) {
      case 'day':
        groupByFormat = 'DATE("createdAt")'
        break
      case 'week':
        groupByFormat = 'DATE_TRUNC(\'week\', "createdAt")'
        break
      case 'month':
        groupByFormat = 'DATE_TRUNC(\'month\', "createdAt")'
        break
      case 'quarter':
        groupByFormat = 'DATE_TRUNC(\'quarter\', "createdAt")'
        break
      case 'year':
        groupByFormat = 'DATE_TRUNC(\'year\', "createdAt")'
        break
      default:
        groupByFormat = 'DATE("createdAt")'
    }

    const result = await this.prisma.$queryRaw<
      Array<{
        period: Date
        new_users: bigint
      }>
    >`
      SELECT 
        ${Prisma.raw(groupByFormat)} as period,
        COUNT(*) as new_users
      FROM "User"
      WHERE "deletedAt" IS NULL
        AND "createdAt" >= ${startDate}
        AND "createdAt" <= ${endDate}
      GROUP BY ${Prisma.raw(groupByFormat)}
      ORDER BY period ASC
    `

    return result.map((row) => ({
      period: row.period,
      newUsers: Number(row.new_users),
    }))
  }

  async getTotalUsersByDate(date: Date) {
    return await this.prisma.user.count({
      where: {
        createdAt: {
          lte: date,
        },
        deletedAt: null,
      },
    })
  }

  // Course revenue related queries
  async getCourseRevenueBreakdown(limit: number = 10) {
    const result = await this.prisma.$queryRaw<
      Array<{
        course_id: number
        course_name: string
        course_slug: string
        thumbnail_url: string | null
        level: string
        total_revenue: bigint
        total_enrollments: bigint
        average_price: number
      }>
    >`
      SELECT 
        c.id as course_id,
        c.title as course_name,
        c.slug as course_slug,
        c."thumbnailUrl" as thumbnail_url,
        c.level,
        COALESCE(SUM(oi."unitPrice"), 0) as total_revenue,
        COUNT(DISTINCT o.id) as total_enrollments,
        CASE 
          WHEN COUNT(DISTINCT o.id) > 0 
          THEN COALESCE(SUM(oi."unitPrice"), 0) / COUNT(DISTINCT o.id)
          ELSE 0 
        END as average_price
      FROM "Course" c
      LEFT JOIN "OrderItem" oi ON c.id = oi."courseId"
      LEFT JOIN "Order" o ON oi."orderId" = o.id AND o.status = 'COMPLETED'
      WHERE c.status = 'PUBLISHED'
      GROUP BY c.id, c.title, c.slug, c."thumbnailUrl", c.level
      ORDER BY total_revenue DESC
      LIMIT ${limit}
    `

    return result.map((row) => ({
      courseId: row.course_id,
      courseName: row.course_name,
      courseSlug: row.course_slug,
      thumbnailUrl: row.thumbnail_url,
      level: row.level,
      totalRevenue: Number(row.total_revenue),
      totalEnrollments: Number(row.total_enrollments),
      averagePrice: Number(row.average_price),
    }))
  }

  async getTopCoursesByRevenue(limit: number = 5) {
    const result = await this.prisma.$queryRaw<
      Array<{
        course_id: number
        course_name: string
        course_slug: string
        thumbnail_url: string | null
        level: string
        total_revenue: bigint
        total_enrollments: bigint
      }>
    >`
      SELECT 
        c.id as course_id,
        c.title as course_name,
        c.slug as course_slug,
        c."thumbnailUrl" as thumbnail_url,
        c.level,
        COALESCE(SUM(oi."unitPrice"), 0) as total_revenue,
        COUNT(DISTINCT e.id) as total_enrollments
      FROM "Course" c
      LEFT JOIN "OrderItem" oi ON c.id = oi."courseId"
      LEFT JOIN "Order" o ON oi."orderId" = o.id AND o.status = 'COMPLETED'
      LEFT JOIN "Enrollment" e ON c.id = e."courseId"
      WHERE c.status = 'PUBLISHED'
      GROUP BY c.id, c.title, c.slug, c."thumbnailUrl", c.level
      ORDER BY total_revenue DESC
      LIMIT ${limit}
    `

    return result.map((row) => ({
      courseId: row.course_id,
      courseName: row.course_name,
      courseSlug: row.course_slug,
      thumbnailUrl: row.thumbnail_url,
      level: row.level,
      totalRevenue: Number(row.total_revenue),
      totalEnrollments: Number(row.total_enrollments),
    }))
  }

  async getTopCoursesByEnrollments(limit: number = 5) {
    const result = await this.prisma.$queryRaw<
      Array<{
        course_id: number
        course_name: string
        course_slug: string
        thumbnail_url: string | null
        level: string
        total_revenue: bigint
        total_enrollments: bigint
      }>
    >`
      SELECT 
        c.id as course_id,
        c.title as course_name,
        c.slug as course_slug,
        c."thumbnailUrl" as thumbnail_url,
        c.level,
        COALESCE(SUM(oi."unitPrice"), 0) as total_revenue,
        COUNT(DISTINCT e.id) as total_enrollments
      FROM "Course" c
      LEFT JOIN "OrderItem" oi ON c.id = oi."courseId"
      LEFT JOIN "Order" o ON oi."orderId" = o.id AND o.status = 'COMPLETED'
      LEFT JOIN "Enrollment" e ON c.id = e."courseId"
      WHERE c.status = 'PUBLISHED'
      GROUP BY c.id, c.title, c.slug, c."thumbnailUrl", c.level
      ORDER BY total_enrollments DESC
      LIMIT ${limit}
    `

    return result.map((row) => ({
      courseId: row.course_id,
      courseName: row.course_name,
      courseSlug: row.course_slug,
      thumbnailUrl: row.thumbnail_url,
      level: row.level,
      totalRevenue: Number(row.total_revenue),
      totalEnrollments: Number(row.total_enrollments),
    }))
  }

  async getTotalCourseStats() {
    const [totalCourses, totalEnrollments, courseRevenue] = await Promise.all([
      this.prisma.course.count({
        where: {
          status: 'PUBLISHED',
        },
      }),
      this.prisma.enrollment.count(),
      this.prisma.$queryRaw<Array<{ total_revenue: bigint }>>`
        SELECT COALESCE(SUM(oi."unitPrice"), 0) as total_revenue
        FROM "OrderItem" oi
        JOIN "Order" o ON oi."orderId" = o.id
        WHERE o.status = 'COMPLETED' AND oi."courseId" IS NOT NULL
      `,
    ])

    return {
      totalCourses,
      totalEnrollments,
      totalCourseRevenue: Number(courseRevenue[0]?.total_revenue || 0),
    }
  }

  // Quick stats queries
  async getQuickStats() {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      totalRevenue,
      totalUsers,
      totalCourses,
      totalEnrollments,
      newUsersToday,
      newUsersThisWeek,
      revenueThisMonth,
    ] = await Promise.all([
      this.getTotalRevenue(),
      this.getTotalUsers(),
      this.prisma.course.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.enrollment.count(),
      this.getNewUsersCount(todayStart, now),
      this.getNewUsersCount(weekStart, now),
      this.getTotalRevenue(monthStart, now),
    ])

    return {
      totalRevenue: totalRevenue.totalRevenue,
      totalUsers,
      totalCourses,
      totalEnrollments,
      newUsersToday,
      newUsersThisWeek,
      revenueThisMonth: revenueThisMonth.totalRevenue,
    }
  }
}
