// Coupon Controller

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'
import { CouponService } from './coupon.service'
import {
  CreateCouponDTO,
  UpdateCouponDTO,
  ValidateCouponDTO,
  RedeemGiftCouponDTO,
  SelectClassForGiftDTO,
  ApprovalActionDTO,
  ListCouponsQueryDTO,
} from './coupon.dto'
import { AccessTokenGuard } from 'src/shared/guards/access-token.guard'
import { RolesGuard } from 'src/shared/guards/roles.guard'
import { Roles } from 'src/shared/decorators/roles.decorator'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'
import { Role } from '@prisma/client'

@ApiTags('Coupons')
@Controller('coupons')
@UseGuards(AccessTokenGuard)
@ApiBearerAuth()
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  // ===== Staff/Admin Operations =====

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Create a new coupon' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Coupon created successfully' })
  async createCoupon(@Body() createDto: CreateCouponDTO, @ActiveUser('userId') userId: number) {
    return this.couponService.createCoupon(createDto, userId)
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'List coupons with filtering' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Coupons retrieved successfully' })
  async listCoupons(@Query() query: ListCouponsQueryDTO) {
    return this.couponService.listCoupons(query)
  }

  @Get('pending-approval')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get coupons pending approval' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Pending approvals retrieved successfully' })
  async getPendingApprovals() {
    return this.couponService.getPendingApprovals()
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Get coupon by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Coupon retrieved successfully' })
  async getCoupon(@Param('id', ParseIntPipe) id: number) {
    return this.couponService.getCoupon(id)
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Update a coupon' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Coupon updated successfully' })
  async updateCoupon(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateCouponDTO,
    @ActiveUser('userId') userId: number,
  ) {
    return this.couponService.updateCoupon(id, updateDto, userId)
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Delete a coupon' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Coupon deleted successfully' })
  async deleteCoupon(@Param('id', ParseIntPipe) id: number, @ActiveUser('userId') userId: number) {
    return this.couponService.deleteCoupon(id, userId)
  }

  @Post(':id/submit-approval')
  @UseGuards(RolesGuard)
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Submit coupon for approval' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Coupon submitted for approval' })
  async submitForApproval(@Param('id', ParseIntPipe) id: number, @ActiveUser('userId') userId: number) {
    return this.couponService.submitForApproval(id, userId)
  }

  @Post(':id/approval-action')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Approve or reject a coupon' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Approval action completed' })
  async approveOrRejectCoupon(
    @Param('id', ParseIntPipe) id: number,
    @Body() approvalDto: ApprovalActionDTO,
    @ActiveUser('userId') userId: number,
  ) {
    return this.couponService.approveOrRejectCoupon(id, approvalDto, userId)
  }

  @Post(':id/toggle-status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Toggle coupon active/inactive status' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Coupon status toggled' })
  async toggleCouponStatus(@Param('id', ParseIntPipe) id: number, @ActiveUser('userId') userId: number) {
    return this.couponService.toggleCouponStatus(id, userId)
  }

  // ===== Customer Operations =====

  @Post('validate')
  @ApiOperation({ summary: 'Validate a coupon for checkout' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Coupon validation result' })
  async validateCoupon(@Body() validationDto: ValidateCouponDTO, @ActiveUser('userId') userId: number) {
    return this.couponService.validateCoupon(validationDto, userId)
  }

  @Post('redeem-gift')
  @ApiOperation({ summary: 'Redeem a gift coupon' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Gift coupon redeemed successfully' })
  async redeemGiftCoupon(@Body() redeemDto: RedeemGiftCouponDTO, @ActiveUser('userId') userId: number) {
    return this.couponService.redeemGiftCoupon(redeemDto, userId)
  }

  @Post('select-class')
  @ApiOperation({ summary: 'Select class for gift coupon live course' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Class selection completed' })
  async selectClassForGift(@Body() selectDto: SelectClassForGiftDTO, @ActiveUser('userId') userId: number) {
    return this.couponService.selectClassForGift(selectDto, userId)
  }

  @Get('my/redemptions')
  @ApiOperation({ summary: 'Get user redemption history' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User redemptions retrieved successfully' })
  async getUserRedemptions(
    @ActiveUser('userId') userId: number,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
  ) {
    return this.couponService.getUserRedemptions(userId, { page, limit })
  }
}
