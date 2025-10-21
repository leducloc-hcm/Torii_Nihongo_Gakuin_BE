import { z } from 'zod'

// Course info schema for cart items
const CourseInfoSchema = z.object({
  id: z.number().int().positive(),
  slug: z.string(),
  title: z.string(),
  subtitle: z.string().nullable().optional(),
  level: z.enum(['N5', 'N4', 'N3', 'N2', 'N1']),
  thumbnailUrl: z.string().url().nullable().optional(),
  price: z.number().int().min(0),
  status: z.enum(['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED']),
})

// Cart Item Schema
export const CartItemSchema = z.object({
  id: z.number().int().positive(),
  cartId: z.number().int().positive(),
  courseId: z.number().int().positive(),
  quantity: z.number().int().min(1),
  course: CourseInfoSchema.optional(),
})

// Cart Schema
export const CartSchema = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  items: z.array(CartItemSchema),
})

// Add to Cart Schema
export const AddToCartSchema = z.object({
  courseId: z.coerce.number().int().positive({ message: 'Course ID must be positive' }),
  quantity: z.coerce.number().int().min(1, { message: 'Quantity must be at least 1' }).default(1),
})

// Update Cart Item Schema
export const UpdateCartItemSchema = z.object({
  quantity: z.coerce.number().int().min(1, { message: 'Quantity must be at least 1' }),
})

// Cart Item Response Schema
export const CartItemResponseSchema = z.object({
  id: z.number().int().positive(),
  courseId: z.number().int().positive(),
  quantity: z.number().int().min(1),
  course: CourseInfoSchema,
})

// Cart Response Schema
export const CartResponseSchema = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  items: z.array(CartItemResponseSchema),
  totalItems: z.number().int().min(0),
  totalAmount: z.number().int().min(0),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

// Cart Summary Schema
export const CartSummarySchema = z.object({
  totalItems: z.number().int().min(0),
  totalAmount: z.number().int().min(0),
  items: z.array(CartItemSchema),
})

// TypeScript types
export type Cart = z.infer<typeof CartSchema>
export type CartItem = z.infer<typeof CartItemSchema>
export type CartSummary = z.infer<typeof CartSummarySchema>
export type CartItemResponse = z.infer<typeof CartItemResponseSchema>
export type CartResponse = z.infer<typeof CartResponseSchema>
