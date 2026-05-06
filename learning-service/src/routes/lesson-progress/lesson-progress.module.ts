import { Module } from "@nestjs/common";
import { LessonProgressController } from "./lesson-progress.controller";
import { LessonProgressService } from "./lesson-progress.service";
import { LessonProgressRepository } from "./lesson-progress.repo";
import { EnrollmentModule } from "../enrollment/enrollment.module";
import { CertificateModule } from "../certificate/certificate.module";

@Module({
  imports: [EnrollmentModule, CertificateModule],
  controllers: [LessonProgressController],
  providers: [LessonProgressService, LessonProgressRepository],
  exports: [LessonProgressService, LessonProgressRepository],
})
export class LessonProgressModule {}
