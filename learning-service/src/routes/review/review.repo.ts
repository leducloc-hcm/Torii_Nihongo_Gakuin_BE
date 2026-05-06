import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/shared/services/prisma.service";
import {
  CreateReviewType,
  QueryReviewType,
  ReviewWithUser,
  CourseRatingStats,
  CourseRatingBreakdown,
} from "./review.model";

@Injectable()
export class ReviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly reviewInclude = {
    user: {
      select: {
        id: true,
        name: true,
        customerProfile: {
          select: {
            avatar: true,
          },
        },
      },
    },
  };

  async upsert(
    userId: number,
    courseId: number,
    data: CreateReviewType,
  ): Promise<ReviewWithUser> {
    return this.prisma.review.upsert({
      where: {
        courseId_userId: { courseId, userId },
      },
      create: {
        courseId,
        userId,
        rating: data.rating,
        comment: data.comment ?? null,
      },
      update: {
        rating: data.rating,
        comment: data.comment ?? null,
      },
      include: this.reviewInclude,
    }) as unknown as ReviewWithUser;
  }

  async findByCourse(
    courseId: number,
    query: QueryReviewType,
    currentUserId?: number,
  ): Promise<{ reviews: ReviewWithUser[]; total: number }> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const { sortBy, filterRating, hasComment } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      courseId,
      status: "VISIBLE",
    };

    if (filterRating) {
      where.rating = Number(filterRating);
    }

    if (hasComment) {
      where.comment = { not: null };
    }

    // Build orderBy
    let orderBy: any = { createdAt: "desc" };
    switch (sortBy) {
      case "newest":
        orderBy = { createdAt: "desc" };
        break;
      case "oldest":
        orderBy = { createdAt: "asc" };
        break;
      case "highest":
        orderBy = { rating: "desc" };
        break;
      case "lowest":
        orderBy = { rating: "asc" };
        break;
      case "mostHelpful":
        orderBy = { helpfulCount: "desc" };
        break;
    }

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          ...this.reviewInclude,
          votes: currentUserId
            ? {
                where: { userId: currentUserId },
                select: { isHelpful: true },
                take: 1,
              }
            : false,
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    // Map votes to userVote
    const mappedReviews = reviews.map((review: any) => {
      const { votes, ...rest } = review;
      return {
        ...rest,
        userVote: votes && votes.length > 0 ? votes[0] : null,
      };
    });

    return { reviews: mappedReviews as ReviewWithUser[], total };
  }

  async findOne(reviewId: number): Promise<ReviewWithUser | null> {
    return this.prisma.review.findUnique({
      where: { id: reviewId },
      include: this.reviewInclude,
    }) as unknown as ReviewWithUser | null;
  }

  async findByUserAndCourse(
    userId: number,
    courseId: number,
  ): Promise<ReviewWithUser | null> {
    return this.prisma.review.findUnique({
      where: {
        courseId_userId: { courseId, userId },
      },
      include: this.reviewInclude,
    }) as unknown as ReviewWithUser | null;
  }

  async getCourseRatingStats(courseId: number): Promise<CourseRatingStats> {
    const reviews = await this.prisma.review.findMany({
      where: { courseId, status: "VISIBLE" },
      select: { rating: true },
    });

    const totalReviews = reviews.length;

    if (totalReviews === 0) {
      return {
        avgRating: 0,
        totalReviews: 0,
        bayesianScore: 0,
        breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const avgRating = sum / totalReviews;

    const breakdown: CourseRatingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      breakdown[r.rating as keyof CourseRatingBreakdown]++;
    });

    // Bayesian weighted score
    const platformAvg = await this.getPlatformAvgRating();
    const m = 10; // threshold
    const bayesianScore =
      (totalReviews / (totalReviews + m)) * avgRating +
      (m / (totalReviews + m)) * platformAvg;

    return {
      avgRating: Math.round(avgRating * 10) / 10,
      totalReviews,
      bayesianScore: Math.round(bayesianScore * 10) / 10,
      breakdown,
    };
  }

  async getPlatformAvgRating(): Promise<number> {
    const result = await this.prisma.review.aggregate({
      where: { status: "VISIBLE" },
      _avg: { rating: true },
    });
    return result._avg.rating ?? 3.5; // fallback to 3.5
  }

  async updateStatus(
    reviewId: number,
    status: "VISIBLE" | "HIDDEN" | "FLAGGED",
  ) {
    return this.prisma.review.update({
      where: { id: reviewId },
      data: { status },
      include: this.reviewInclude,
    });
  }

  async delete(reviewId: number) {
    return this.prisma.review.delete({
      where: { id: reviewId },
    });
  }

  // ===== Vote =====
  async upsertVote(reviewId: number, userId: number, isHelpful: boolean) {
    const vote = await this.prisma.reviewVote.upsert({
      where: {
        reviewId_userId: { reviewId, userId },
      },
      create: { reviewId, userId, isHelpful },
      update: { isHelpful },
    });

    await this.recalculateHelpfulCounts(reviewId);
    return vote;
  }

  async removeVote(reviewId: number, userId: number) {
    await this.prisma.reviewVote.deleteMany({
      where: { reviewId, userId },
    });
    await this.recalculateHelpfulCounts(reviewId);
  }

  private async recalculateHelpfulCounts(reviewId: number) {
    const [helpfulCount, notHelpfulCount] = await Promise.all([
      this.prisma.reviewVote.count({
        where: { reviewId, isHelpful: true },
      }),
      this.prisma.reviewVote.count({
        where: { reviewId, isHelpful: false },
      }),
    ]);

    await this.prisma.review.update({
      where: { id: reviewId },
      data: { helpfulCount, notHelpfulCount },
    });
  }
}
