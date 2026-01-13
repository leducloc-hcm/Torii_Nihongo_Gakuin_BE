import { Controller, Get, Post, Query, UseGuards, HttpStatus, ParseIntPipe } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'
import { CouponLifecycleWorker } from './coupon-expiry.worker'
import { AccessTokenGuard } from '../guards/access-token.guard'
import { RolesGuard } from '../guards/roles.guard'
import { Roles } from '../decorators/roles.decorator'
import { ActiveUser } from '../decorators/active-user.decorator'
import { Role } from '@prisma/client'

@ApiTags('Admin - Coupon Workers')
@Controller('admin/coupon-workers')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class CouponAdminController {
  constructor(private readonly couponLifecycleWorker: CouponLifecycleWorker) {}

  @Post('check-expired')
  @ApiOperation({ summary: 'Manually trigger coupon expiry check' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Expiry check completed' })
  async manualExpiryCheck(@ActiveUser('userId') userId: number) {
    await this.couponLifecycleWorker.processExpiredCouponsManually()

    return {
      message: 'Manual coupon expiry check completed',
      triggeredBy: userId,
      timestamp: new Date().toISOString(),
    }
  }

  @Get('expiry-statistics')
  @ApiOperation({ summary: 'Get coupon expiry statistics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Expiry statistics retrieved' })
  async getExpiryStatistics(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 30
    return await this.couponLifecycleWorker.getExpiryStatistics(daysNum)
  }

  @Get('near-expiry')
  @ApiOperation({ summary: 'Get coupons near expiry' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Near expiry coupons retrieved' })
  async getCouponsNearExpiry(@Query('hours') hours?: string) {
    const hoursNum = hours ? parseInt(hours, 10) : 24
    return await this.couponLifecycleWorker.getCouponsNearExpiry(hoursNum)
  }

  @Get('overdue-coupons')
  @ApiOperation({ summary: 'Get coupons that should have been expired' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Overdue coupons retrieved' })
  async getOverdueCoupons() {
    return await this.couponLifecycleWorker.getOverdueCoupons()
  }

  @Get('worker-health')
  @ApiOperation({ summary: 'Check coupon lifecycle worker health' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Worker health status retrieved' })
  async getWorkerHealth() {
    return await this.couponLifecycleWorker.healthCheck()
  }

  // ===== Activation Management =====

  @Post('check-activation')
  @ApiOperation({ summary: 'Manually trigger coupon activation check' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Activation check completed' })
  async manualActivationCheck(@ActiveUser('userId') userId: number) {
    await this.couponLifecycleWorker.processActivationManually()

    return {
      message: 'Manual coupon activation check completed',
      triggeredBy: userId,
      timestamp: new Date().toISOString(),
    }
  }

  @Post('check-lifecycle')
  @ApiOperation({ summary: 'Manually trigger both expiry and activation checks' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lifecycle check completed' })
  async manualLifecycleCheck(@ActiveUser('userId') userId: number) {
    await this.couponLifecycleWorker.processLifecycleManually()

    return {
      message: 'Manual coupon lifecycle check completed (expiry + activation)',
      triggeredBy: userId,
      timestamp: new Date().toISOString(),
    }
  }

  @Get('activation-statistics')
  @ApiOperation({ summary: 'Get coupon activation statistics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Activation statistics retrieved' })
  async getActivationStatistics(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 30
    return await this.couponLifecycleWorker.getActivationStatistics(daysNum)
  }

  @Get('near-activation')
  @ApiOperation({ summary: 'Get coupons near activation' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Near activation coupons retrieved' })
  async getCouponsNearActivation(@Query('hours') hours?: string) {
    const hoursNum = hours ? parseInt(hours, 10) : 24
    return await this.couponLifecycleWorker.getCouponsNearActivation(hoursNum)
  }

  @Get('overdue-activations')
  @ApiOperation({ summary: 'Get coupons that should have been activated' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Overdue activations retrieved' })
  async getOverdueActivations() {
    return await this.couponLifecycleWorker.getOverdueActivations()
  }
}
