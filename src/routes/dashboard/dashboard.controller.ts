import { Controller, Get, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common'
import { DashboardService } from './dashboard.service'
import { DashboardQueryDTO } from './dashboard.dto'
import { TimePeriod } from './dashboard.model'
import { Auth } from 'src/shared/decorators/auth.decorator'
import { AuthType } from 'src/shared/constants/auth.constant'
import { Roles } from 'src/shared/decorators/roles.decorator'
import { RolesGuard } from 'src/shared/guards/roles.guard'
import { RoleName } from 'src/shared/constants/role.constant'

@Controller('dashboard')
@UseGuards(RolesGuard)
@Auth([AuthType.Bearer])
@Roles(RoleName.Admin, RoleName.Staff)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  async getDashboardStats(@Query() query: DashboardQueryDTO) {
    return await this.dashboardService.getDashboardStats(query)
  }

  @Get('revenue-overview')
  @HttpCode(HttpStatus.OK)
  async getRevenueOverview(@Query() query: DashboardQueryDTO) {
    return await this.dashboardService.getRevenueOverview(query)
  }

  @Get('user-growth')
  @HttpCode(HttpStatus.OK)
  async getUserGrowthAnalytics(@Query() query: DashboardQueryDTO) {
    return await this.dashboardService.getUserGrowthAnalytics(query)
  }

  @Get('course-revenue')
  @HttpCode(HttpStatus.OK)
  async getCourseRevenueBreakdown(@Query() query: DashboardQueryDTO) {
    return await this.dashboardService.getCourseRevenueBreakdown(query)
  }

  @Get('quick-stats')
  @HttpCode(HttpStatus.OK)
  async getQuickStats() {
    return await this.dashboardService.getQuickStats()
  }
  @Get('revenue/daily')
  @HttpCode(HttpStatus.OK)
  async getDailyRevenue(@Query() query: Omit<DashboardQueryDTO, 'period'>) {
    return await this.dashboardService.getRevenueOverview({
      ...query,
      period: 'day',
    })
  }

  @Get('revenue/weekly')
  @HttpCode(HttpStatus.OK)
  async getWeeklyRevenue(@Query() query: Omit<DashboardQueryDTO, 'period'>) {
    return await this.dashboardService.getRevenueOverview({
      ...query,
      period: 'week',
    })
  }

  @Get('revenue/monthly')
  @HttpCode(HttpStatus.OK)
  async getMonthlyRevenue(@Query() query: Omit<DashboardQueryDTO, 'period'>) {
    return await this.dashboardService.getRevenueOverview({
      ...query,
      period: 'month',
    })
  }

  @Get('revenue/quarterly')
  @HttpCode(HttpStatus.OK)
  async getQuarterlyRevenue(@Query() query: Omit<DashboardQueryDTO, 'period'>) {
    return await this.dashboardService.getRevenueOverview({
      ...query,
      period: 'quarter',
    })
  }

  @Get('revenue/yearly')
  @HttpCode(HttpStatus.OK)
  async getYearlyRevenue(@Query() query: Omit<DashboardQueryDTO, 'period'>) {
    return await this.dashboardService.getRevenueOverview({
      ...query,
      period: 'year',
    })
  }

  @Get('users/daily')
  @HttpCode(HttpStatus.OK)
  async getDailyUserGrowth(@Query() query: Omit<DashboardQueryDTO, 'period'>) {
    return await this.dashboardService.getUserGrowthAnalytics({
      ...query,
      period: 'day',
    })
  }

  @Get('users/weekly')
  @HttpCode(HttpStatus.OK)
  async getWeeklyUserGrowth(@Query() query: Omit<DashboardQueryDTO, 'period'>) {
    return await this.dashboardService.getUserGrowthAnalytics({
      ...query,
      period: 'week',
    })
  }

  @Get('users/monthly')
  @HttpCode(HttpStatus.OK)
  async getMonthlyUserGrowth(@Query() query: Omit<DashboardQueryDTO, 'period'>) {
    return await this.dashboardService.getUserGrowthAnalytics({
      ...query,
      period: 'month',
    })
  }
}
