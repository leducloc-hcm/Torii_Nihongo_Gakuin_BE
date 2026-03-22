import { z } from "zod";

export const RewardSchema = z.object({
  id: z.number(),
  type: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  cost: z.number(),
  stock: z.number().nullable(),
  imageUrl: z.string().nullable(),
  isActive: z.boolean(),
});

export type RewardType = z.infer<typeof RewardSchema>;

export const RedeemRewardSchema = z.object({
  rewardId: z.number().int().positive(),
});

export type RedeemRewardType = z.infer<typeof RedeemRewardSchema>;
