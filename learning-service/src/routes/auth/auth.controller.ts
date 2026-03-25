import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { ZodSerializerDto } from "nestjs-zod";
import {
  CreateStaffAccountBodyDTO,
  DisableTwoFactorBodyDTO,
  ForgotPasswordBodyDTO,
  GetAuthorizationUrlResDTO,
  LoginBodyDTO,
  LoginResDTO,
  LogoutBodyDTO,
  RefreshTokenBodyDTO,
  RefreshTokenResDTO,
  RegisterBodyDTO,
  RegisterResDTO,
  SendOTPBodyDTO,
  TwoFactorSetupResDTO,
} from "src/routes/auth/auth.dto";

import { AuthService } from "src/routes/auth/auth.service";
import { GoogleService } from "src/routes/auth/google.service";
import { AuthType } from "src/shared/constants/auth.constant";
import { RoleName } from "src/shared/constants/role.constant";
import { ActiveUser } from "src/shared/decorators/active-user.decorator";
import { Auth, IsPublic } from "src/shared/decorators/auth.decorator";
import { Roles } from "src/shared/decorators/roles.decorator";
import { UserAgent } from "src/shared/decorators/user-agent.decorator";
import { EmptyBodyDTO } from "src/shared/dtos/request.dto";
import { MessageResDTO } from "src/shared/dtos/response.dto";
import { RolesGuard } from "src/shared/guards/roles.guard";

@Controller("auth")
@UseGuards(RolesGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly googleService: GoogleService,
  ) {}

  @Post("register")
  @IsPublic()
  @ZodSerializerDto(RegisterResDTO)
  register(@Body() body: RegisterBodyDTO) {
    return this.authService.register(body);
  }

  @Post("otp")
  @IsPublic()
  @ZodSerializerDto(MessageResDTO)
  sendOTP(@Body() body: SendOTPBodyDTO) {
    return this.authService.sendOTP(body);
  }

  @Post("login")
  @IsPublic()
  @ZodSerializerDto(LoginResDTO)
  login(
    @Body() body: LoginBodyDTO,
    @UserAgent() userAgent: string,
    @Ip() ip: string,
  ) {
    return this.authService.login({
      ...body,
      userAgent,
      ip,
    });
  }

  @Post("refresh-token")
  @IsPublic()
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(RefreshTokenResDTO)
  refreshToken(
    @Body() body: RefreshTokenBodyDTO,
    @UserAgent() userAgent: string,
    @Ip() ip: string,
  ) {
    return this.authService.refreshToken({
      refreshToken: body.refreshToken,
      userAgent,
      ip,
    });
  }

  @Post("logout")
  @ZodSerializerDto(MessageResDTO)
  logout(@Body() body: RefreshTokenBodyDTO) {
    return this.authService.logout(body.refreshToken);
  }

  @Get("google-link")
  @IsPublic()
  @ZodSerializerDto(GetAuthorizationUrlResDTO)
  getAuthorizationUrl(@UserAgent() userAgent: string, @Ip() ip: string) {
    return this.googleService.getAuthorizationUrl({
      userAgent,
      ip,
    });
  }

  @Get("google/callback")
  @IsPublic()
  async googleCallback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Res() res: Response,
  ) {
    try {
      const data = await this.googleService.googleCallback({
        code,
        state,
      });
      return res.redirect(
        `${process.env.GOOGLE_CLIENT_REDIRECT_URI}?accessToken=${data.accessToken}&refreshToken=${data.refreshToken}`,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Đã xảy ra lỗi khi đăng nhập bằng Google, vui lòng thử lại bằng cách khác";
      return res.redirect(
        `${process.env.GOOGLE_CLIENT_REDIRECT_URI}?errorMessage=${message}`,
      );
    }
  }

  @Post("forgot-password")
  @IsPublic()
  @ZodSerializerDto(MessageResDTO)
  forgotPassword(@Body() body: ForgotPasswordBodyDTO) {
    return this.authService.forgotPassword(body);
  }
  // Tại sao không dùng GET mà dùng POST? khi mà body gửi lên là {}
  // Vì POST mang ý nghĩa là tạo ra cái gì đó và POST cũng bảo mật hơn GET
  // Vì GET có thể được kích hoạt thông qua URL trên trình duyệt, POST thì không
  @Post("2fa/setup")
  @ZodSerializerDto(TwoFactorSetupResDTO)
  setupTwoFactorAuth(
    @Body() _: EmptyBodyDTO,
    @ActiveUser("userId") userId: number,
  ) {
    return this.authService.setupTwoFactorAuth(userId);
  }

  @Post("2fa/disable")
  @ZodSerializerDto(MessageResDTO)
  disableTwoFactorAuth(
    @Body() body: DisableTwoFactorBodyDTO,
    @ActiveUser("userId") userId: number,
  ) {
    return this.authService.disableTwoFactorAuth({
      ...body,
      userId,
    });
  }

  @Post("/admin/create-account")
  @ZodSerializerDto(MessageResDTO)
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin)
  createStaffAccount(@Body() body: CreateStaffAccountBodyDTO) {
    return this.authService.createStaffAccount(body);
  }
  @Get("/lecturers/all")
  @ZodSerializerDto(MessageResDTO)
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin, RoleName.Staff)
  getAllLecturers() {
    return this.authService.getAllLecturers();
  }

  @Get("/user/all")
  @ZodSerializerDto(MessageResDTO)
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin, RoleName.Staff)
  getAllUsers() {
    return this.authService.getAllUsers();
  }
  @Put("/user/disable/:id")
  @ZodSerializerDto(MessageResDTO)
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin)
  disableUserAccount(@Req() req) {
    const userId = parseInt(req.params.id, 10);
    return this.authService.disableUserAccount(userId);
  }
  @Put("/user/enable/:id")
  @ZodSerializerDto(MessageResDTO)
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin)
  enableUserAccount(@Req() req) {
    const userId = parseInt(req.params.id, 10);
    return this.authService.enableUserAccount(userId);
  }

  @Get("devices")
  @Auth([AuthType.Bearer])
  getDevices(@ActiveUser("userId") userId: number) {
    return this.authService.getDevices(userId);
  }

  @Delete("devices/:id")
  @Auth([AuthType.Bearer])
  @ZodSerializerDto(MessageResDTO)
  removeDevice(
    @ActiveUser("userId") userId: number,
    @ActiveUser("deviceId") currentDeviceId: number,
    @Param("id", ParseIntPipe) deviceId: number,
  ) {
    return this.authService.removeDevice(userId, deviceId, currentDeviceId);
  }
}
