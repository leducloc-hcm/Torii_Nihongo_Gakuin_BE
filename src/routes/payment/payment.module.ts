import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PaymentController } from './payment.controller'
import { PaymentService } from './payment.service'
import { VNPayService } from './vnpay.service'
import { CartModule } from '../cart/cart.module'
import { SharedModule } from 'src/shared/shared.module'

@Module({
  imports: [SharedModule, CartModule, ConfigModule],
  controllers: [PaymentController],
  providers: [PaymentService, VNPayService],
  exports: [PaymentService, VNPayService],
})
export class PaymentModule {}
