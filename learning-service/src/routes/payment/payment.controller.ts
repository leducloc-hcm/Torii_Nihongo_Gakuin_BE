import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'
import { AuthType } from 'src/shared/constants/auth.constant'
import { RoleName } from 'src/shared/constants/role.constant'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'
import { Auth, IsPublic } from 'src/shared/decorators/auth.decorator'
import { Roles } from 'src/shared/decorators/roles.decorator'
import { RolesGuard } from 'src/shared/guards/roles.guard'
import { SepayPaymentResponseDTO, SepayWebhookDTO, BuyCourseDirectDTO, CreatePaymentDTO } from './payment.dto'
import { PaymentService } from './payment.service'

@Controller('payments')
@UseGuards(RolesGuard)
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly configService: ConfigService,
  ) {}
  @Get('orders/:orderId')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer, RoleName.Admin, RoleName.Staff)
  @HttpCode(HttpStatus.OK)
  async getOrderStatus(@ActiveUser('userId') userId: number, @Param('orderId', ParseIntPipe) orderId: number) {
    return this.paymentService.getOrderStatus(orderId, userId)
  }

  @Get()
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer, RoleName.Admin, RoleName.Staff)
  @HttpCode(HttpStatus.OK)
  async getUserOrders(
    @ActiveUser('userId') userId: number,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.paymentService.getUserOrders(userId, { page: page || 1, limit: limit || 10 })
  }

  @Get('admin')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin, RoleName.Staff)
  @HttpCode(HttpStatus.OK)
  getAllOrders(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('status') status?: string,
    @Query('userId', new ParseIntPipe({ optional: true })) userId?: number,
  ) {
    return this.paymentService.getAllOrders({ page: page || 1, limit: limit || 10, status, userId })
  }

  @Post('sepay/create')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer, RoleName.Admin, RoleName.Staff)
  @HttpCode(HttpStatus.CREATED)
  async createSepayPayment(
    @ActiveUser('userId') userId: number,
    @Body() createPaymentDto: CreatePaymentDTO,
  ): Promise<SepayPaymentResponseDTO> {
    return this.paymentService.createSepayPaymentWithCoupon(userId, createPaymentDto.couponCode)
  }

  /**
   * Buy course directly (skip cart)
   * POST /payments/sepay/buy-direct
   * Body: { courseId: 123, couponCode?: 'SALE20' }
   */
  @Post('sepay/buy-direct')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer, RoleName.Admin, RoleName.Staff)
  @HttpCode(HttpStatus.CREATED)
  async buyCourseDirectWithSepay(
    @ActiveUser('userId') userId: number,
    @Body() buyDto: BuyCourseDirectDTO,
  ): Promise<SepayPaymentResponseDTO> {
    return await this.paymentService.buyCourseDirectWithCoupon(userId, buyDto.courseId, buyDto.couponCode)
  }

  @Post('sepay/webhook')
  @IsPublic()
  @HttpCode(HttpStatus.OK)
  async sepayWebhook(@Body() webhookData: SepayWebhookDTO) {
    // Backward compatibility: forward to assessment-service which now owns the webhook endpoint
    const assessmentBaseUrl =
      this.configService.get<string>('ASSESSMENT_SERVICE_URL') ||
      this.configService.get<string>('ASSESSMENT_BASE_URL') ||
      'http://localhost:4002'

    try {
      const res = await axios.post(`${assessmentBaseUrl}/payments/sepay/webhook`, webhookData, {
        timeout: 5000,
        headers: { 'Content-Type': 'application/json' },
      })
      return res.data
    } catch (err: any) {
      // If assessment-service is down, fall back to local processing to avoid losing provider callbacks
      return this.paymentService.handleSepayWebhook(webhookData)
    }
  }

  @Get('sepay/status/:paymentCode')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer, RoleName.Admin, RoleName.Staff)
  @HttpCode(HttpStatus.OK)
  async checkSepayStatus(@Param('paymentCode') paymentCode: string) {
    return this.paymentService.checkSepayPaymentStatus(paymentCode)
  }

  @Get('sepay/order/:paymentCode')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer, RoleName.Admin, RoleName.Staff)
  @HttpCode(HttpStatus.OK)
  async getOrderByPaymentCode(@ActiveUser('userId') userId: number, @Param('paymentCode') paymentCode: string) {
    const order = await this.paymentService.getOrderByPaymentCode(paymentCode)

    if (!order) {
      return { success: false, message: 'Order not found' }
    }

    if (order.userId !== userId) {
      return { success: false, message: 'Unauthorized' }
    }

    return { success: true, order }
  }

  // ===== Payment Management Endpoints =====

  @Get('orders/:orderId/payments')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer, RoleName.Admin, RoleName.Staff)
  @HttpCode(HttpStatus.OK)
  async getOrderPayments(@ActiveUser('userId') userId: number, @Param('orderId', ParseIntPipe) orderId: number) {
    return this.paymentService.getOrderPayments(orderId, userId)
  }

  @Get('orders/:orderId/payments/summary')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer, RoleName.Admin, RoleName.Staff)
  @HttpCode(HttpStatus.OK)
  async getOrderPaymentSummary(@ActiveUser('userId') userId: number, @Param('orderId', ParseIntPipe) orderId: number) {
    return this.paymentService.getOrderPaymentSummary(orderId, userId)
  }

  @Get('payments/:paymentId')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer, RoleName.Admin, RoleName.Staff)
  @HttpCode(HttpStatus.OK)
  async getPaymentById(@ActiveUser('userId') userId: number, @Param('paymentId', ParseIntPipe) paymentId: number) {
    return this.paymentService.getPaymentById(paymentId, userId)
  }

  // Admin payment management
  @Get('admin/payments')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin, RoleName.Staff)
  @HttpCode(HttpStatus.OK)
  async getAllPayments(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('status') status?: string,
    @Query('method') method?: string,
    @Query('orderId', new ParseIntPipe({ optional: true })) orderId?: number,
    @Query('userId', new ParseIntPipe({ optional: true })) userId?: number,
  ) {
    return this.paymentService.getAllPayments({
      page: page || 1,
      limit: limit || 10,
      status,
      method,
      orderId,
      userId,
    })
  }

  @Post('admin/payments/:paymentId/refund')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin, RoleName.Staff)
  @HttpCode(HttpStatus.CREATED)
  async createRefund(
    @Param('paymentId', ParseIntPipe) paymentId: number,
    @Body() refundData: { amount: number; reason?: string },
  ) {
    return this.paymentService.createRefund(paymentId, refundData.amount, refundData.reason)
  }

  // ===== Payment Retry Endpoints =====

  @Post('orders/:orderId/retry')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer, RoleName.Admin, RoleName.Staff)
  @HttpCode(HttpStatus.CREATED)
  async retryFailedPayment(@ActiveUser('userId') userId: number, @Param('orderId', ParseIntPipe) orderId: number) {
    return this.paymentService.retryFailedPayment(orderId, userId)
  }

  @Get('failed')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer, RoleName.Admin, RoleName.Staff)
  @HttpCode(HttpStatus.OK)
  async getFailedPayments(
    @ActiveUser('userId') userId: number,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.paymentService.getFailedPayments(userId, { page: page || 1, limit: limit || 10 })
  }
}
