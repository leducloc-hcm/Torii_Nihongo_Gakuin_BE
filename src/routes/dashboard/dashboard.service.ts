import { Injectable } from '@nestjs/common'
import { DashboardRepository } from './dashboard.repo'
import {
  TimePeriod,
  DashboardQueryType,
  RevenueOverviewType,
  UserGrowthAnalyticsType,
  CourseRevenueBreakdownType,
  DashboardStatsType,
  QuickStatsType,
  RevenueByPeriodType,
  UserGrowthByPeriodType,
} from './dashboard.model'

@Injectable()
export class DashboardService {
  constructor(private readonly dashboardRepo: DashboardRepository) {}

  async getRevenueOverview(query: DashboardQueryType): Promise<RevenueOverviewType> {
    const { period = 'month', startDate, endDate, limit = 12 } = query

    // Calculate date range
    const dateRange = this.calculateDateRange(period, startDate, endDate, limit)
    const { start, end, previousStart, previousEnd } = dateRange

    // Get current period revenue
    const currentRevenue = await this.dashboardRepo.getTotalRevenue(start, end)

    // Get previous period revenue for growth calculation
    const previousRevenue = await this.dashboardRepo.getTotalRevenue(previousStart, previousEnd)

    // Get revenue by period
    const revenueByPeriod = await this.dashboardRepo.getRevenueByPeriod(period, start, end)

    // Calculate growth rate
    const growthRate = this.calculateGrowthRate(currentRevenue.totalRevenue, previousRevenue.totalRevenue)

    // Format revenue by period
    const formattedRevenueByPeriod: RevenueByPeriodType[] = revenueByPeriod.map((item) => ({
      period: item.period.toISOString(),
      revenue: item.revenue,
      orderCount: item.orderCount,
      periodLabel: this.formatPeriodLabel(item.period, period),
    }))

    return {
      totalRevenue: currentRevenue.totalRevenue,
      totalOrders: currentRevenue.totalOrders,
      averageOrderValue: currentRevenue.totalOrders > 0 ? currentRevenue.totalRevenue / currentRevenue.totalOrders : 0,
      revenueByPeriod: formattedRevenueByPeriod,
      growthRate,
    }
  }

  async getUserGrowthAnalytics(query: DashboardQueryType): Promise<UserGrowthAnalyticsType> {
    const { period = 'month', startDate, endDate, limit = 12 } = query

    // Calculate date range
    const dateRange = this.calculateDateRange(period, startDate, endDate, limit)
    const { start, end, previousStart, previousEnd } = dateRange

    // Get basic user stats
    const totalUsers = await this.dashboardRepo.getTotalUsers()

    // Get new users for different periods
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [newUsersToday, newUsersThisWeek, newUsersThisMonth, previousMonthUsers] = await Promise.all([
      this.dashboardRepo.getNewUsersCount(todayStart, now),
      this.dashboardRepo.getNewUsersCount(weekStart, now),
      this.dashboardRepo.getNewUsersCount(monthStart, now),
      this.dashboardRepo.getNewUsersCount(previousStart, previousEnd),
    ])

    // Get user growth by period
    const userGrowthByPeriod = await this.dashboardRepo.getUserGrowthByPeriod(period, start, end)

    // Calculate monthly growth rate
    const growthRate = this.calculateGrowthRate(newUsersThisMonth, previousMonthUsers)

    // Format user growth data
    const formattedUserGrowthByPeriod: UserGrowthByPeriodType[] = await Promise.all(
      userGrowthByPeriod.map(async (item) => {
        const totalUsersAtPeriod = await this.dashboardRepo.getTotalUsersByDate(item.period)
        return {
          period: item.period.toISOString(),
          newUsers: item.newUsers,
          totalUsers: totalUsersAtPeriod,
          periodLabel: this.formatPeriodLabel(item.period, period),
        }
      }),
    )

    return {
      totalUsers,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      growthRate,
      userGrowthByPeriod: formattedUserGrowthByPeriod,
    }
  }

