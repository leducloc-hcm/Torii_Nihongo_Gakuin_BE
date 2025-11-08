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

// Customer Dashboard Schemas
export const CustomerCourseStatsSchema = z.object({
  totalCourses: z.number().int().nonnegative(),
  completedCourses: z.number().int().nonnegative(),
  inProgressCourses: z.number().int().nonnegative(),
  completionRate: z.number().min(0).max(100), // Percentage
})

export const CustomerStudyTimeSchema = z.object({
  totalStudyMinutes: z.number().int().nonnegative(),
  todayStudyMinutes: z.number().int().nonnegative(),
  thisWeekStudyMinutes: z.number().int().nonnegative(),
  thisMonthStudyMinutes: z.number().int().nonnegative(),
  averageDailyMinutes: z.number().nonnegative(),
  studyStreak: z.number().int().nonnegative(), // Days of consecutive study
})

export const CustomerAssessmentStatsSchema = z.object({
  totalAttempts: z.number().int().nonnegative(),
  completedAssessments: z.number().int().nonnegative(),
  averageScore: z.number().min(0).max(100),
  highestScore: z.number().min(0).max(100),
  passedAssessments: z.number().int().nonnegative(),
  failedAssessments: z.number().int().nonnegative(),
  passRate: z.number().min(0).max(100), // Percentage
})

export const CustomerFlashcardStatsSchema = z.object({
  totalFlashcards: z.number().int().nonnegative(),
  masteredFlashcards: z.number().int().nonnegative(),
  reviewingFlashcards: z.number().int().nonnegative(),
  newFlashcards: z.number().int().nonnegative(),
  dailyReviewsCompleted: z.number().int().nonnegative(),
  accuracyRate: z.number().min(0).max(100), // Percentage
})

export const CustomerPaymentSummarySchema = z.object({
  totalSpent: z.number().nonnegative(),
  totalOrders: z.number().int().nonnegative(),
  successfulPayments: z.number().int().nonnegative(),
  pendingPayments: z.number().int().nonnegative(),
  failedPayments: z.number().int().nonnegative(),
  averageOrderValue: z.number().nonnegative(),
  lastPaymentDate: z.date().optional(),
})

export const CustomerProgressItemSchema = z.object({
  courseId: z.number().int().positive(),
  courseName: z.string(),
  courseSlug: z.string(),
  thumbnailUrl: z.string().url().optional(),
  enrollmentDate: z.date(),
  progressPercentage: z.number().min(0).max(100),
  completedLessons: z.number().int().nonnegative(),
  totalLessons: z.number().int().nonnegative(),
  lastStudiedAt: z.date().optional(),
  estimatedTimeToComplete: z.number().int().nonnegative().optional(), // Minutes
  level: z.string(),
})

export const CustomerFlashcardDeckSchema = z.object({
  deckId: z.number().int().positive(),
  deckName: z.string(),
  totalCards: z.number().int().nonnegative(),
  newCards: z.number().int().nonnegative(),
  reviewCards: z.number().int().nonnegative(),
  masteredCards: z.number().int().nonnegative(),
  lastReviewedAt: z.date().optional(),
  accuracyRate: z.number().min(0).max(100),
  courseId: z.number().int().positive().optional(),
  courseName: z.string().optional(),
})

export const CustomerRecentPaymentSchema = z.object({
  orderId: z.number().int().positive(),
  courseId: z.number().int().positive(),
  courseName: z.string(),
  amount: z.number().nonnegative(),
  status: z.enum(['success', 'pending', 'failed']),
  paymentDate: z.date(),
  paymentMethod: z.string().optional(),
})

export const CustomerDashboardSchema = z.object({
  courseStats: CustomerCourseStatsSchema,
  studyTime: CustomerStudyTimeSchema,
  assessmentStats: CustomerAssessmentStatsSchema,
  flashcardStats: CustomerFlashcardStatsSchema,
  paymentSummary: CustomerPaymentSummarySchema,
  recentProgress: z.array(CustomerProgressItemSchema),
  flashcardDecks: z.array(CustomerFlashcardDeckSchema),
  recentPayments: z.array(CustomerRecentPaymentSchema),
  lastUpdated: z.date(),
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

// Customer Dashboard Types
export type CustomerCourseStatsType = z.infer<typeof CustomerCourseStatsSchema>
export type CustomerStudyTimeType = z.infer<typeof CustomerStudyTimeSchema>
export type CustomerAssessmentStatsType = z.infer<typeof CustomerAssessmentStatsSchema>
export type CustomerFlashcardStatsType = z.infer<typeof CustomerFlashcardStatsSchema>
export type CustomerPaymentSummaryType = z.infer<typeof CustomerPaymentSummarySchema>
export type CustomerProgressItemType = z.infer<typeof CustomerProgressItemSchema>
export type CustomerFlashcardDeckType = z.infer<typeof CustomerFlashcardDeckSchema>
export type CustomerRecentPaymentType = z.infer<typeof CustomerRecentPaymentSchema>
export type CustomerDashboardType = z.infer<typeof CustomerDashboardSchema>
