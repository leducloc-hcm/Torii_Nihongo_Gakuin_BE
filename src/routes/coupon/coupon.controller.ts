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
  Request,
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
  async createCoupon(@Body() createDto: CreateCouponDTO, @Request() req: any) {
    return this.couponService.createCoupon(createDto, req.user.id)
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'List coupons with filtering' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Coupons retrieved successfully' })
  async listCoupons(@Query() query: ListCouponsQueryDTO) {
    return this.couponService.listCoupons(query)
  }

  @Get('pending-approvals')
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
  async updateCoupon(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateCouponDTO, @Request() req: any) {
    return this.couponService.updateCoupon(id, updateDto, req.user.id)
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Delete a coupon' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Coupon deleted successfully' })
  async deleteCoupon(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.couponService.deleteCoupon(id, req.user.id)
  }

  @Post(':id/submit-approval')
  @UseGuards(RolesGuard)
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Submit coupon for approval' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Coupon submitted for approval' })
  async submitForApproval(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.couponService.submitForApproval(id, req.user.id)
  }

  @Post(':id/approval-action')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Approve or reject a coupon' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Approval action completed' })
  async approveOrRejectCoupon(
    @Param('id', ParseIntPipe) id: number,
    @Body() approvalDto: ApprovalActionDTO,
    @Request() req: any,
  ) {
    return this.couponService.approveOrRejectCoupon(id, approvalDto, req.user.id)
  }

  @Post(':id/toggle-status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Toggle coupon active/inactive status' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Coupon status toggled' })
  async toggleCouponStatus(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.couponService.toggleCouponStatus(id, req.user.id)
  }

  // ===== Customer Operations =====

  @Post('validate')
  @ApiOperation({ summary: 'Validate a coupon for checkout' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Coupon validation result' })
  async validateCoupon(@Body() validationDto: ValidateCouponDTO, @Request() req: any) {
    return this.couponService.validateCoupon(validationDto, req.user.id)
  }

  @Post('redeem-gift')
  @ApiOperation({ summary: 'Redeem a gift coupon' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Gift coupon redeemed successfully' })
  async redeemGiftCoupon(@Body() redeemDto: RedeemGiftCouponDTO, @Request() req: any) {
    return this.couponService.redeemGiftCoupon(redeemDto, req.user.id)
  }

  @Post('select-class')
  @ApiOperation({ summary: 'Select class for gift coupon live course' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Class selection completed' })
  async selectClassForGift(@Body() selectDto: SelectClassForGiftDTO, @Request() req: any) {
    return this.couponService.selectClassForGift(selectDto, req.user.id)
  }

  @Get('my/redemptions')
  @ApiOperation({ summary: 'Get user redemption history' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User redemptions retrieved successfully' })
  async getUserRedemptions(
    @Request() req: any,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
  ) {
    return this.couponService.getUserRedemptions(req.user.id, { page, limit })
  }
}
