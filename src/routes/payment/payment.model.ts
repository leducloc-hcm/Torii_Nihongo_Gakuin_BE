import { z } from 'zod'

export const CreatePaymentSchema = z.object({
  couponCode: z.string().optional(),
})

export const PaymentResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  paymentId: z.string().optional(),
  paymentUrl: z.string().url().optional(),
  orderId: z.number().int().positive().optional(),
  totalAmount: z.number().int().min(0).optional(),
})

const EnrollmentInfoSchema = z.object({
  courseId: z.number().int().positive(),
  courseName: z.string(),
  expiresAt: z.coerce.date(),
})

export const PaymentCallbackResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  orderId: z.number().int().positive().optional(),
  transactionId: z.string().optional(),
  enrollments: z.array(EnrollmentInfoSchema).optional(),
})

export const SepayWebhookSchema = z.object({
  id: z.string(),
  gateway: z.string(),
  transactionDate: z.string(),
  accountNumber: z.string().optional(),
  code: z.string().optional(),
  content: z.string().optional(),
  transferType: z.enum(['in', 'out']),
  transferAmount: z.number(),
  accumulated: z.number(),
  subAccount: z.string().optional(),
  referenceCode: z.string().optional(),
  description: z.string(),
})

export const SepayPaymentResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  qrUrl: z.string().url().optional(),
  orderId: z.number().int().positive().optional(),
  amount: z.number().int().min(0).optional(),
  content: z.string().optional(),
})

// Buy Course Direct Schema (skip cart, buy immediately)
export const BuyCourseDirectSchema = z.object({
  courseId: z.coerce.number().int().positive({ message: 'Course ID must be positive' }),
  couponCode: z.string().optional(),
})

export type CreatePayment = z.infer<typeof CreatePaymentSchema>
export type PaymentResponse = z.infer<typeof PaymentResponseSchema>
export type PaymentCallbackResponse = z.infer<typeof PaymentCallbackResponseSchema>
export type EnrollmentInfo = z.infer<typeof EnrollmentInfoSchema>
export type SepayWebhook = z.infer<typeof SepayWebhookSchema>
export type SepayPaymentResponse = z.infer<typeof SepayPaymentResponseSchema>
export type BuyCourseDirect = z.infer<typeof BuyCourseDirectSchema>
