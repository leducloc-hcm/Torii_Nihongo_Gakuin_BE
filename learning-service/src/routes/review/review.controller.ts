import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseIntPipe,
} from "@nestjs/common";
import { ReviewService } from "./review.service";
import {
  CreateReviewDTO,
  QueryReviewDTO,
  UpdateReviewStatusDTO,
  ReviewVoteDTO,
} from "./review.dto";
import { Auth, IsPublic } from "src/shared/decorators/auth.decorator";
import { AuthType } from "src/shared/constants/auth.constant";
import { Roles } from "src/shared/decorators/roles.decorator";
import { RolesGuard } from "src/shared/guards/roles.guard";
import { RoleName } from "src/shared/constants/role.constant";
import { ActiveUser } from "src/shared/decorators/active-user.decorator";

@Controller("reviews")
@UseGuards(RolesGuard)
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  // Create or update a review for a course
  @Post("courses/:courseId")
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer)
  @HttpCode(HttpStatus.OK)
  async createOrUpdateReview(
    @ActiveUser("userId") userId: number,
    @Param("courseId", ParseIntPipe) courseId: number,
    @Body() body: CreateReviewDTO,
  ) {
    return this.reviewService.createOrUpdateReview(userId, courseId, body);
  }

  // Get course reviews (paginated)
  @Get("courses/:courseId")
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin, RoleName.Staff, RoleName.Lecturer, RoleName.Customer)
  @HttpCode(HttpStatus.OK)
  async getCourseReviews(
    @Param("courseId", ParseIntPipe) courseId: number,
    @Query() query: QueryReviewDTO,
    @ActiveUser("userId") userId: number,
  ) {
    return this.reviewService.getCourseReviews(courseId, query, userId);
  }

  // Get rating stats + breakdown
  @Get("courses/:courseId/stats")
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin, RoleName.Staff, RoleName.Lecturer, RoleName.Customer)
  @HttpCode(HttpStatus.OK)
  async getCourseRatingStats(
    @Param("courseId", ParseIntPipe) courseId: number,
  ) {
    return this.reviewService.getCourseRatingStats(courseId);
  }

  // Get my review for a course
  @Get("courses/:courseId/my-review")
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer)
  @HttpCode(HttpStatus.OK)
  async getMyReview(
    @ActiveUser("userId") userId: number,
    @Param("courseId", ParseIntPipe) courseId: number,
  ) {
    const review = await this.reviewService.getMyReview(userId, courseId);
    return review || { message: "No review found" };
  }

  // Vote helpful/not helpful
  @Post(":reviewId/vote")
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer)
  @HttpCode(HttpStatus.OK)
  async voteReview(
    @ActiveUser("userId") userId: number,
    @Param("reviewId", ParseIntPipe) reviewId: number,
    @Body() body: ReviewVoteDTO,
  ) {
    return this.reviewService.voteReview(userId, reviewId, body.isHelpful);
  }

  // Remove vote
  @Delete(":reviewId/vote")
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer)
  @HttpCode(HttpStatus.OK)
  async removeVote(
    @ActiveUser("userId") userId: number,
    @Param("reviewId", ParseIntPipe) reviewId: number,
  ) {
    return this.reviewService.removeVote(userId, reviewId);
  }

  // Delete own review
  @Delete(":reviewId")
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer)
  @HttpCode(HttpStatus.OK)
  async deleteReview(
    @ActiveUser("userId") userId: number,
    @Param("reviewId", ParseIntPipe) reviewId: number,
  ) {
    return this.reviewService.deleteReview(userId, reviewId);
  }

  // Admin: Update review status (moderate)
  @Put("admin/:reviewId/status")
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  async adminUpdateStatus(
    @Param("reviewId", ParseIntPipe) reviewId: number,
    @Body() body: UpdateReviewStatusDTO,
  ) {
    return this.reviewService.adminUpdateStatus(reviewId, body.status);
  }
}
