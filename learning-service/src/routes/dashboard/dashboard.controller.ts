import {
  Controller,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Param,
  ParseIntPipe,
} from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { DashboardQueryDTO } from "./dashboard.dto";
import { TimePeriod } from "./dashboard.model";
import { Auth } from "src/shared/decorators/auth.decorator";
import { AuthType } from "src/shared/constants/auth.constant";
import { Roles } from "src/shared/decorators/roles.decorator";
import { RolesGuard } from "src/shared/guards/roles.guard";
import { RoleName } from "src/shared/constants/role.constant";
import { ActiveUser } from "src/shared/decorators/active-user.decorator";
import type { AccessTokenPayload } from "src/shared/types/jwt.type";

@Controller("dashboard")
@UseGuards(RolesGuard)
@Auth([AuthType.Bearer])
@Roles(RoleName.Admin, RoleName.Staff)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("stats")
  @HttpCode(HttpStatus.OK)
  async getDashboardStats(@Query() query: DashboardQueryDTO) {
    return await this.dashboardService.getDashboardStats(query);
  }

  @Get("revenue-overview")
  @HttpCode(HttpStatus.OK)
  async getRevenueOverview(@Query() query: DashboardQueryDTO) {
    return await this.dashboardService.getRevenueOverview(query);
  }

  @Get("user-growth")
  @HttpCode(HttpStatus.OK)
  async getUserGrowthAnalytics(@Query() query: DashboardQueryDTO) {
    return await this.dashboardService.getUserGrowthAnalytics(query);
  }

  @Get("course-revenue")
  @HttpCode(HttpStatus.OK)
  async getCourseRevenueBreakdown(@Query() query: DashboardQueryDTO) {
    return await this.dashboardService.getCourseRevenueBreakdown(query);
  }

  @Get("quick-stats")
  @HttpCode(HttpStatus.OK)
  async getQuickStats() {
    return await this.dashboardService.getQuickStats();
  }

  @Get("customer")
  @HttpCode(HttpStatus.OK)
  @Roles(RoleName.Customer)
  async getCustomerDashboard(@ActiveUser() user: AccessTokenPayload) {
    return await this.dashboardService.getCustomerDashboard(user.userId);
  }

  @Get("revenue/daily")
  @HttpCode(HttpStatus.OK)
  async getDailyRevenue(@Query() query: Omit<DashboardQueryDTO, "period">) {
    return await this.dashboardService.getRevenueOverview({
      ...query,
      period: "day",
    });
  }

  @Get("revenue/weekly")
  @HttpCode(HttpStatus.OK)
  async getWeeklyRevenue(@Query() query: Omit<DashboardQueryDTO, "period">) {
    return await this.dashboardService.getRevenueOverview({
      ...query,
      period: "week",
    });
  }

  @Get("revenue/monthly")
  @HttpCode(HttpStatus.OK)
  async getMonthlyRevenue(@Query() query: Omit<DashboardQueryDTO, "period">) {
    return await this.dashboardService.getRevenueOverview({
      ...query,
      period: "month",
    });
  }

  @Get("revenue/quarterly")
  @HttpCode(HttpStatus.OK)
  async getQuarterlyRevenue(@Query() query: Omit<DashboardQueryDTO, "period">) {
    return await this.dashboardService.getRevenueOverview({
      ...query,
      period: "quarter",
    });
  }

  @Get("revenue/yearly")
  @HttpCode(HttpStatus.OK)
  async getYearlyRevenue(@Query() query: Omit<DashboardQueryDTO, "period">) {
    return await this.dashboardService.getRevenueOverview({
      ...query,
      period: "year",
    });
  }

  @Get("users/daily")
  @HttpCode(HttpStatus.OK)
  async getDailyUserGrowth(@Query() query: Omit<DashboardQueryDTO, "period">) {
    return await this.dashboardService.getUserGrowthAnalytics({
      ...query,
      period: "day",
    });
  }

  @Get("users/weekly")
  @HttpCode(HttpStatus.OK)
  async getWeeklyUserGrowth(@Query() query: Omit<DashboardQueryDTO, "period">) {
    return await this.dashboardService.getUserGrowthAnalytics({
      ...query,
      period: "week",
    });
  }

  @Get("users/monthly")
  @HttpCode(HttpStatus.OK)
  async getMonthlyUserGrowth(
    @Query() query: Omit<DashboardQueryDTO, "period">,
  ) {
    return await this.dashboardService.getUserGrowthAnalytics({
      ...query,
      period: "month",
    });
  }
}

// Customer Dashboard Controller
@Controller("dashboard/customer")
@UseGuards(RolesGuard)
@Auth([AuthType.Bearer])
@Roles(RoleName.Customer)
export class CustomerDashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getCustomerDashboard(@ActiveUser("userId") userId: number) {
    return await this.dashboardService.getCustomerDashboard(userId);
  }

  @Get("courses")
  @HttpCode(HttpStatus.OK)
  async getCustomerCourseStats(@ActiveUser("userId") userId: number) {
    return await this.dashboardService.getCustomerCourseStats(userId);
  }

  @Get("study-time")
  @HttpCode(HttpStatus.OK)
  async getCustomerStudyTime(@ActiveUser("userId") userId: number) {
    return await this.dashboardService.getCustomerStudyTime(userId);
  }

  @Get("assessments")
  @HttpCode(HttpStatus.OK)
  async getCustomerAssessmentStats(@ActiveUser("userId") userId: number) {
    return await this.dashboardService.getCustomerAssessmentStats(userId);
  }

  @Get("flashcards")
  @HttpCode(HttpStatus.OK)
  async getCustomerFlashcardStats(@ActiveUser("userId") userId: number) {
    return await this.dashboardService.getCustomerFlashcardStats(userId);
  }

  @Get("payments")
  @HttpCode(HttpStatus.OK)
  async getCustomerPaymentSummary(@ActiveUser("userId") userId: number) {
    return await this.dashboardService.getCustomerPaymentSummary(userId);
  }

  @Get("progress")
  @HttpCode(HttpStatus.OK)
  async getCustomerProgress(
    @ActiveUser("userId") userId: number,
    @Query("limit", new ParseIntPipe({ optional: true })) limit: number = 10,
  ) {
    return await this.dashboardService.getCustomerProgress(userId, limit);
  }

  @Get("flashcard-decks")
  @HttpCode(HttpStatus.OK)
  async getCustomerFlashcardDecks(
    @ActiveUser("userId") userId: number,
    @Query("limit", new ParseIntPipe({ optional: true })) limit: number = 10,
  ) {
    return await this.dashboardService.getCustomerFlashcardDecks(userId, limit);
  }

  @Get("recent-payments")
  @HttpCode(HttpStatus.OK)
  async getCustomerRecentPayments(
    @ActiveUser("userId") userId: number,
    @Query("limit", new ParseIntPipe({ optional: true })) limit: number = 10,
  ) {
    return await this.dashboardService.getCustomerRecentPayments(userId, limit);
  }
}
