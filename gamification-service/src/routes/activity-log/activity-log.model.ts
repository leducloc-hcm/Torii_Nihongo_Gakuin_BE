import { z } from "zod";

export const ActivityLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z
    .enum([
      "ATTENDANCE",
      "HOMEWORK",
      "MOCK_TEST",
      "LESSON_COMPLETED",
      "COURSE_ENROLLED",
      "FLASHCARD_GENERATED",
      "QUIZ_COMPLETED",
    ])
    .optional(),
});

export type ActivityLogQueryType = z.infer<typeof ActivityLogQuerySchema>;
