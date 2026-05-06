import { Module, forwardRef } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PaymentController } from './payment.controller'
import { PaymentService } from './payment.service'
import { SepayService } from './sepay.service'
import { PaymentTransactionService } from './payment-transaction.service'
import { CartModule } from '../cart/cart.module'
import { CouponModule } from '../coupon/coupon.module'
import { OnlineClassModule } from '../online-class/online-class.module'
import { SharedModule } from 'src/shared/shared.module'
import { WebsocketsModule } from 'src/websockets/websockets.module'

@Module({
  imports: [
    SharedModule,
    forwardRef(() => CartModule),
    forwardRef(() => CouponModule),
    ConfigModule,
    WebsocketsModule,
    OnlineClassModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentTransactionService, PaymentService, SepayService],
  exports: [PaymentTransactionService, PaymentService, SepayService],
})
export class PaymentModule {}
