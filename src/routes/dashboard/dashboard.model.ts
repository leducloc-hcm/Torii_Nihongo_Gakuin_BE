import { z } from 'zod'

// Enums
export const TimePeriodSchema = z.enum(['day', 'week', 'month', 'quarter', 'year'])

// Query Schema
export const DashboardQuerySchema = z.object({
  period: TimePeriodSchema.optional().default('month'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
})

// Revenue Overview Schemas
export const RevenueByPeriodSchema = z.object({
  period: z.string(),
  revenue: z.number().nonnegative(),
  orderCount: z.number().int().nonnegative(),
  periodLabel: z.string(),
})

export const RevenueOverviewSchema = z.object({
  totalRevenue: z.number().nonnegative(),
  totalOrders: z.number().int().nonnegative(),
  averageOrderValue: z.number().nonnegative(),
  revenueByPeriod: z.array(RevenueByPeriodSchema),
  growthRate: z.number(), // Percentage growth compared to previous period
})

// User Growth Analytics Schemas
export const UserGrowthByPeriodSchema = z.object({
  period: z.string(),
  newUsers: z.number().int().nonnegative(),
  totalUsers: z.number().int().nonnegative(),
  periodLabel: z.string(),
})

export const UserGrowthAnalyticsSchema = z.object({
  totalUsers: z.number().int().nonnegative(),
  newUsersToday: z.number().int().nonnegative(),
  newUsersThisWeek: z.number().int().nonnegative(),
  newUsersThisMonth: z.number().int().nonnegative(),
  growthRate: z.number(), // Monthly growth rate percentage
  userGrowthByPeriod: z.array(UserGrowthByPeriodSchema),
})

// Course Revenue Breakdown Schemas
export const CourseRevenueItemSchema = z.object({
  courseId: z.number().int().positive(),
  courseName: z.string(),
  courseSlug: z.string(),
  totalRevenue: z.number().nonnegative(),
  totalEnrollments: z.number().int().nonnegative(),
  averagePrice: z.number().nonnegative(),
  thumbnailUrl: z.string().url().optional(),
  level: z.string(),
})

export const TopCourseComparisonSchema = z.object({
  courseId: z.number().int().positive(),
  courseName: z.string(),
  courseSlug: z.string(),
  totalRevenue: z.number().nonnegative(),
  totalEnrollments: z.number().int().nonnegative(),
  level: z.string(),
  thumbnailUrl: z.string().url().optional(),
})

export const CourseRevenueBreakdownSchema = z.object({
  totalCourseRevenue: z.number().nonnegative(),
  totalEnrollments: z.number().int().nonnegative(),
  averageRevenuePerCourse: z.number().nonnegative(),
  coursesByRevenue: z.array(CourseRevenueItemSchema),
  topCoursesByRevenue: z.array(TopCourseComparisonSchema),
  topCoursesByEnrollments: z.array(TopCourseComparisonSchema),
})

// Combined Dashboard Response Schema
export const DashboardStatsSchema = z.object({
  revenueOverview: RevenueOverviewSchema,
  userGrowthAnalytics: UserGrowthAnalyticsSchema,
  courseRevenueBreakdown: CourseRevenueBreakdownSchema,
  lastUpdated: z.date(),
})

// Quick Stats Schema
export const QuickStatsSchema = z.object({
  totalRevenue: z.number().nonnegative(),
  totalUsers: z.number().int().nonnegative(),
  totalCourses: z.number().int().nonnegative(),
  totalEnrollments: z.number().int().nonnegative(),
  newUsersToday: z.number().int().nonnegative(),
  newUsersThisWeek: z.number().int().nonnegative(),
  revenueThisMonth: z.number().nonnegative(),
  growthRateThisMonth: z.number(),
})

// Export types
export type TimePeriod = z.infer<typeof TimePeriodSchema>
export type DashboardQueryType = z.infer<typeof DashboardQuerySchema>
export type RevenueByPeriodType = z.infer<typeof RevenueByPeriodSchema>
export type RevenueOverviewType = z.infer<typeof RevenueOverviewSchema>
export type UserGrowthByPeriodType = z.infer<typeof UserGrowthByPeriodSchema>
export type UserGrowthAnalyticsType = z.infer<typeof UserGrowthAnalyticsSchema>
export type CourseRevenueItemType = z.infer<typeof CourseRevenueItemSchema>
export type TopCourseComparisonType = z.infer<typeof TopCourseComparisonSchema>
export type CourseRevenueBreakdownType = z.infer<typeof CourseRevenueBreakdownSchema>
export type DashboardStatsType = z.infer<typeof DashboardStatsSchema>
export type QuickStatsType = z.infer<typeof QuickStatsSchema>
