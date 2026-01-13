import { Module, forwardRef } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { PaymentTimeoutWorker } from './payment-timeout.worker'
import { CouponLifecycleWorker } from './coupon-expiry.worker'
// import { AssignmentExpiryWorker } from './assignment-expiry.worker' // Assessment-related, moved to assessment-service
import { CouponAdminController } from './coupon-admin.controller'
import { SharedModule } from '../shared.module'
import { PaymentModule } from '../../routes/payment/payment.module'
import { CouponModule } from '../../routes/coupon/coupon.module'
// import { AssessmentAssignmentModule } from '../../routes/assessment-assignment/assessment-assignment.module' // Assessment-related, moved to assessment-service
import { WebsocketsModule } from '../../websockets/websockets.module'

@Module({
  imports: [
    ScheduleModule.forRoot(),
    SharedModule,
    PaymentModule,
    forwardRef(() => CouponModule),
    // forwardRef(() => AssessmentAssignmentModule), // Assessment-related, moved to assessment-service
    WebsocketsModule,
  ],
  controllers: [CouponAdminController],
  providers: [PaymentTimeoutWorker, CouponLifecycleWorker], // AssignmentExpiryWorker moved to assessment-service
  exports: [PaymentTimeoutWorker, CouponLifecycleWorker], // AssignmentExpiryWorker moved to assessment-service
})
export class WorkersModule {}
