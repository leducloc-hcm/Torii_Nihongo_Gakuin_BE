import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthType } from "src/shared/constants/auth.constant";
import { RoleName } from "src/shared/constants/role.constant";
import { ActiveUser } from "src/shared/decorators/active-user.decorator";
import { Auth } from "src/shared/decorators/auth.decorator";
import { Roles } from "src/shared/decorators/roles.decorator";
import { RolesGuard } from "src/shared/guards/roles.guard";
import { RefundService } from "./refund.service";
import { S3Service } from "src/shared/services/s3.service";
import {
  CreateRefundRequestDTO,
  ApproveRefundDTO,
  RejectRefundDTO,
  QueryRefundDTO,
} from "./refund.dto";

@Controller("refunds")
@UseGuards(RolesGuard)
export class RefundController {
  constructor(
    private readonly refundService: RefundService,
    private readonly s3Service: S3Service,
  ) {}

  // ─── Customer endpoints ──────────────────────────────────────────────────

  @Post()
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer)
  @HttpCode(HttpStatus.CREATED)
  async createRefundRequest(
    @ActiveUser("userId") userId: number,
    @Body() dto: CreateRefundRequestDTO,
  ) {
    return this.refundService.createRefundRequest(userId, dto);
  }

  @Get("my")
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer)
  @HttpCode(HttpStatus.OK)
  async getMyRefunds(@ActiveUser("userId") userId: number) {
    return this.refundService.getMyRefunds(userId);
  }

  @Get("my/:id")
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer)
  @HttpCode(HttpStatus.OK)
  async getMyRefundById(
    @ActiveUser("userId") userId: number,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.refundService.getRefundById(id, userId);
  }

  /**
   * Check refund policy eligibility for a course (customer side, pre-submit).
   */
  @Get("policy-check/:courseId")
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer)
  @HttpCode(HttpStatus.OK)
  async checkPolicy(
    @ActiveUser("userId") userId: number,
    @Param("courseId", ParseIntPipe) courseId: number,
  ) {
    return this.refundService.checkRefundPolicy(userId, courseId);
  }

  // ─── Admin endpoints ─────────────────────────────────────────────────────

  @Post("admin/evidence-upload-url")
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  async generateEvidenceUploadUrl(
    @Body() body: { filename: string; contentType: string },
  ) {
    return this.s3Service.generatePresignedRefundEvidenceUploadUrl(
      body.filename,
      body.contentType,
    );
  }

  @Get("admin")
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin, RoleName.Staff)
  @HttpCode(HttpStatus.OK)
  async getAllRefunds(@Query() query: QueryRefundDTO) {
    return this.refundService.getAllRefunds(query);
  }

  @Get("admin/:id")
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin, RoleName.Staff)
  @HttpCode(HttpStatus.OK)
  async getRefundDetail(@Param("id", ParseIntPipe) id: number) {
    return this.refundService.getRefundWithLiveProgress(id);
  }

  @Patch("admin/:id/approve")
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  async approveRefund(
    @ActiveUser("userId") adminId: number,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ApproveRefundDTO,
  ) {
    return this.refundService.approveRefund(id, adminId, dto);
  }

  @Patch("admin/:id/reject")
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  async rejectRefund(
    @ActiveUser("userId") adminId: number,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: RejectRefundDTO,
  ) {
    return this.refundService.rejectRefund(id, adminId, dto);
  }
}
