import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseIntPipe,
} from "@nestjs/common";
import { CartService } from "./cart.service";
import { AddToCartDTO, UpdateCartItemDTO, CartResponseDTO } from "./cart.dto";
import { Auth } from "src/shared/decorators/auth.decorator";
import { AuthType } from "src/shared/constants/auth.constant";
import { Roles } from "src/shared/decorators/roles.decorator";
import { RolesGuard } from "src/shared/guards/roles.guard";
import { RoleName } from "src/shared/constants/role.constant";
import { ActiveUser } from "src/shared/decorators/active-user.decorator";

@Controller("cart")
@UseGuards(RolesGuard)
@Auth([AuthType.Bearer])
@Roles(RoleName.Customer, RoleName.Admin, RoleName.Staff)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getCart(
    @ActiveUser("userId") userId: number,
  ): Promise<CartResponseDTO | null> {
    return this.cartService.getCart(userId);
  }

  @Post("items")
  @HttpCode(HttpStatus.CREATED)
  async addToCart(
    @ActiveUser("userId") userId: number,
    @Body() addToCartDto: AddToCartDTO,
  ): Promise<CartResponseDTO> {
    return this.cartService.addToCart(userId, addToCartDto);
  }

  @Delete("items/:courseId")
  @HttpCode(HttpStatus.OK)
  async removeFromCart(
    @ActiveUser("userId") userId: number,
    @Param("courseId", ParseIntPipe) courseId: number,
  ): Promise<CartResponseDTO | null> {
    return this.cartService.removeFromCart(userId, courseId);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearCart(@ActiveUser("userId") userId: number): Promise<void> {
    await this.cartService.clearCart(userId);
  }

  @Get("summary")
  @HttpCode(HttpStatus.OK)
  async getCartSummary(@ActiveUser("userId") userId: number) {
    return this.cartService.getCartSummary(userId);
  }

  @Get("validate")
  @HttpCode(HttpStatus.OK)
  async validateCart(@ActiveUser("userId") userId: number) {
    return this.cartService.validateCartForCheckout(userId);
  }
}
