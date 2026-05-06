import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/shared/services/prisma.service";
import { CreateRefundRequestDTO } from "./refund.dto";

@Injectable()
export class RefundRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly include = {
    user: { select: { id: true, name: true, email: true } },
    reviewer: { select: { id: true, name: true, email: true } },
    order: { select: { id: true, totalAmount: true, status: true } },
    course: {
      select: {
        id: true,
        title: true,
        slug: true,
        courseType: true,
        thumbnailUrl: true,
      },
    },
  };

  async create(
    userId: number,
    data: CreateRefundRequestDTO,
    progressAtRequest: number,
  ) {
    return this.prisma.refundRequest.create({
      data: {
        userId,
        orderId: data.orderId,
        courseId: data.courseId,
        fullName: data.fullName,
        email: data.email,
        reason: data.reason,
        bankAccountName: data.bankAccountName,
        bankAccountNumber: data.bankAccountNumber,
        bankName: data.bankName,
        progressAtRequest,
      },
      include: this.include,
    });
  }

  async findById(id: number) {
    return this.prisma.refundRequest.findUnique({
      where: { id },
      include: this.include,
    });
  }

  async findByUser(userId: number) {
    return this.prisma.refundRequest.findMany({
      where: { userId },
      include: this.include,
      orderBy: { createdAt: "desc" },
    });
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    status?: string;
    userId?: number;
  }) {
    const { page = 1, limit = 10, status, userId } = params;
    const where: any = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;

    const [items, total] = await Promise.all([
      this.prisma.refundRequest.findMany({
        where,
        include: this.include,
        orderBy: { createdAt: "desc" },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      this.prisma.refundRequest.count({ where }),
    ]);

    return { items, total, page: pageNum, limit: limitNum };
  }

  async updateStatus(
    id: number,
    status: string,
    reviewedBy: number,
    extras?: {
      rejectionReason?: string;
      rejectionEvidence?: string;
      approvalEvidence?: string;
      progressAtReview?: number;
    },
  ) {
    return this.prisma.refundRequest.update({
      where: { id },
      data: {
        status: status as any,
        reviewedBy,
        reviewedAt: new Date(),
        ...(extras?.rejectionReason && {
          rejectionReason: extras.rejectionReason,
        }),
        ...(extras?.rejectionEvidence && {
          rejectionEvidence: extras.rejectionEvidence,
        }),
        ...(extras?.approvalEvidence && {
          approvalEvidence: extras.approvalEvidence,
        }),
        ...(extras?.progressAtReview !== undefined && {
          progressAtReview: extras.progressAtReview,
        }),
      },
      include: this.include,
    });
  }

  async existsPendingForUserCourse(userId: number, courseId: number) {
    const count = await this.prisma.refundRequest.count({
      where: { userId, courseId, status: { in: ["PENDING", "APPROVED"] } },
    });
    return count > 0;
  }
}
