import { z } from "zod";

export const StreakSchema = z.object({
  userId: z.number(),
  current: z.number(),
  longest: z.number(),
  startDate: z.date(),
  lastDate: z.date(),
});

export type StreakType = z.infer<typeof StreakSchema>;
