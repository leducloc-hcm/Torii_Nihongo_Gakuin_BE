import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { AuthRepository } from "./auth.repo";
import { GoogleService } from "./google.service";
import { ProfileModule } from "../profile/profile.module";
import { CartModule } from "../cart/cart.module";
import { WebsocketsModule } from "src/websockets/websockets.module";

@Module({
  imports: [ProfileModule, CartModule, WebsocketsModule],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, GoogleService],
  exports: [AuthService],
})
export class AuthModule {}
