// Coupon System Models with Zod Schemas

import { z } from 'zod'

// Enums
export enum CouponType {
  DISCOUNT_SINGLE = 'DISCOUNT_SINGLE',
  DISCOUNT_MULTI = 'DISCOUNT_MULTI',
  GIFT = 'GIFT',
}

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
}

export enum CouponStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
  REJECTED = 'REJECTED',
}

export enum RedemptionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PARTIALLY_COMPLETED = 'PARTIALLY_COMPLETED',
}

export enum CouponAuditAction {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  SUBMITTED_FOR_APPROVAL = 'SUBMITTED_FOR_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ACTIVATED = 'ACTIVATED',
  DEACTIVATED = 'DEACTIVATED',
  REDEEMED = 'REDEEMED',
}

// Base Coupon Schema
export const CouponSchema = z.object({
  id: z.number().int().positive(),
  code: z.string().min(1, 'Coupon code is required').max(50, 'Coupon code must be less than 50 characters'),
  title: z.string().min(1, 'Coupon title is required'),
  description: z.string().optional(),
  type: z.nativeEnum(CouponType),
  discountType: z.nativeEnum(DiscountType).optional(),
  discountValue: z.number().min(1).optional(),
  minOrderAmount: z.number().min(0).optional(),
  maxDiscountAmount: z.number().min(0).optional(),
  maxRedemptions: z.number().min(1).optional(),
  perUserLimit: z.number().min(1).optional(),
  newUsersOnly: z.boolean().default(false),
  requireFullCombo: z.boolean().default(false),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  status: z.nativeEnum(CouponStatus),
  createdBy: z.number().int().positive(),
  approvedBy: z.number().int().positive().optional(),
  rejectedBy: z.number().int().positive().optional(),
  approvalNote: z.string().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  giftMessage: z.string().optional(),
  extendDays: z.number().min(1).optional(),
})

// Create Coupon Schema
export const CreateCouponSchema = CouponSchema.omit({
  id: true,
  status: true,
  createdBy: true,
  approvedBy: true,
  rejectedBy: true,
  approvalNote: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  courseIds: z.array(z.number().int().positive()).min(1, 'At least one course is required'),
  courseRequiredFlags: z.array(z.boolean()).optional(),
})

// Update Coupon Schema
export const UpdateCouponSchema = CouponSchema.omit({
  id: true,
  code: true,
  type: true,
  status: true,
  createdBy: true,
  approvedBy: true,
  rejectedBy: true,
  approvalNote: true,
  createdAt: true,
  updatedAt: true,
})
  .partial()
  .extend({
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
    courseIds: z.array(z.number().int().positive()).optional(),
    courseRequiredFlags: z.array(z.boolean()).optional(),
  })

// Validate Coupon Schema
export const ValidateCouponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required'),
  courseIds: z.array(z.number().int().positive()).min(1, 'At least one course is required'),
  totalAmount: z.number().min(0, 'Total amount must be non-negative'),
})

// Redeem Gift Coupon Schema
export const RedeemGiftCouponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required'),
})

// Select Class for Gift Schema
export const SelectClassForGiftSchema = z.object({
  couponCode: z.string().min(1, 'Coupon code is required'),
  courseId: z.number().int().positive(),
  classId: z.number().int().positive(),
})

// Approval Action Schema
export const ApprovalActionSchema = z.object({
  action: z.enum(['approve', 'reject'], {
    required_error: 'Action must be either approve or reject',
  }),
  note: z.string().optional(),
})

// List Coupons Query Schema
export const ListCouponsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  type: z.nativeEnum(CouponType).optional(),
  status: z.nativeEnum(CouponStatus).optional(),
  search: z.string().optional(),
  createdBy: z.coerce.number().int().positive().optional(),
})

// Coupon Response Schema (with relations)
export const CouponResponseSchema = CouponSchema.extend({
  creator: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
  }),
  approver: z
    .object({
      id: z.number(),
      name: z.string(),
      email: z.string(),
    })
    .optional(),
  rejector: z
    .object({
      id: z.number(),
      name: z.string(),
      email: z.string(),
    })
    .optional(),
  courses: z.array(
    z.object({
      id: z.number(),
      couponId: z.number(),
      courseId: z.number(),
      required: z.boolean(),
      course: z.object({
        id: z.number(),
        title: z.string(),
        slug: z.string(),
        price: z.number(),
        courseType: z.string(),
        level: z.string(),
      }),
    }),
  ),
  usageStats: z
    .object({
      totalRedemptions: z.number(),
      remainingUses: z.number().optional(),
      isExpired: z.boolean(),
      isActive: z.boolean(),
    })
    .optional(),
})

