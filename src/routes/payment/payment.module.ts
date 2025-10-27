import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PaymentController } from './payment.controller'
import { PaymentService } from './payment.service'
import { SepayService } from './sepay.service'
import { CartModule } from '../cart/cart.module'
import { SharedModule } from 'src/shared/shared.module'
import { WebsocketsModule } from 'src/websockets/websockets.module'

@Module({
  imports: [SharedModule, CartModule, ConfigModule, WebsocketsModule],
  controllers: [PaymentController],
  providers: [PaymentService, SepayService],
  exports: [PaymentService, SepayService],
})
export class PaymentModule {}
