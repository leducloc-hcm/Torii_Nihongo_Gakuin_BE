import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "src/shared/services/prisma.service";
import { NotificationService } from "../notification/notification.service";
import { EmailService } from "src/shared/services/email.service";
import { ActivityLogService } from "../activity-log/activity-log.service";
import { SharedUserRepository } from "src/shared/repositories/shared-user.repo";
import { RefundRepository } from "./refund.repo";
import {
  CreateRefundRequestDTO,
  ApproveRefundDTO,
  RejectRefundDTO,
  QueryRefundDTO,
} from "./refund.dto";
import { RefundPolicyCheckResult } from "./refund.model";

// Policy constants
const VIDEO_QUIZ_PROGRESS_THRESHOLD = 0.3; // 30%
const LIVE_SESSION_PROGRESS_THRESHOLD = 0.2; // 20%

@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly refundRepo: RefundRepository,
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService,
    private readonly activityLogService: ActivityLogService,
    private readonly sharedUserRepo: SharedUserRepository,
  ) {}

  /**
   * Calculate the current course progress for a user (0–1 scale).
   * For VIDEO_QUIZ courses: completed lessons / total published lessons.
   * For LIVE_ONLY / VIDEO_QUIZ_LIVE: attended sessions / total sessions.
   */
  async getCourseProgressPercent(
    userId: number,
    courseId: number,
  ): Promise<number> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          include: {
            lessons: { where: { status: "PUBLISHED" } },
          },
        },
        Class: {
          include: { sessions: true },
        },
      },
    });
    if (!course) throw new NotFoundException("Course not found");

    if (course.courseType === "VIDEO_QUIZ") {
      const totalLessons = course.modules.reduce(
        (acc, m) => acc + m.lessons.length,
        0,
      );
      if (totalLessons === 0) return 0;
      const completed = await this.prisma.lessonProgress.count({
        where: {
          userId,
          completed: true,
          lesson: { module: { courseId }, status: "PUBLISHED" },
        },
      });
      return completed / totalLessons;
    }

    // LIVE_ONLY or VIDEO_QUIZ_LIVE — use attendance
    const allSessions = course.Class.flatMap((c) => c.sessions);
    if (allSessions.length === 0) return 0;
    const attended = await this.prisma.attendance.count({
      where: {
        userId,
        sessionId: { in: allSessions.map((s) => s.id) },
        status: { in: ["PRESENT", "LATE"] },
      },
    });
    return attended / allSessions.length;
  }

  async checkRefundPolicy(
    userId: number,
    courseId: number,
  ): Promise<RefundPolicyCheckResult> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException("Course not found");

    const progressPercent = await this.getCourseProgressPercent(
      userId,
      courseId,
    );
    const isLive =
      course.courseType === "LIVE_ONLY" ||
      course.courseType === "VIDEO_QUIZ_LIVE";
    const threshold = isLive
      ? LIVE_SESSION_PROGRESS_THRESHOLD
      : VIDEO_QUIZ_PROGRESS_THRESHOLD;

    return {
      eligible: progressPercent <= threshold,
      progressPercent,
      threshold,
      reason:
        progressPercent > threshold
          ? `You have completed ${Math.round(progressPercent * 100)}% of the course, which exceeds the ${Math.round(threshold * 100)}% refund limit.`
          : undefined,
    };
  }

  async createRefundRequest(userId: number, data: CreateRefundRequestDTO) {
    // Verify enrollment
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { userId, courseId: data.courseId },
    });
    if (!enrollment) {
      throw new ForbiddenException("You are not enrolled in this course");
    }

    // Verify the order belongs to this user and contains this course
    const order = await this.prisma.order.findFirst({
      where: {
        id: data.orderId,
        userId,
        status: "COMPLETED",
        items: { some: { courseId: data.courseId } },
      },
    });
    if (!order) {
      throw new BadRequestException("No completed order found for this course");
    }

    // Check for existing pending/approved request
    const exists = await this.refundRepo.existsPendingForUserCourse(
      userId,
      data.courseId,
    );
    if (exists) {
      throw new ConflictException(
        "You already have a pending refund request for this course",
      );
    }

    // Capture progress at time of request
    const progressAtRequest = await this.getCourseProgressPercent(
      userId,
      data.courseId,
    );

    const refund = await this.refundRepo.create(
      userId,
      data,
      progressAtRequest,
    );

    // Notify admins
    await this.notifyAdmins(
      refund.id,
      userId,
      data.courseId,
      refund.course.title,
    );

    // Activity log
    this.activityLogService.log({
      userId,
      action: "REFUND_REQUEST_CREATED",
      entity: "REFUND",
      entityId: refund.id,
      description: `User created refund request for course #${data.courseId}`,
      metadata: { courseId: data.courseId, orderId: data.orderId },
    });

    return refund;
  }

  async getMyRefunds(userId: number) {
    return this.refundRepo.findByUser(userId);
  }

  async getRefundById(id: number, userId: number, isAdmin = false) {
    const refund = await this.refundRepo.findById(id);
    if (!refund) throw new NotFoundException("Refund request not found");
    if (!isAdmin && refund.userId !== userId) {
      throw new ForbiddenException("Access denied");
    }
    return refund;
  }

  async getAllRefunds(query: QueryRefundDTO) {
    return this.refundRepo.findAll(query);
  }

  /**
   * Admin: check current progress and validate policy at review time
   */
  async getRefundWithLiveProgress(id: number) {
    const refund = await this.refundRepo.findById(id);
    if (!refund) throw new NotFoundException("Refund request not found");

    const currentProgress = await this.getCourseProgressPercent(
      refund.userId,
      refund.courseId,
    );
    const policyCheck = await this.checkRefundPolicy(
      refund.userId,
      refund.courseId,
    );

    return { refund, currentProgress, policyCheck };
  }

  /**
   * Admin: approve refund — attach bank transfer evidence and email the learner
   */
  async approveRefund(id: number, adminId: number, dto: ApproveRefundDTO) {
    const refund = await this.refundRepo.findById(id);
    if (!refund) throw new NotFoundException("Refund request not found");
    if (refund.status !== "PENDING") {
      throw new BadRequestException(
        "Only PENDING refund requests can be approved",
      );
    }

    const currentProgress = await this.getCourseProgressPercent(
      refund.userId,
      refund.courseId,
    );
    const updated = await this.refundRepo.updateStatus(
      id,
      "APPROVED",
      adminId,
      {
        approvalEvidence: dto.approvalEvidence,
        progressAtReview: currentProgress,
      },
    );

    // Look up the specific OrderItem for this course to get the correct refund amount
    const orderItem = await this.prisma.orderItem.findFirst({
      where: { orderId: refund.orderId, courseId: refund.courseId },
    });
    const refundAmount = orderItem?.unitPrice ?? refund.order.totalAmount;

    // Create a REFUNDED payment record (who transferred, date, amount, evidence)
    await this.prisma.payment.create({
      data: {
        orderId: refund.orderId,
        amount: refundAmount,
        method: "BANK_TRANSFER",
        status: "REFUNDED",
        providerRef: dto.approvalEvidence,
        processedAt: new Date(),
        providerResponse: {
          refundRequestId: id,
          processedBy: adminId,
          approvalEvidence: dto.approvalEvidence,
        },
      },
    });

    // Determine order status: REFUNDED if all items have approved refunds, else PARTIALLY_REFUNDED
    const totalItems = await this.prisma.orderItem.count({
      where: { orderId: refund.orderId, type: "COURSE" },
    });
    const approvedRefunds = await this.prisma.refundRequest.count({
      where: { orderId: refund.orderId, status: "APPROVED" },
    });
    const newOrderStatus = approvedRefunds >= totalItems ? "REFUNDED" : "PARTIALLY_REFUNDED";

    await this.prisma.order.update({
      where: { id: refund.orderId },
      data: { status: newOrderStatus },
    });

    // Remove enrollment record (exists for VIDEO_QUIZ and VIDEO_QUIZ_LIVE; may exist for LIVE_ONLY too)
    await this.prisma.enrollment
      .delete({ where: { userId_courseId: { userId: refund.userId, courseId: refund.courseId } } })
      .catch((err) =>
        this.logger.warn(
          `Could not remove enrollment for user ${refund.userId} / course ${refund.courseId}: ${err.message}`,
        ),
      );

    // For courses with a live component, also remove class membership and folder access
    const courseType = refund.course.courseType;
    if (courseType === "LIVE_ONLY" || courseType === "VIDEO_QUIZ_LIVE") {
      // Find all classes belonging to this course (with their folder ids)
      const classes = await this.prisma.class.findMany({
        where: { courseId: refund.courseId },
        select: { id: true, folderId: true },
      });

      const classIds = classes.map((c) => c.id);
      const folderIds = classes
        .filter((c) => c.folderId != null)
        .map((c) => c.folderId as number);

      if (classIds.length > 0) {
        await this.prisma.classMember
          .deleteMany({ where: { classId: { in: classIds }, userId: refund.userId } })
          .catch((err) =>
            this.logger.warn(
              `Could not remove class memberships for user ${refund.userId}: ${err.message}`,
            ),
          );
      }

      if (folderIds.length > 0) {
        await this.prisma.folderPermission
          .deleteMany({ where: { folderId: { in: folderIds }, userId: refund.userId } })
          .catch((err) =>
            this.logger.warn(
              `Could not remove folder permissions for user ${refund.userId}: ${err.message}`,
            ),
          );
      }
    }

    // In-app notification
    await this.notificationService.create({
      userId: refund.userId,
      type: "REFUND_APPROVED",
      title: "Refund request approved",
      message: `Your refund request for "${refund.course.title}" has been approved. The transfer has been completed.`,
      actionUrl: "/customer/refund",
      entityId: id,
      entityType: "RefundRequest",
    });

    // Email notification with transfer evidence
    await this.emailService
      .sendRefundApproved({
        email: refund.email,
        studentName: refund.fullName,
        courseTitle: refund.course.title,
        approvalEvidence: dto.approvalEvidence,
        progressPercent: Math.round(currentProgress * 100),
        refundId: id,
      })
      .catch((err) =>
        this.logger.error("Failed to send refund approval email", err),
      );

    this.activityLogService.log({
      userId: adminId,
      action: "REFUND_REVIEWED",
      entity: "REFUND",
      entityId: id,
      description: `Admin approved refund request #${id}`,
    });

    return updated;
  }

  /**
   * Admin: reject refund — validate policy, send email + socket notification
   */
  async rejectRefund(id: number, adminId: number, dto: RejectRefundDTO) {
    const refund = await this.refundRepo.findById(id);
    if (!refund) throw new NotFoundException("Refund request not found");
    if (refund.status !== "PENDING") {
      throw new BadRequestException(
        "Only PENDING refund requests can be rejected",
      );
    }

    const currentProgress = await this.getCourseProgressPercent(
      refund.userId,
      refund.courseId,
    );
    const updated = await this.refundRepo.updateStatus(
      id,
      "REJECTED",
      adminId,
      {
        rejectionReason: dto.rejectionReason,
        rejectionEvidence: dto.rejectionEvidence,
        progressAtReview: currentProgress,
      },
    );

    // In-app notification via socket
    await this.notificationService.create({
      userId: refund.userId,
      type: "REFUND_REJECTED",
      title: "Refund request rejected",
      message: `Your refund request for "${refund.course.title}" has been rejected. Reason: ${dto.rejectionReason}`,
      actionUrl: "/customer/refund",
      entityId: id,
      entityType: "RefundRequest",
    });

    // Email notification
    await this.emailService
      .sendRefundRejected({
        email: refund.email,
        studentName: refund.fullName,
        courseTitle: refund.course.title,
        rejectionReason: dto.rejectionReason,
        rejectionEvidence: dto.rejectionEvidence,
        progressPercent: Math.round(currentProgress * 100),
        refundId: id,
      })
      .catch((err) =>
        this.logger.error("Failed to send refund rejection email", err),
      );

    this.activityLogService.log({
      userId: adminId,
      action: "REFUND_REVIEWED",
      entity: "REFUND",
      entityId: id,
      description: `Admin rejected refund request #${id}: ${dto.rejectionReason}`,
    });

    return updated;
  }

  private async notifyAdmins(
    refundId: number,
    requesterId: number,
    courseId: number,
    courseTitle: string,
  ) {
    const admins = await this.prisma.user.findMany({
      where: { role: "ADMIN", status: "VERIFIED" },
      select: { id: true },
    });

    await Promise.all(
      admins.map((admin) =>
        this.notificationService.create({
          userId: admin.id,
          type: "REFUND_REQUEST_CREATED",
          title: "New refund request",
          message: `A new refund request has been submitted for course "${courseTitle}" (ID: #${refundId})`,
          actionUrl: `/admin/manage-refund/${refundId}`,
          entityId: refundId,
          entityType: "RefundRequest",
          relatedUserId: requesterId,
        }),
      ),
    );
  }
}
