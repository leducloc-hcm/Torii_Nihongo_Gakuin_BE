import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common'
import { CartRepository } from './cart.repo'
import { CourseRepository } from '../course/course.repo'
import { Cart, CartSummary } from './cart.model'
import { AddToCartDTO, UpdateCartItemDTO, CartResponseDTO } from './cart.dto'

@Injectable()
export class CartService {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly courseRepository: CourseRepository,
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
      })),
      totalItems: summary?.totalItems || 0,
      totalAmount: summary?.totalAmount || 0,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    }
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

    // Add item to cart (no quantity)
    const updatedCart = await this.cartRepository.addItem(userId, courseId, 1)

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

  async validateCartForCheckout(userId: number): Promise<{ isValid: boolean; errors: string[] }> {
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

    return {
      isValid: errors.length === 0,
      errors,
    }
  }
}
