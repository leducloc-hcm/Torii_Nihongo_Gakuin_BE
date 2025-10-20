import { z } from 'zod'

// Create Payment Schema
export const CreatePaymentSchema = z.object({
  returnUrl: z.string().url().optional(),
  language: z.enum(['vn', 'en']).default('vn'),
  couponCode: z.string().optional(),
})

// VNPay Callback Schema
export const VNPayCallbackSchema = z.object({
  vnp_TmnCode: z.string(),
  vnp_Amount: z.string(),
  vnp_BankCode: z.string(),
  vnp_BankTranNo: z.string(),
  vnp_CardType: z.string(),
  vnp_PayDate: z.string(),
  vnp_OrderInfo: z.string(),
  vnp_TransactionNo: z.string(),
  vnp_ResponseCode: z.string(),
  vnp_TransactionStatus: z.string(),
  vnp_TxnRef: z.string(),
  vnp_SecureHashType: z.string(),
  vnp_SecureHash: z.string(),
})

// Payment Response Schema
export const PaymentResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  paymentId: z.string().optional(),
  paymentUrl: z.string().url().optional(),
  orderId: z.number().int().positive().optional(),
  totalAmount: z.number().int().min(0).optional(),
})

// Enrollment Info Schema
const EnrollmentInfoSchema = z.object({
  courseId: z.number().int().positive(),
  courseName: z.string(),
  expiresAt: z.coerce.date(),
})

// Payment Callback Response Schema
export const PaymentCallbackResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  orderId: z.number().int().positive().optional(),
  transactionId: z.string().optional(),
  enrollments: z.array(EnrollmentInfoSchema).optional(),
})

// TypeScript types
export type CreatePayment = z.infer<typeof CreatePaymentSchema>
export type VNPayCallback = z.infer<typeof VNPayCallbackSchema>
export type PaymentResponse = z.infer<typeof PaymentResponseSchema>
export type PaymentCallbackResponse = z.infer<typeof PaymentCallbackResponseSchema>
export type EnrollmentInfo = z.infer<typeof EnrollmentInfoSchema>
