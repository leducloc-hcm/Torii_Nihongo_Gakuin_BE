// Coupon Module

import { Module } from '@nestjs/common'
import { CouponController } from './coupon.controller'
import { CouponService } from './coupon.service'
import { CouponRepository } from './coupon.repo'
import { CourseModule } from '../course/course.module'
import { EnrollmentModule } from '../enrollment/enrollment.module'

@Module({
  imports: [CourseModule, EnrollmentModule],
  controllers: [CouponController],
  providers: [CouponService, CouponRepository],
  exports: [CouponService, CouponRepository],
})
export class CouponModule {}
