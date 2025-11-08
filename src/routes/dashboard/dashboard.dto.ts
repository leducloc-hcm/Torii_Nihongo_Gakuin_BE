import { createZodDto } from 'nestjs-zod'
import {
  DashboardQuerySchema,
  RevenueByPeriodSchema,
  RevenueOverviewSchema,
  UserGrowthByPeriodSchema,
  UserGrowthAnalyticsSchema,
  CourseRevenueItemSchema,
  TopCourseComparisonSchema,
  CourseRevenueBreakdownSchema,
  DashboardStatsSchema,
  QuickStatsSchema,
  TimePeriod,
} from './dashboard.model'

// Export TimePeriod enum for use in other files
export type { TimePeriod }

// DTOs using Zod
export class DashboardQueryDTO extends createZodDto(DashboardQuerySchema) {}

// Revenue Overview DTOs
export class RevenueByPeriodDTO extends createZodDto(RevenueByPeriodSchema) {}
export class RevenueOverviewDTO extends createZodDto(RevenueOverviewSchema) {}

// User Growth Analytics DTOs
export class UserGrowthByPeriodDTO extends createZodDto(UserGrowthByPeriodSchema) {}
export class UserGrowthAnalyticsDTO extends createZodDto(UserGrowthAnalyticsSchema) {}

// Course Revenue Breakdown DTOs
export class CourseRevenueItemDTO extends createZodDto(CourseRevenueItemSchema) {}
export class TopCourseComparisonDTO extends createZodDto(TopCourseComparisonSchema) {}
export class CourseRevenueBreakdownDTO extends createZodDto(CourseRevenueBreakdownSchema) {}

// Combined Dashboard Response
export class DashboardStatsDTO extends createZodDto(DashboardStatsSchema) {}

// Quick Stats DTOs for summary cards
export class QuickStatsDTO extends createZodDto(QuickStatsSchema) {}
