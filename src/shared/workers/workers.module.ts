import { Module, forwardRef } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { PaymentTimeoutWorker } from './payment-timeout.worker'
import { CouponLifecycleWorker } from './coupon-expiry.worker'
import { CouponAdminController } from './coupon-admin.controller'
import { SharedModule } from '../shared.module'
import { PaymentModule } from '../../routes/payment/payment.module'
import { CouponModule } from '../../routes/coupon/coupon.module'
import { WebsocketsModule } from '../../websockets/websockets.module'

@Module({
  imports: [ScheduleModule.forRoot(), SharedModule, PaymentModule, forwardRef(() => CouponModule), WebsocketsModule],
  controllers: [CouponAdminController],
  providers: [PaymentTimeoutWorker, CouponLifecycleWorker],
  exports: [PaymentTimeoutWorker, CouponLifecycleWorker],
})
export class WorkersModule {}
