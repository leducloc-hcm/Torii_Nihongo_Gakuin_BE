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
  // Customer Dashboard Schemas
  CustomerCourseStatsSchema,
  CustomerStudyTimeSchema,
  CustomerAssessmentStatsSchema,
  CustomerFlashcardStatsSchema,
  CustomerPaymentSummarySchema,
  CustomerProgressItemSchema,
  CustomerFlashcardDeckSchema,
  CustomerRecentPaymentSchema,
  CustomerDashboardSchema,
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

// Customer Dashboard DTOs
export class CustomerCourseStatsDTO extends createZodDto(CustomerCourseStatsSchema) {}
export class CustomerStudyTimeDTO extends createZodDto(CustomerStudyTimeSchema) {}
export class CustomerAssessmentStatsDTO extends createZodDto(CustomerAssessmentStatsSchema) {}
export class CustomerFlashcardStatsDTO extends createZodDto(CustomerFlashcardStatsSchema) {}
export class CustomerPaymentSummaryDTO extends createZodDto(CustomerPaymentSummarySchema) {}
export class CustomerProgressItemDTO extends createZodDto(CustomerProgressItemSchema) {}
export class CustomerFlashcardDeckDTO extends createZodDto(CustomerFlashcardDeckSchema) {}
export class CustomerRecentPaymentDTO extends createZodDto(CustomerRecentPaymentSchema) {}
export class CustomerDashboardDTO extends createZodDto(CustomerDashboardSchema) {}
