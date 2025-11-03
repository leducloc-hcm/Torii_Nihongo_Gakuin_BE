import { Module } from '@nestjs/common'
import { CartController } from './cart.controller'
import { CartService } from './cart.service'
import { CartRepository } from './cart.repo'
import { CourseModule } from '../course/course.module'
import { CouponModule } from '../coupon/coupon.module'
import { SharedModule } from 'src/shared/shared.module'
import { OnlineClassRepository } from '../online-class/online-class.repo'

@Module({
  imports: [SharedModule, CourseModule, CouponModule],
  controllers: [CartController],
  providers: [CartService, CartRepository, OnlineClassRepository],
  exports: [CartService, CartRepository, OnlineClassRepository],
})
export class CartModule {}
