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
  discountType: z.string().nullable().optional(),
  discountValue: z.number().nullable().optional(),
  maxDiscountAmount: z.number().nullable().optional(),
  applicableCourseIds: z.array(z.number()).optional(),
});

export type RewardType = z.infer<typeof RewardSchema>;

export const RedeemRewardSchema = z.object({
  rewardId: z.number().int().positive(),
});

export type RedeemRewardType = z.infer<typeof RedeemRewardSchema>;

const RewardBaseFields = {
  type: z.enum(["BADGE", "AVATAR_FRAME", "TITLE", "DISCOUNT"]),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().optional(),
  cost: z.number().int().min(0).default(0),
  stock: z.number().int().min(0).optional(),
  isActive: z.boolean().default(true),
  // Discount-specific
  discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]).optional(),
  discountValue: z.number().int().min(1).optional(),
  maxDiscountAmount: z.number().int().min(0).optional(),
  applicableCourseIds: z.array(z.number().int().positive()).optional(),
};

const discountRequiredRefine = (data: Record<string, unknown>) => {
  if (data.type === "DISCOUNT") {
    return !!data.discountType && !!data.discountValue;
  }
  return true;
};

const percentageLimitRefine = (data: Record<string, unknown>) => {
  if (
    data.type === "DISCOUNT" &&
    data.discountType === "PERCENTAGE" &&
    data.discountValue
  ) {
    return (data.discountValue as number) <= 100;
  }
  return true;
};

export const CreateRewardSchema = z
  .object(RewardBaseFields)
  .refine(discountRequiredRefine, {
    message: "discountType and discountValue are required for DISCOUNT rewards",
    path: ["discountType"],
  })
  .refine(percentageLimitRefine, {
    message: "Percentage discount cannot exceed 100%",
    path: ["discountValue"],
  });

export type CreateRewardInputType = z.infer<typeof CreateRewardSchema>;

export const UpdateRewardSchema = z
  .object(RewardBaseFields)
  .partial()
  .refine(
    (data) => {
      // Only validate discount fields if type is being set to DISCOUNT
      if (data.type === "DISCOUNT") {
        return !!data.discountType && !!data.discountValue;
      }
      return true;
    },
    {
      message:
        "discountType and discountValue are required for DISCOUNT rewards",
      path: ["discountType"],
    },
  )
  .refine(percentageLimitRefine, {
    message: "Percentage discount cannot exceed 100%",
    path: ["discountValue"],
  });

export type UpdateRewardInputType = z.infer<typeof UpdateRewardSchema>;