// Coupon Validation Response Schema
export const CouponValidationResponseSchema = z.object({
  isValid: z.boolean(),
  error: z.string().optional(),
  discount: z
    .object({
      type: z.nativeEnum(DiscountType),
      value: z.number(),
      appliedAmount: z.number(),
      maxDiscountReached: z.boolean(),
    })
    .optional(),
  coupon: z
    .object({
      id: z.number(),
      code: z.string(),
      title: z.string(),
      type: z.nativeEnum(CouponType),
    })
    .optional(),
})

// Gift Redemption Response Schema
export const GiftRedemptionResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  enrolledCourses: z
    .array(
      z.object({
        courseId: z.number(),
        title: z.string(),
        action: z.enum(['enrolled', 'extended']),
        extensionDays: z.number().optional(),
      }),
    )
    .optional(),
  pendingClassSelections: z
    .array(
      z.object({
        courseId: z.number(),
        title: z.string(),
        availableClasses: z.array(
          z.object({
            id: z.number(),
            name: z.string(),
            startDate: z.coerce.date(),
            endDate: z.coerce.date(),
            instructor: z.string(),
          }),
        ),
      }),
    )
    .optional(),
  giftMessage: z.string().optional(),
})

// Paginated Coupons Response Schema
export const PaginatedCouponsResponseSchema = z.object({
  data: z.array(CouponResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
})

// Repository input/output types
export type CouponCreateInput = {
  code: string
  title: string
  description?: string
  type: CouponType
  discountType?: DiscountType
  discountValue?: number
  minOrderAmount?: number
  maxDiscountAmount?: number
  maxRedemptions?: number
  perUserLimit?: number
  newUsersOnly?: boolean
  requireFullCombo?: boolean
  startsAt?: Date
  endsAt?: Date
  giftMessage?: string
  extendDays?: number
  status: CouponStatus
  creator: {
    connect: {
      id: number
    }
  }
  courses: {
    create: Array<{
      courseId: number
      required: boolean
    }>
  }
}

export type CouponUpdateInput = {
  title?: string
  description?: string
  discountValue?: number
  minOrderAmount?: number
  maxDiscountAmount?: number
  maxRedemptions?: number
  perUserLimit?: number
  newUsersOnly?: boolean
  requireFullCombo?: boolean
  startsAt?: Date
  endsAt?: Date
  giftMessage?: string
  extendDays?: number
  status?: CouponStatus
  approvedBy?: number
  rejectedBy?: number
  approvalNote?: string
  courses?: {
    deleteMany: object
    create: Array<{
      courseId: number
      required: boolean
    }>
  }
}

export type CouponWhereUniqueInput = {
  id?: number
  code?: string
}

export type CouponWhereInput = {
  id?: number | { not: number }
  code?: string | { contains: string; mode: 'insensitive' }
  title?: { contains: string; mode: 'insensitive' }
  type?: CouponType
  status?: CouponStatus
  createdBy?: number
  startsAt?: { gte?: Date; lte?: Date }
  endsAt?: { gte?: Date; lte?: Date }
  OR?: Array<{
    code?: { contains: string; mode: 'insensitive' }
    title?: { contains: string; mode: 'insensitive' }
  }>
}

export type CouponOrderByInput = {
  id?: 'asc' | 'desc'
  code?: 'asc' | 'desc'
  title?: 'asc' | 'desc'
  createdAt?: 'asc' | 'desc'
  updatedAt?: 'asc' | 'desc'
}

export type CouponWithRelations = {
  id: number
  code: string
  title: string
  description?: string
  type: CouponType
  discountType?: DiscountType
  discountValue?: number
  minOrderAmount?: number
  maxDiscountAmount?: number
  maxRedemptions?: number
  perUserLimit?: number
  newUsersOnly: boolean
  requireFullCombo: boolean
  startsAt?: Date
  endsAt?: Date
  status: CouponStatus
  createdBy: number
  approvedBy?: number
  rejectedBy?: number
  approvalNote?: string
  createdAt: Date
  updatedAt: Date
  giftMessage?: string
  extendDays?: number
  // Gift purchase fields
  purchasedBy?: number | null
  purchaseOrderId?: number | null
  recipientEmail?: string | null
  recipientName?: string | null
  purchasedAt?: Date | null
  isGiftPurchase: boolean
  creator: { id: number; name: string; email: string }
  approver?: { id: number; name: string; email: string }
  rejector?: { id: number; name: string; email: string }
  purchaser?: { id: number; name: string; email: string }
  courses: Array<{
    id: number
    couponId: number
    courseId: number
    required: boolean
    course: {
      id: number
      title: string
      slug: string
      price: number
      courseType: string
      level: string
    }
  }>
  redemptions?: Array<{ id: number; userId: number }>
}

export type CouponRedemptionCreateInput = {
  coupon: {
    connect: {
      id: number
    }
  }
  user: {
    connect: {
      id: number
    }
  }
  orderId?: number
  discountApplied?: number
  giftedCourses?: any
  pendingClassSelections?: number[]
  status: RedemptionStatus
  completedAt?: Date
}

export type CouponRedemptionUpdateInput = {
  orderId?: number
  discountApplied?: number
  giftedCourses?: any
  pendingClassSelections?: number[]
  status?: RedemptionStatus
  completedAt?: Date
}

export type CouponAuditLogCreateInput = {
  coupon: {
    connect: {
      id: number
    }
  }
  user: {
    connect: {
      id: number
    }
  }
  action: CouponAuditAction
  oldValues?: string
  newValues?: string
  note?: string
}

// Results and Validation types
export type CouponValidationResult = {
  isValid: boolean
  errors: string[]
  discount?: {
    type: DiscountType
    value: number
    appliedAmount: number
    maxDiscountReached?: boolean
  }
  requiresCombo?: boolean
  missingCourses?: number[]
}

export type GiftRedemptionResult = {
  success: boolean
  message: string
  enrolledCourses: Array<{
    courseId: number
    title: string
    action: 'enrolled' | 'extended'
    extendedDays?: number
  }>
  pendingClassSelections: Array<{
    courseId: number
    title: string
    availableClasses: Array<{
      id: number
      title: string
      description?: string
      capacity: number
      availableSlots: number
    }>
  }>
}

// Exported Zod types
export type CreateCouponType = z.infer<typeof CreateCouponSchema>
export type Coupon = z.infer<typeof CouponSchema>
export type UpdateCouponType = z.infer<typeof UpdateCouponSchema>
export type ValidateCouponType = z.infer<typeof ValidateCouponSchema>
export type RedeemGiftCouponType = z.infer<typeof RedeemGiftCouponSchema>
export type SelectClassForGiftType = z.infer<typeof SelectClassForGiftSchema>
export type ApprovalActionType = z.infer<typeof ApprovalActionSchema>
export type ListCouponsQueryType = z.infer<typeof ListCouponsQuerySchema>
export type CouponResponseType = z.infer<typeof CouponResponseSchema>
export type CouponValidationResponseType = z.infer<typeof CouponValidationResponseSchema>
export type GiftRedemptionResponseType = z.infer<typeof GiftRedemptionResponseSchema>
export type PaginatedCouponsResponseType = z.infer<typeof PaginatedCouponsResponseSchema>

// ===== Gift Purchase Schemas =====

export const PurchaseGiftCouponSchema = z.object({
  courseIds: z.array(z.number().int().positive()).min(1, 'At least one course is required'),
  giftMessage: z.string().max(500).optional(),
  recipientEmail: z.string().email().optional(),
  recipientName: z.string().max(100).optional(),
})

export const GiftPurchaseResponseSchema = z.object({
  couponId: z.number().int().positive(),
  code: z.string(),
  status: z.nativeEnum(CouponStatus),
  purchasedAt: z.string(),
  totalAmount: z.number().int().min(0),
  courses: z.array(
    z.object({
      id: z.number().int().positive(),
      title: z.string(),
      price: z.number().int().min(0),
    }),
  ),
  recipientEmail: z.string().email().optional(),
  recipientName: z.string().optional(),
  giftMessage: z.string().optional(),
})

export type PurchaseGiftCouponType = z.infer<typeof PurchaseGiftCouponSchema>
export type GiftPurchaseResponseType = z.infer<typeof GiftPurchaseResponseSchema>
