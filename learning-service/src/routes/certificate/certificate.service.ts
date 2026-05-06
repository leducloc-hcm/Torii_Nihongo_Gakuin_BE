import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { CertificateRepository } from "./certificate.repo";
import { EmailService } from "src/shared/services/email.service";
import { S3Service } from "src/shared/services/s3.service";
import { randomUUID } from "crypto";
import { generateCertificatePDF } from "./generate-certificate-pdf";
import { ActivityLogService } from "../activity-log/activity-log.service";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://torii-nihongo-gakuin.io.vn";

@Injectable()
export class CertificateService {
  private readonly logger = new Logger(CertificateService.name);

  constructor(
    private readonly certificateRepo: CertificateRepository,
    private readonly emailService: EmailService,
    private readonly s3Service: S3Service,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async getMyCertificates(userId: number) {
    return this.certificateRepo.findAllByUser(userId);
  }

  async getCertificateByVerifyCode(verifyCode: string) {
    const cert = await this.certificateRepo.findByVerifyCode(verifyCode);
    if (!cert) throw new NotFoundException("Certificate not found");
    return cert;
  }

  /**
   * Called internally when a learner completes a course (100% progress).
   * Idempotent — if a certificate already exists for this user+course, it returns it.
   * Generates a PDF, uploads to S3, stores URL, and sends email with attachment.
   */
  async issueCertificate(userId: number, courseId: number): Promise<void> {
    // Idempotency check
    const existing = await this.certificateRepo.findByUserAndCourse(
      userId,
      courseId,
    );
    if (existing) {
      this.logger.log(
        `Certificate already exists for user ${userId}, course ${courseId}`,
      );
      return;
    }

    const verifyCode = randomUUID();
    const verifyUrl = `${APP_URL}/verify/${verifyCode}`;

    const cert = await this.certificateRepo.create({
      userId,
      courseId,
      verifyCode,
    });

    // Generate PDF → Upload to S3 → Update DB → Send email (non-blocking)
    this.generateAndUploadPdf(cert, verifyCode, verifyUrl).catch((err) => {
      this.logger.error(
        `Failed to generate/upload certificate PDF for user ${userId}:`,
        err,
      );
    });

    this.logger.log(
      `Certificate issued for user ${userId}, course ${courseId} — code: ${verifyCode}`,
    );

    this.activityLogService.log({
      userId,
      action: "CERTIFICATE_ISSUED",
      entity: "CERTIFICATE",
      entityId: cert.id,
      description: `Certificate issued for course #${courseId}`,
      metadata: { courseId, verifyCode },
    });
  }

  private async generateAndUploadPdf(
    cert: Awaited<ReturnType<CertificateRepository["create"]>>,
    verifyCode: string,
    verifyUrl: string,
  ) {
    const studentName = cert.user!.name;
    const courseTitle = cert.course!.title;

    // 1. Generate PDF buffer
    const pdfBuffer = await generateCertificatePDF({
      studentName,
      courseTitle,
      issuedAt: cert.issuedAt,
      verifyCode,
      verifyUrl,
    });

    // 2. Upload to S3
    const s3Key = `certificates/${verifyCode}.pdf`;
    const { url: pdfUrl } = await this.s3Service.uploadBuffer(
      pdfBuffer,
      s3Key,
      "application/pdf",
    );

    // 3. Update certificate record with PDF URL
    await this.certificateRepo.updatePdfUrl(cert.id, pdfUrl);

    this.logger.log(`Certificate PDF uploaded to S3: ${s3Key}`);

    // 4. Send email with PDF attachment
    await this.emailService.sendCourseCertificate({
      email: cert.user!.email,
      studentName,
      courseTitle,
      issuedAt: cert.issuedAt,
      verifyUrl,
      pdfBuffer,
    });
  }
}
