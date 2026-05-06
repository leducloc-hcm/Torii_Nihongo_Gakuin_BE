import { z } from "zod";

export const SeasonalEventSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  multiplier: z.number(),
  bonusCoins: z.number(),
  startDate: z.date(),
  endDate: z.date(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type SeasonalEventType = z.infer<typeof SeasonalEventSchema>;

export const CreateSeasonalEventSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  multiplier: z.number().min(1).max(5).default(1.0),
  bonusCoins: z.number().int().min(0).default(0),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isActive: z.boolean().default(true),
});

export type CreateSeasonalEventType = z.infer<typeof CreateSeasonalEventSchema>;

export const UpdateSeasonalEventSchema = CreateSeasonalEventSchema.partial();
export type UpdateSeasonalEventType = z.infer<typeof UpdateSeasonalEventSchema>;

/**
 * Strict input type for Prisma create — required fields are non-optional.
 * Derived from CreateSeasonalEventType but enforces name, startDate, endDate.
 */
export type CreateSeasonalEventInput = {
  name: string;
  startDate: Date;
  endDate: Date;
  description?: string;
  multiplier?: number;
  bonusCoins?: number;
  isActive?: boolean;
};
