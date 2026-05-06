import { z } from "zod";

// ===== Point Constants =====
export const ACTIVITY_POINTS: Record<string, number> = {
  ATTENDANCE: 10,
  HOMEWORK: 5,
  MOCK_TEST: 20,
  LESSON_COMPLETED: 10,
  COURSE_ENROLLED: 20,
  FLASHCARD_GENERATED: 5,
  QUIZ_COMPLETED: 15,
};

// XP required per level: level N requires N * 400 XP total
export function xpForLevel(level: number): number {
  return level * 400;
}

export function levelFromXp(totalXp: number): number {
  return Math.max(1, Math.floor(totalXp / 400) + 1);
}

// ===== Schemas =====
export const AddPointsBodySchema = z.object({
  userId: z.number().int().positive(),
  delta: z.number().int(),
  reason: z.string().min(1).max(255),
  meta: z.any().optional(),
});

export type AddPointsBodyType = z.infer<typeof AddPointsBodySchema>;

export const UserStatsSchema = z.object({
  userId: z.number(),
  totalXp: z.number(),
  totalCoins: z.number(),
  level: z.number(),
});

export type UserStatsType = z.infer<typeof UserStatsSchema>;

export const PointsHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PointsHistoryQueryType = z.infer<typeof PointsHistoryQuerySchema>;
