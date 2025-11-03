// Enhanced Cart Service with Coupon Integration

import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common'
import { CartRepository } from './cart.repo'
import { CourseRepository } from '../course/course.repo'
import { CouponService } from '../coupon/coupon.service'
import { Cart, CartSummary } from './cart.model'
import { AddToCartDTO, CartResponseDTO } from './cart.dto'
import { OnlineClassRepository } from '../online-class/online-class.repo'
import { DiscountType } from '../coupon/coupon.model'

export interface EnhancedCartSummary extends CartSummary {
  appliedCoupon?: {
    code: string
    title: string
    discountAmount: number
    finalAmount: number
  }
}

export interface CartWithCouponDTO {
  couponCode?: string
}

@Injectable()
export class CartService {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly courseRepository: CourseRepository,
    private readonly classRepository: OnlineClassRepository,
    private readonly couponService: CouponService,
  ) {}

  async initCart(userId: number): Promise<Cart> {
    // Check if cart already exists for this user
    const existingCart = await this.cartRepository.findByUserId(userId)
    if (existingCart) {
      return existingCart
    }

    // Create new empty cart for the user
    return await this.cartRepository.create(userId)
  }

  async getCart(userId: number): Promise<CartResponseDTO | null> {
    const cart = await this.cartRepository.findByUserId(userId)
    if (!cart) return null

    const summary = await this.cartRepository.getCartSummary(userId)

    return {
      id: cart.id,
      userId: cart.userId,
      items: cart.items.map((item) => ({
        id: item.id,
        courseId: item.courseId,
        course: {
          id: item.course!.id,
          slug: item.course!.slug,
          title: item.course!.title,
          subtitle: item.course?.subtitle,
          level: item.course!.level,
          thumbnailUrl: item.course?.thumbnailUrl,
          price: item.course!.price,
          status: item.course!.status,
        },
        classId: (item as any).classId || null,
      })),
      totalItems: summary?.totalItems || 0,
      totalAmount: summary?.totalAmount || 0,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    }
  }

  async getCartWithCoupon(userId: number, couponCode?: string): Promise<EnhancedCartSummary | null> {
    const cart = await this.cartRepository.findByUserId(userId)
    if (!cart) return null

    const baseSummary = await this.cartRepository.getCartSummary(userId)
    if (!baseSummary) return null

    const enhancedSummary: EnhancedCartSummary = {
      totalItems: baseSummary.totalItems,
      totalAmount: baseSummary.totalAmount,
      items: cart.items,
    }

    if (!couponCode) {
      return enhancedSummary
    }

    // Validate and apply coupon
    try {
      const courseIds = cart.items.map((item) => item.courseId)
      const validation = await this.couponService.validateCoupon(
        {
          code: couponCode,
          courseIds,
          totalAmount: baseSummary.totalAmount,
        },
        userId,
      )

      if (validation.isValid && validation.discount) {
        const discountAmount = validation.discount.appliedAmount
        const finalAmount = Math.max(0, baseSummary.totalAmount - discountAmount)

        return {
          ...enhancedSummary,
          appliedCoupon: {
            code: couponCode,
            title: `${validation.discount.type === DiscountType.PERCENTAGE ? validation.discount.value + '%' : '$' + (validation.discount.value / 100).toFixed(2)} off`,
            discountAmount,
            finalAmount,
          },
        }
      }
    } catch (error) {
      // If coupon validation fails, return cart without coupon
      console.log('Coupon validation failed:', error.message)
    }

    return enhancedSummary
  }

  async addToCart(userId: number, addToCartDto: AddToCartDTO): Promise<CartResponseDTO> {
    const { courseId } = addToCartDto

    // Check if course exists and is published
    const course = await this.courseRepository.findOne({ id: courseId })
    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`)
    }

    if (course.status !== 'PUBLISHED') {
      throw new BadRequestException('Cannot add unpublished course to cart')
    }

    // Check if course price is greater than 0 (no free courses in cart)
    if (course.price === 0) {
      throw new BadRequestException('Free courses cannot be added to cart')
    }

    if (!addToCartDto.classId) {
      // Add item to cart (no quantity)
      const updatedCart = await this.cartRepository.addItem(userId, courseId, 1)
    } else {
      // Check if class exists for the course
      const classForCourse = await this.classRepository.findByCourseIdAndClassId(courseId, addToCartDto.classId)
      if (!classForCourse) {
        throw new NotFoundException(`Class with ID ${addToCartDto.classId} not found for Course ID ${courseId}`)
      }
      // Add item to cart (no quantity)
      const updatedCart = await this.cartRepository.addItemWithClassId(userId, courseId, 1, addToCartDto.classId)
    }

    return (await this.getCart(userId)) as CartResponseDTO
  }

  async removeFromCart(userId: number, courseId: number): Promise<CartResponseDTO | null> {
    // Check if course exists in cart
    const courseInCart = await this.cartRepository.checkCourseInCart(userId, courseId)
    if (!courseInCart) {
      throw new NotFoundException(`Course with ID ${courseId} not found in cart`)
    }

    await this.cartRepository.removeItem(userId, courseId)

    return await this.getCart(userId)
  }

  async clearCart(userId: number): Promise<void> {
    await this.cartRepository.clearCart(userId)
  }

  async getCartSummary(userId: number): Promise<CartSummary | null> {
    const cart = await this.cartRepository.findByUserId(userId)
    if (!cart) return null

    const summary = await this.cartRepository.getCartSummary(userId)

    return {
      totalItems: summary?.totalItems || 0,
      totalAmount: summary?.totalAmount || 0,
      items: cart.items,
    }
  }

  async validateCartForCheckout(
    userId: number,
    couponCode?: string,
  ): Promise<{
    isValid: boolean
    errors: string[]
    couponValidation?: any
  }> {
    const cart = await this.cartRepository.findByUserId(userId)
    const errors: string[] = []

    if (!cart || cart.items.length === 0) {
      errors.push('Cart is empty')
      return { isValid: false, errors }
    }

    // Check if all courses are still available and published
    for (const item of cart.items) {
      const course = await this.courseRepository.findOne({ id: item.courseId })

      if (!course) {
        errors.push(`Course "${item.course?.title}" is no longer available`)
        continue
      }

      if (course.status !== 'PUBLISHED') {
        errors.push(`Course "${course.title}" is no longer published`)
      }

      if (course.price === 0) {
        errors.push(`Course "${course.title}" is now free and should be removed from cart`)
      }
    }

    let couponValidation
    if (couponCode && errors.length === 0) {
      try {
        const courseIds = cart.items.map((item) => item.courseId)
        const summary = await this.getCartSummary(userId)

        couponValidation = await this.couponService.validateCoupon(
          {
            code: couponCode,
            courseIds,
            totalAmount: summary?.totalAmount || 0,
          },
          userId,
        )

        if (!couponValidation.isValid) {
          errors.push(...couponValidation.errors)
        }
      } catch (error) {
        errors.push(`Coupon validation failed: ${error.message}`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      couponValidation,
    }
  }

  // New method to calculate final checkout amount with coupon
  async calculateCheckoutAmount(
    userId: number,
    couponCode?: string,
  ): Promise<{
    subtotal: number
    discountAmount: number
    finalAmount: number
    couponDetails?: any
  }> {
    const summary = await this.getCartSummary(userId)
    if (!summary) {
      throw new BadRequestException('Cart is empty')
    }

    const subtotal = summary.totalAmount
    let discountAmount = 0
    let couponDetails

    if (couponCode) {
      const courseIds = summary.items.map((item) => item.courseId)

      try {
        const validation = await this.couponService.validateCoupon(
          {
            code: couponCode,
            courseIds,
            totalAmount: subtotal,
          },
          userId,
        )

        if (validation.isValid && validation.discount) {
          discountAmount = validation.discount.appliedAmount
          couponDetails = validation.discount
        }
      } catch (error) {
        throw new BadRequestException(`Invalid coupon: ${error.message}`)
      }
    }

    const finalAmount = Math.max(0, subtotal - discountAmount)

    return {
      subtotal,
      discountAmount,
      finalAmount,
      couponDetails,
    }
  }
}
