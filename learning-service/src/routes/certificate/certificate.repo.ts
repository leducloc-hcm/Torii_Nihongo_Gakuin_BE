import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/shared/services/prisma.service";

@Injectable()
export class CertificateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserAndCourse(userId: number, courseId: number) {
    return this.prisma.certificate.findUnique({
      where: { userId_courseId: { userId, courseId } },
      include: {
        course: { select: { id: true, title: true, thumbnailUrl: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async findByVerifyCode(verifyCode: string) {
    return this.prisma.certificate.findUnique({
      where: { verifyCode },
      include: {
        course: { select: { id: true, title: true, thumbnailUrl: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async findAllByUser(userId: number) {
    return this.prisma.certificate.findMany({
      where: { userId },
      include: {
        course: { select: { id: true, title: true, thumbnailUrl: true } },
      },
      orderBy: { issuedAt: "desc" },
    });
  }

  async create(data: { userId: number; courseId: number; verifyCode: string }) {
    return this.prisma.certificate.create({
      data,
      include: {
        course: { select: { id: true, title: true, thumbnailUrl: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async updatePdfUrl(id: number, pdfUrl: string) {
    return this.prisma.certificate.update({
      where: { id },
      data: { pdfUrl },
    });
  }
}
