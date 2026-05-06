import { createZodDto } from "nestjs-zod";
import {
  CreateReviewSchema,
  UpdateReviewSchema,
  QueryReviewSchema,
  UpdateReviewStatusSchema,
  ReviewVoteSchema,
} from "./review.model";

export class CreateReviewDTO extends createZodDto(CreateReviewSchema) {}
export class UpdateReviewDTO extends createZodDto(UpdateReviewSchema) {}
export class QueryReviewDTO extends createZodDto(QueryReviewSchema) {}
export class UpdateReviewStatusDTO extends createZodDto(
  UpdateReviewStatusSchema,
) {}
export class ReviewVoteDTO extends createZodDto(ReviewVoteSchema) {}
