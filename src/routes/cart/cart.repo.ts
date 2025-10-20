import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import { Cart, CartItem } from './cart.model'

@Injectable()
export class CartRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly includeRelations = {
    items: {
      include: {
        course: {
          select: {
            id: true,
            slug: true,
            title: true,
            subtitle: true,
            level: true,
            thumbnailUrl: true,
            price: true,
            status: true,
          },
        },
      },
    },
  }

  async findByUserId(userId: number): Promise<Cart | null> {
    return (await this.prisma.cart.findUnique({
      where: { userId },
      include: this.includeRelations,
    })) as Cart | null
  }

  async create(userId: number): Promise<Cart> {
    return (await this.prisma.cart.create({
      data: { userId },
      include: this.includeRelations,
    })) as Cart
  }

  async findOrCreate(userId: number): Promise<Cart> {
    let cart = await this.findByUserId(userId)
    if (!cart) {
      cart = await this.create(userId)
    }
    return cart
  }

  async addItem(userId: number, courseId: number, quantity: number = 1): Promise<Cart> {
    const cart = await this.findOrCreate(userId)

    // Check if course is already in cart
    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_courseId: {
          cartId: cart.id,
          courseId,
        },
      },
    })

    if (existingItem) {
      // Update quantity if item exists
      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
      })
    } else {
      // Create new cart item
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          courseId,
          quantity,
        },
      })
    }

    // Return updated cart
    return (await this.findByUserId(userId)) as Cart
  }

  async updateItemQuantity(userId: number, courseId: number, quantity: number): Promise<Cart | null> {
    const cart = await this.findByUserId(userId)
    if (!cart) return null

    await this.prisma.cartItem.updateMany({
      where: {
        cartId: cart.id,
        courseId,
      },
      data: { quantity },
    })

    return await this.findByUserId(userId)
  }

  async removeItem(userId: number, courseId: number): Promise<Cart | null> {
    const cart = await this.findByUserId(userId)
    if (!cart) return null

    await this.prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        courseId,
      },
    })

    return await this.findByUserId(userId)
  }

  async clearCart(userId: number): Promise<void> {
    const cart = await this.findByUserId(userId)
    if (!cart) return

    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    })
  }

  async getCartSummary(userId: number): Promise<{ totalItems: number; totalAmount: number } | null> {
    const cart = await this.findByUserId(userId)
    if (!cart) return null

    const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0)
    const totalAmount = cart.items.reduce((sum, item) => {
      const coursePrice = item.course?.price || 0
      return sum + coursePrice * item.quantity
    }, 0)

    return { totalItems, totalAmount }
  }

  async checkCourseInCart(userId: number, courseId: number): Promise<boolean> {
    const cart = await this.findByUserId(userId)
    if (!cart) return false

    const item = await this.prisma.cartItem.findUnique({
      where: {
        cartId_courseId: {
          cartId: cart.id,
          courseId,
        },
      },
    })

    return !!item
  }
}
