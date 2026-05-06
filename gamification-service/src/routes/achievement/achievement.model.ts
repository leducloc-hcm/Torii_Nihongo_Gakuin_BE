import { z } from "zod";

export const AchievementSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  icon: z.string().nullable(),
  symbol: z.string().nullable(),
  conditionType: z.string(),
  conditionValue: z.number(),
  rewardCoins: z.number(),
  rewardXp: z.number(),
  rarity: z.string(),
  category: z.string().nullable(),
});

export type AchievementType = z.infer<typeof AchievementSchema>;

export const UserAchievementSchema = z.object({
  id: z.number(),
  userId: z.number(),
  achievementId: z.number(),
  unlockedAt: z.date(),
  achievement: AchievementSchema,
});

export type UserAchievementType = z.infer<typeof UserAchievementSchema>;

export const CreateAchievementSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  icon: z.string().optional(),
  symbol: z.string().optional(),
  conditionType: z.enum([
    "KANJI",
    "STREAK",
    "LISTENING",
    "LESSONS_COMPLETED",
    "COURSES_ENROLLED",
    "QUIZZES_PASSED",
    "TOTAL_XP",
    "LOGIN_DAYS",
  ]),
  conditionValue: z.number().int().positive(),
  rewardCoins: z.number().int().min(0).default(0),
  rewardXp: z.number().int().min(0).default(0),
  rarity: z.enum(["COMMON", "UNCOMMON", "RARE", "LEGENDARY"]).default("COMMON"),
  category: z.string().optional(),
});

export type CreateAchievementType = z.infer<typeof CreateAchievementSchema>;

export const UpdateAchievementSchema = CreateAchievementSchema.partial();
export type UpdateAchievementType = z.infer<typeof UpdateAchievementSchema>;
