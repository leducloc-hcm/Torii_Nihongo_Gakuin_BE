import {
  Controller,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { CertificateService } from "./certificate.service";
import { Auth } from "src/shared/decorators/auth.decorator";
import { AuthType } from "src/shared/constants/auth.constant";
import { Roles } from "src/shared/decorators/roles.decorator";
import { RolesGuard } from "src/shared/guards/roles.guard";
import { RoleName } from "src/shared/constants/role.constant";
import { ActiveUser } from "src/shared/decorators/active-user.decorator";

@Controller("certificates")
@UseGuards(RolesGuard)
export class CertificateController {
  constructor(private readonly certificateService: CertificateService) {}

  /** GET /certificates/me — list all certificates for the logged-in learner */
  @Get("me")
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer)
  @HttpCode(HttpStatus.OK)
  getMyCertificates(@ActiveUser("userId") userId: number) {
    return this.certificateService.getMyCertificates(userId);
  }

  /** GET /certificates/verify/:code — public: returns certificate JSON with pdfUrl pointing to S3 */
  @Get("verify/:code")
  @Auth([AuthType.None])
  @HttpCode(HttpStatus.OK)
  verifyCertificate(@Param("code") code: string) {
    return this.certificateService.getCertificateByVerifyCode(code);
  }
}
