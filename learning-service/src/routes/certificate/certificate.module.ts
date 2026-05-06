import { Module } from "@nestjs/common";
import { CertificateController } from "./certificate.controller";
import { CertificateService } from "./certificate.service";
import { CertificateRepository } from "./certificate.repo";
import { SharedModule } from "src/shared/shared.module";

@Module({
  imports: [SharedModule],
  controllers: [CertificateController],
  providers: [CertificateService, CertificateRepository],
  exports: [CertificateService],
})
export class CertificateModule {}
