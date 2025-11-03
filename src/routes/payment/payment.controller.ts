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
import { AuthType } from 'src/shared/constants/auth.constant'
import { RoleName } from 'src/shared/constants/role.constant'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'
import { Auth, IsPublic } from 'src/shared/decorators/auth.decorator'
import { Roles } from 'src/shared/decorators/roles.decorator'
import { RolesGuard } from 'src/shared/guards/roles.guard'
import { SepayPaymentResponseDTO, SepayWebhookDTO, BuyCourseDirectDTO } from './payment.dto'
import { PaymentService } from './payment.service'

@Controller('payments')
@UseGuards(RolesGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}
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
  async createSepayPayment(@ActiveUser('userId') userId: number): Promise<SepayPaymentResponseDTO> {
    return this.paymentService.createSepayPayment(userId)
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
    return this.paymentService.buyCourseDirectWithSepay(userId, buyDto.courseId, buyDto.couponCode)
  }

  @Post('sepay/webhook')
  @IsPublic()
  @HttpCode(HttpStatus.OK)
  async sepayWebhook(@Body() webhookData: SepayWebhookDTO) {
    return this.paymentService.handleSepayWebhook(webhookData)
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
}
