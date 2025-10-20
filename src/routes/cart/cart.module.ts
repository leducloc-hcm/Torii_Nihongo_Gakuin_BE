import { Module } from '@nestjs/common'
import { CartController } from './cart.controller'
import { CartService } from './cart.service'
import { CartRepository } from './cart.repo'
import { CourseModule } from '../course/course.module'
import { SharedModule } from 'src/shared/shared.module'

@Module({
  imports: [SharedModule, CourseModule],
  controllers: [CartController],
  providers: [CartService, CartRepository],
  exports: [CartService, CartRepository],
})
export class CartModule {}
