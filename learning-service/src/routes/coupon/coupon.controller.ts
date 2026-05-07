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
  Inject,
  forwardRef,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { CouponService } from "./coupon.service";
import { PaymentService } from "../payment/payment.service";
import {
  CreateCouponDTO,
  UpdateCouponDTO,
  ValidateCouponDTO,
  RedeemGiftCouponDTO,
  SelectClassForGiftDTO,
  ApprovalActionDTO,
  ListCouponsQueryDTO,
  PurchaseGiftCouponDTO,
} from "./coupon.dto";
import { AccessTokenGuard } from "src/shared/guards/access-token.guard";
import { RolesGuard } from "src/shared/guards/roles.guard";
import { Roles } from "src/shared/decorators/roles.decorator";
import { ActiveUser } from "src/shared/decorators/active-user.decorator";
import { Role } from "@prisma/client";

@ApiTags("Coupons")
@Controller("coupons")
@UseGuards(AccessTokenGuard)
@ApiBearerAuth()
export class CouponController {
  constructor(
    private readonly couponService: CouponService,
    @Inject(forwardRef(() => PaymentService))
    private readonly paymentService: PaymentService,
  ) {}

  // ===== Staff/Admin Operations =====

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: "Create a new coupon" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Coupon created successfully",
  })
  async createCoupon(
    @Body() createDto: CreateCouponDTO,
    @ActiveUser("userId") userId: number,
  ) {
    return this.couponService.createCoupon(createDto, userId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: "List coupons with filtering" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Coupons retrieved successfully",
  })
  async listCoupons(@Query() query: ListCouponsQueryDTO) {
    return this.couponService.listCoupons(query);
  }

  @Get("pending-approval")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Get coupons pending approval" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Pending approvals retrieved successfully",
  })
  async getPendingApprovals() {
    return this.couponService.getPendingApprovals();
  }

  @Get("admin/usage-logs")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: "Get coupon usage logs" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Coupon usage logs retrieved successfully",
  })
  async getCouponUsageLogs(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("couponId") couponId?: string,
    @Query("userId") userId?: string,
  ) {
    return this.couponService.getCouponUsageLogs({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      couponId: couponId ? parseInt(couponId) : undefined,
      userId: userId ? parseInt(userId) : undefined,
    });
  }

  @Get("available-for-cart")
  @ApiOperation({ summary: "Get available coupons for cart" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Available coupons retrieved successfully",
  })
  async getAvailableCouponsForCart(
    @ActiveUser("userId") userId: number,
    @Query("courseIds") courseIdsStr: string,
    @Query("totalAmount", ParseIntPipe) totalAmount: number,
  ) {
    const courseIds = courseIdsStr
      ? courseIdsStr.split(",").map(Number).filter(Boolean)
      : [];
    return this.couponService.getAvailableCouponsForCart(
      userId,
      courseIds,
      totalAmount,
    );
  }

  @Get(":id")
  @UseGuards(RolesGuard)
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: "Get coupon by ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Coupon retrieved successfully",
  })
  async getCoupon(@Param("id", ParseIntPipe) id: number) {
    return this.couponService.getCoupon(id);
  }

  @Put(":id")
  @UseGuards(RolesGuard)
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: "Update a coupon" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Coupon updated successfully",
  })
  async updateCoupon(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateDto: UpdateCouponDTO,
    @ActiveUser("userId") userId: number,
  ) {
    return this.couponService.updateCoupon(id, updateDto, userId);
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: "Delete a coupon" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Coupon deleted successfully",
  })
  async deleteCoupon(
    @Param("id", ParseIntPipe) id: number,
    @ActiveUser("userId") userId: number,
  ) {
    return this.couponService.deleteCoupon(id, userId);
  }

  @Post(":id/submit-approval")
  @UseGuards(RolesGuard)
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: "Submit coupon for approval" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Coupon submitted for approval",
  })
  async submitForApproval(
    @Param("id", ParseIntPipe) id: number,
    @ActiveUser("userId") userId: number,
  ) {
    return this.couponService.submitForApproval(id, userId);
  }

  @Post(":id/approval-action")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Approve or reject a coupon" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Approval action completed",
  })
  async approveOrRejectCoupon(
    @Param("id", ParseIntPipe) id: number,
    @Body() approvalDto: ApprovalActionDTO,
    @ActiveUser("userId") userId: number,
  ) {
    return this.couponService.approveOrRejectCoupon(id, approvalDto, userId);
  }

  @Post(":id/toggle-status")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Toggle coupon active/inactive status" })
  @ApiResponse({ status: HttpStatus.OK, description: "Coupon status toggled" })
  async toggleCouponStatus(
    @Param("id", ParseIntPipe) id: number,
    @ActiveUser("userId") userId: number,
  ) {
    return this.couponService.toggleCouponStatus(id, userId);
  }

  // ===== Customer Operations =====

  @Post("validate")
  @ApiOperation({ summary: "Validate a coupon for checkout" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Coupon validation result",
  })
  async validateCoupon(
    @Body() validationDto: ValidateCouponDTO,
    @ActiveUser("userId") userId: number,
  ) {
    return this.couponService.validateCoupon(validationDto, userId);
  }

  @Post("redeem-gift")
  @ApiOperation({ summary: "Redeem a gift coupon" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Gift coupon redeemed successfully",
  })
  async redeemGiftCoupon(
    @Body() redeemDto: RedeemGiftCouponDTO,
    @ActiveUser("userId") userId: number,
  ) {
    return this.couponService.redeemGiftCoupon(redeemDto, userId);
  }

  @Post("select-class")
  @ApiOperation({ summary: "Select class for gift coupon live course" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Class selection completed",
  })
  async selectClassForGift(
    @Body() selectDto: SelectClassForGiftDTO,
    @ActiveUser("userId") userId: number,
  ) {
    return this.couponService.selectClassForGift(selectDto, userId);
  }

  @Get("my/redemptions")
  @ApiOperation({ summary: "Get user redemption history" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "User redemptions retrieved successfully",
  })
  async getUserRedemptions(
    @ActiveUser("userId") userId: number,
    @Query("page", ParseIntPipe) page: number = 1,
    @Query("limit", ParseIntPipe) limit: number = 10,
  ) {
    return this.couponService.getUserRedemptions(userId, { page, limit });
  }

  // ===== Gift Purchase Operations =====

  @Post("purchase-gift")
  @ApiOperation({ summary: "Purchase a gift coupon" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Gift coupon purchase created, payment required",
  })
  async purchaseGiftCoupon(
    @Body() purchaseDto: PurchaseGiftCouponDTO,
    @ActiveUser("userId") userId: number,
  ) {
    // Create the gift coupon in DRAFT status
    const giftCouponResponse =
      await this.couponService.createPurchasedGiftCoupon(userId, purchaseDto);

    // If payment is required, create the payment order
    if (
      giftCouponResponse.paymentRequired &&
      giftCouponResponse.paymentDetails
    ) {
      const paymentResponse = await this.paymentService.createGiftCouponPayment(
        userId,
        giftCouponResponse.paymentDetails.couponId,
        giftCouponResponse.paymentDetails.totalAmount,
        (giftCouponResponse.paymentDetails.courses || [])
          .filter(
            (c): c is { id: number; title: string; price: number } =>
              c.id !== undefined &&
              c.title !== undefined &&
              c.price !== undefined,
          )
          .map((c) => ({
            id: c.id!,
            title: c.title!,
            price: c.price!,
          })),
      );

      return {
        ...giftCouponResponse,
        paymentInfo: {
          qrUrl: paymentResponse.qrUrl,
          orderId: paymentResponse.orderId,
          amount: paymentResponse.amount,
          message:
            "Gift coupon created successfully. Please complete payment to activate.",
        },
      };
    }

    return giftCouponResponse;
  }

  @Get("my/purchased-gifts")
  @ApiOperation({ summary: "Get user purchased gift coupons" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Purchased gift coupons retrieved successfully",
  })
  async getUserPurchasedGifts(
    @ActiveUser("userId") userId: number,
    @Query("page", ParseIntPipe) page: number = 1,
    @Query("limit", ParseIntPipe) limit: number = 10,
  ) {
    return this.couponService.getUserPurchasedGifts(userId, { page, limit });
  }
}
