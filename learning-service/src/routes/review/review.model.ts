import { z } from "zod";

// ===== Create / Update =====
export const CreateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional().nullable(),
});

export const UpdateReviewSchema = CreateReviewSchema.partial();

// ===== Query =====
export const QueryReviewSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(50).optional().default(10),
  sortBy: z
    .enum(["newest", "oldest", "highest", "lowest", "mostHelpful"])
    .optional()
    .default("newest"),
  filterRating: z.coerce.number().int().min(1).max(5).optional(),
  hasComment: z.coerce.boolean().optional(),
});

// ===== Admin status =====
export const UpdateReviewStatusSchema = z.object({
  status: z.enum(["VISIBLE", "HIDDEN", "FLAGGED"]),
});

// ===== Vote =====
export const ReviewVoteSchema = z.object({
  isHelpful: z.boolean(),
});

// ===== Response types =====
export type ReviewWithUser = {
  id: number;
  courseId: number;
  userId: number;
  rating: number;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
  helpfulCount: number;
  notHelpfulCount: number;
  status: "VISIBLE" | "HIDDEN" | "FLAGGED";
  user: {
    id: number;
    name: string;
    customerProfile?: {
      avatar: string | null;
    } | null;
  };
  userVote?: {
    isHelpful: boolean;
  } | null;
};

export type CourseRatingBreakdown = {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
};

export type CourseRatingStats = {
  avgRating: number;
  totalReviews: number;
  bayesianScore: number;
  breakdown: CourseRatingBreakdown;
};

// ===== Inferred Zod types =====
export type CreateReviewType = z.infer<typeof CreateReviewSchema>;
export type UpdateReviewType = z.infer<typeof UpdateReviewSchema>;
export type QueryReviewType = z.infer<typeof QueryReviewSchema>;
export type UpdateReviewStatusType = z.infer<typeof UpdateReviewStatusSchema>;
export type ReviewVoteType = z.infer<typeof ReviewVoteSchema>;
