import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { ReviewRepository } from "./review.repo";
import { EnrollmentService } from "../enrollment/enrollment.service";
import { PrismaService } from "src/shared/services/prisma.service";
import {
  CreateReviewType,
  QueryReviewType,
  ReviewWithUser,
  CourseRatingStats,
} from "./review.model";

@Injectable()
export class ReviewService {
  constructor(
    private readonly reviewRepository: ReviewRepository,
    private readonly enrollmentService: EnrollmentService,
    private readonly prisma: PrismaService,
  ) {}

  async createOrUpdateReview(
    userId: number,
    courseId: number,
    data: CreateReviewType,
  ): Promise<ReviewWithUser> {
    // 1. Check enrollment
    const isEnrolled = await this.enrollmentService.isUserEnrolled(
      userId,
      courseId,
    );
    if (!isEnrolled) {
      throw new ForbiddenException(
        "You must be enrolled in this course to write a review",
      );
    }

    // 2. Check progress >= 30%
    const progress = await this.calculateCourseProgress(userId, courseId);
    if (progress < 30) {
      throw new BadRequestException(
        `You must complete at least 30% of the course to write a review. Current progress: ${progress}%`,
      );
    }

    // 3. Validate rating
    if (data.rating < 1 || data.rating > 5) {
      throw new BadRequestException("Rating must be between 1 and 5");
    }

    // 4. Upsert review
    return this.reviewRepository.upsert(userId, courseId, data);
  }

  async getCourseReviews(
    courseId: number,
    query: QueryReviewType,
    currentUserId?: number,
  ) {
    // Verify course exists
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });
    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    const { reviews, total } = await this.reviewRepository.findByCourse(
      courseId,
      query,
      currentUserId,
    );

    return {
      data: reviews,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getCourseRatingStats(courseId: number): Promise<CourseRatingStats> {
    // Verify course exists
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });
    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    return this.reviewRepository.getCourseRatingStats(courseId);
  }

  async getMyReview(
    userId: number,
    courseId: number,
  ): Promise<ReviewWithUser | null> {
    return this.reviewRepository.findByUserAndCourse(userId, courseId);
  }

  async voteReview(userId: number, reviewId: number, isHelpful: boolean) {
    const review = await this.reviewRepository.findOne(reviewId);
    if (!review) {
      throw new NotFoundException(`Review with ID ${reviewId} not found`);
    }

    // Cannot vote on own review
    if (review.userId === userId) {
      throw new BadRequestException("You cannot vote on your own review");
    }

    return this.reviewRepository.upsertVote(reviewId, userId, isHelpful);
  }

  async removeVote(userId: number, reviewId: number) {
    const review = await this.reviewRepository.findOne(reviewId);
    if (!review) {
      throw new NotFoundException(`Review with ID ${reviewId} not found`);
    }

    await this.reviewRepository.removeVote(reviewId, userId);
    return { message: "Vote removed successfully" };
  }

  async deleteReview(userId: number, reviewId: number) {
    const review = await this.reviewRepository.findOne(reviewId);
    if (!review) {
      throw new NotFoundException(`Review with ID ${reviewId} not found`);
    }

    if (review.userId !== userId) {
      throw new ForbiddenException("You can only delete your own reviews");
    }

    await this.reviewRepository.delete(reviewId);
    return { message: "Review deleted successfully" };
  }

  async adminUpdateStatus(
    reviewId: number,
    status: "VISIBLE" | "HIDDEN" | "FLAGGED",
  ) {
    const review = await this.reviewRepository.findOne(reviewId);
    if (!review) {
      throw new NotFoundException(`Review with ID ${reviewId} not found`);
    }

    return this.reviewRepository.updateStatus(reviewId, status);
  }

  private async calculateCourseProgress(
    userId: number,
    courseId: number,
  ): Promise<number> {
    const totalLessons = await this.prisma.lesson.count({
      where: {
        module: { courseId },
      },
    });

    if (totalLessons === 0) return 100; // No lessons = consider complete

    const completedLessons = await this.prisma.lessonProgress.count({
      where: {
        userId,
        completed: true,
        lesson: {
          module: { courseId },
        },
      },
    });

    return Math.round((completedLessons / totalLessons) * 100);
  }
}
