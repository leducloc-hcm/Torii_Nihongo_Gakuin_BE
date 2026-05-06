import { createZodDto } from 'nestjs-zod'
import { AddToCartSchema, UpdateCartItemSchema, CartResponseSchema, CartItemResponseSchema } from './cart.model'

export class AddToCartDTO extends createZodDto(AddToCartSchema) {}
export class UpdateCartItemDTO extends createZodDto(UpdateCartItemSchema) {}
export class CartResponseDTO extends createZodDto(CartResponseSchema) {}
export class CartItemResponseDTO extends createZodDto(CartItemResponseSchema) {}