  async getCourseRevenueBreakdown(query: DashboardQueryType): Promise<CourseRevenueBreakdownType> {
    const { limit = 10 } = query

    // Get course revenue data
    const [coursesByRevenue, topCoursesByRevenue, topCoursesByEnrollments, totalStats] = await Promise.all([
      this.dashboardRepo.getCourseRevenueBreakdown(limit),
      this.dashboardRepo.getTopCoursesByRevenue(5),
      this.dashboardRepo.getTopCoursesByEnrollments(5),
      this.dashboardRepo.getTotalCourseStats(),
    ])

    return {
      totalCourseRevenue: totalStats.totalCourseRevenue,
      totalEnrollments: totalStats.totalEnrollments,
      averageRevenuePerCourse:
        totalStats.totalCourses > 0 ? totalStats.totalCourseRevenue / totalStats.totalCourses : 0,
      coursesByRevenue: coursesByRevenue.map((course) => ({
        ...course,
        thumbnailUrl: course.thumbnailUrl || undefined,
      })),
      topCoursesByRevenue: topCoursesByRevenue.map((course) => ({
        ...course,
        thumbnailUrl: course.thumbnailUrl || undefined,
      })),
      topCoursesByEnrollments: topCoursesByEnrollments.map((course) => ({
        ...course,
        thumbnailUrl: course.thumbnailUrl || undefined,
      })),
    }
  }

  async getDashboardStats(query: DashboardQueryType): Promise<DashboardStatsType> {
    const [revenueOverview, userGrowthAnalytics, courseRevenueBreakdown] = await Promise.all([
      this.getRevenueOverview(query),
      this.getUserGrowthAnalytics(query),
      this.getCourseRevenueBreakdown(query),
    ])

    return {
      revenueOverview,
      userGrowthAnalytics,
      courseRevenueBreakdown,
      lastUpdated: new Date(),
    }
  }

  async getQuickStats(): Promise<QuickStatsType> {
    const quickStats = await this.dashboardRepo.getQuickStats()

    // Calculate monthly growth rate
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    const [thisMonthUsers, lastMonthUsers] = await Promise.all([
      this.dashboardRepo.getNewUsersCount(thisMonth, now),
      this.dashboardRepo.getNewUsersCount(lastMonth, lastMonthEnd),
    ])

    const growthRateThisMonth = this.calculateGrowthRate(thisMonthUsers, lastMonthUsers)

    return {
      ...quickStats,
      growthRateThisMonth,
    }
  }

  // Helper methods
  private calculateDateRange(period: TimePeriod, startDate?: string, endDate?: string, limit: number = 12) {
    const now = new Date()
    let start: Date
    const end: Date = endDate ? new Date(endDate) : now

    if (startDate) {
      start = new Date(startDate)
    } else {
      // Calculate start date based on period and limit
      switch (period) {
        case 'day':
          start = new Date(end.getTime() - (limit - 1) * 24 * 60 * 60 * 1000)
          break
        case 'week':
          start = new Date(end.getTime() - (limit - 1) * 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          start = new Date(end.getFullYear(), end.getMonth() - (limit - 1), 1)
          break
        case 'quarter': {
          const currentQuarter = Math.floor(end.getMonth() / 3)
          const startQuarter = currentQuarter - (limit - 1)
          start = new Date(end.getFullYear(), startQuarter * 3, 1)
          break
        }
        case 'year':
          start = new Date(end.getFullYear() - (limit - 1), 0, 1)
          break
        default:
          start = new Date(end.getTime() - (limit - 1) * 24 * 60 * 60 * 1000)
      }
    }

    // Calculate previous period for growth comparison
    const periodDuration = end.getTime() - start.getTime()
    const previousEnd = new Date(start.getTime() - 1)
    const previousStart = new Date(previousEnd.getTime() - periodDuration)

    return { start, end, previousStart, previousEnd }
  }

  private calculateGrowthRate(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100 * 100) / 100 // Round to 2 decimal places
  }

  private formatPeriodLabel(date: Date, period: TimePeriod): string {
    const options: Intl.DateTimeFormatOptions = {}

    switch (period) {
      case 'day':
        return date.toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      case 'week': {
        const weekStart = new Date(date)
        const weekEnd = new Date(date.getTime() + 6 * 24 * 60 * 60 * 1000)
        return `${weekStart.toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
        })} - ${weekEnd.toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
        })}`
      }
      case 'month':
        return date.toLocaleDateString('vi-VN', {
          month: '2-digit',
          year: 'numeric',
        })
      case 'quarter': {
        const quarter = Math.floor(date.getMonth() / 3) + 1
        return `Q${quarter} ${date.getFullYear()}`
      }
      case 'year':
        return date.getFullYear().toString()
      default:
        return date.toLocaleDateString('vi-VN')
    }
  }
}
