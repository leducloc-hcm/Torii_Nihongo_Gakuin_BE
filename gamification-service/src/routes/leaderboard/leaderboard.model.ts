import { z } from "zod";

export const LeaderboardQuerySchema = z.object({
  period: z.enum(["WEEKLY", "MONTHLY"]).default("WEEKLY"),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type LeaderboardQueryType = z.infer<typeof LeaderboardQuerySchema>;

export const LeaderboardEntrySchema = z.object({
  userId: z.number(),
  xp: z.number(),
  rank: z.number(),
});

export type LeaderboardEntryType = z.infer<typeof LeaderboardEntrySchema>;

export function getCurrentPeriodKey(period: "WEEKLY" | "MONTHLY"): string {
  const now = new Date();
  if (period === "MONTHLY") {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }
  // ISO week calculation
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - jan1.getTime()) / 86400000);
  const week = Math.ceil((days + jan1.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function getRedisLeaderboardKey(
  period: "WEEKLY" | "MONTHLY",
  periodKey: string,
): string {
  return `gamification:leaderboard:${period.toLowerCase()}:${periodKey}`;
}
