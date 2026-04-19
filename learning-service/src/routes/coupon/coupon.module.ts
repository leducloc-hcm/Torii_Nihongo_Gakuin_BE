// Coupon Module

import { Module, forwardRef } from "@nestjs/common";
import { CouponController } from "./coupon.controller";
import { CouponService } from "./coupon.service";
import { CouponRepository } from "./coupon.repo";
import { CourseModule } from "../course/course.module";
import { EnrollmentModule } from "../enrollment/enrollment.module";
import { PaymentModule } from "../payment/payment.module";
import { NotificationModule } from "../notification/notification.module";

@Module({
  imports: [
    CourseModule,
    EnrollmentModule,
    forwardRef(() => PaymentModule),
    NotificationModule,
  ],
  controllers: [CouponController],
  providers: [CouponService, CouponRepository],
  exports: [CouponService, CouponRepository],
})
export class CouponModule {}
