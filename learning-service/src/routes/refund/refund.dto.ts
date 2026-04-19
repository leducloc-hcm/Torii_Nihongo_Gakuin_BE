import { z } from "zod";

export const CreateRefundRequestSchema = z.object({
  orderId: z.number().int().positive(),
  courseId: z.number().int().positive(),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
  bankAccountName: z.string().min(2, "Bank account name is required"),
  bankAccountNumber: z.string().min(5, "Bank account number is required"),
  bankName: z.string().min(2, "Bank name is required"),
});

export const ApproveRefundSchema = z.object({
  approvalEvidence: z
    .string()
    .min(1, "Bank transfer evidence (image URL) is required"),
});

export const RejectRefundSchema = z.object({
  rejectionReason: z
    .string()
    .min(10, "Rejection reason must be at least 10 characters"),
  rejectionEvidence: z
    .string()
    .min(1, "Evidence (image URL) is required")
    .optional(),
});

export const QueryRefundSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  userId: z.coerce.number().int().positive().optional(),
});

export type CreateRefundRequestDTO = z.infer<typeof CreateRefundRequestSchema>;
export type ApproveRefundDTO = z.infer<typeof ApproveRefundSchema>;
export type RejectRefundDTO = z.infer<typeof RejectRefundSchema>;
export type QueryRefundDTO = z.infer<typeof QueryRefundSchema>;
