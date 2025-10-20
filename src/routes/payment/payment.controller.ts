import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseIntPipe,
  Req,
  Res,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { PaymentService } from './payment.service'
import { CreatePaymentDTO, PaymentResponseDTO, PaymentCallbackResponseDTO, VNPayCallbackDTO } from './payment.dto'
import { Auth, IsPublic } from 'src/shared/decorators/auth.decorator'
import { AuthType } from 'src/shared/constants/auth.constant'
import { Roles } from 'src/shared/decorators/roles.decorator'
import { RolesGuard } from 'src/shared/guards/roles.guard'
import { RoleName } from 'src/shared/constants/role.constant'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'

@Controller('payment')
@UseGuards(RolesGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer, RoleName.Admin, RoleName.Staff)
  @HttpCode(HttpStatus.CREATED)
  async createPayment(
    @ActiveUser('userId') userId: number,
    @Body() createPaymentDto: CreatePaymentDTO,
    @Req() req: Request,
  ): Promise<PaymentResponseDTO> {
    const ipAddr =
      (req.headers['x-forwarded-for'] as string) || (req.connection.remoteAddress as string) || req.ip || '127.0.0.1'

    return this.paymentService.createPayment(userId, createPaymentDto, ipAddr)
  }

  @Get('vnpay/callback')
  @IsPublic()
  @HttpCode(HttpStatus.OK)
  async vnpayCallback(@Query() callbackData: VNPayCallbackDTO, @Res() res: Response): Promise<void> {
    const result = await this.paymentService.handleVNPayCallback(callbackData)

    // Redirect to frontend with result
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000'

    if (result.success) {
      res.redirect(`${baseUrl}/payment/success?orderId=${result.orderId}&transactionId=${result.transactionId}`)
    } else {
      res.redirect(`${baseUrl}/payment/failed?message=${encodeURIComponent(result.message)}`)
    }
  }

  @Post('vnpay/callback')
  @IsPublic()
  @HttpCode(HttpStatus.OK)
  async vnpayCallbackPost(@Body() callbackData: VNPayCallbackDTO): Promise<PaymentCallbackResponseDTO> {
    return this.paymentService.handleVNPayCallback(callbackData)
  }

  @Get('orders/:orderId')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer, RoleName.Admin, RoleName.Staff)
  @HttpCode(HttpStatus.OK)
  async getOrderStatus(@ActiveUser('userId') userId: number, @Param('orderId', ParseIntPipe) orderId: number) {
    return this.paymentService.getOrderStatus(orderId, userId)
  }

  @Get('orders')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer, RoleName.Admin, RoleName.Staff)
  @HttpCode(HttpStatus.OK)
  async getUserOrders(
    @ActiveUser('userId') userId: number,
    @Query('skip', ParseIntPipe) skip?: number,
    @Query('take', ParseIntPipe) take?: number,
  ) {
    return this.paymentService.getUserOrders(userId, { skip, take })
  }

  // Admin endpoints for order management
  @Get('admin/orders')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin, RoleName.Staff)
  @HttpCode(HttpStatus.OK)
  getAllOrders(
    @Query('skip', ParseIntPipe) skip?: number,
    @Query('take', ParseIntPipe) take?: number,
    @Query('status') status?: string,
    @Query('userId', ParseIntPipe) userId?: number,
  ) {
    // This would be implemented in the payment service
    // return this.paymentService.getAllOrders({ skip, take, status, userId })
    return { message: 'Admin orders endpoint - to be implemented' }
  }
}
