// Coupon System DTOs using Zod

import { createZodDto } from 'nestjs-zod'
import {
  CreateCouponSchema,
  UpdateCouponSchema,
  ValidateCouponSchema,
  RedeemGiftCouponSchema,
  SelectClassForGiftSchema,
  ApprovalActionSchema,
  ListCouponsQuerySchema,
  CouponResponseSchema,
  CouponValidationResponseSchema,
  GiftRedemptionResponseSchema,
  PaginatedCouponsResponseSchema,
  PurchaseGiftCouponSchema,
  GiftPurchaseResponseSchema,
  CouponType,
  DiscountType,
} from './coupon.model'

// DTO Classes created from Zod schemas
export class CreateCouponDTO extends createZodDto(CreateCouponSchema) {}
export class UpdateCouponDTO extends createZodDto(UpdateCouponSchema) {}
export class ValidateCouponDTO extends createZodDto(ValidateCouponSchema) {}
export class RedeemGiftCouponDTO extends createZodDto(RedeemGiftCouponSchema) {}
export class SelectClassForGiftDTO extends createZodDto(SelectClassForGiftSchema) {}
export class ApprovalActionDTO extends createZodDto(ApprovalActionSchema) {}
export class ListCouponsQueryDTO extends createZodDto(ListCouponsQuerySchema) {}
export class CouponResponseDTO extends createZodDto(CouponResponseSchema) {}
export class CouponValidationResponseDTO extends createZodDto(CouponValidationResponseSchema) {}
export class GiftRedemptionResponseDTO extends createZodDto(GiftRedemptionResponseSchema) {}
export class PaginatedCouponsResponseDTO extends createZodDto(PaginatedCouponsResponseSchema) {}

// Gift Purchase DTOs
export class PurchaseGiftCouponDTO extends createZodDto(PurchaseGiftCouponSchema) {}
export class GiftPurchaseResponseDTO extends createZodDto(GiftPurchaseResponseSchema) {}

// Validation schemas for custom validations
export const CouponValidationRules = {
  validateDiscountCoupon: (data: any) => {
    if (data.type !== CouponType.GIFT && (!data.discountType || !data.discountValue)) {
      throw new Error('Discount type and value are required for discount coupons')
    }

    if (data.discountType === DiscountType.PERCENTAGE && data.discountValue > 100) {
      throw new Error('Percentage discount cannot exceed 100%')
    }

    return true
  },

  validateGiftCoupon: (data: any) => {
    if (data.type === CouponType.GIFT && (data.discountType || data.discountValue)) {
      throw new Error('Gift coupons cannot have discount type or value')
    }

    return true
  },

  validateDateRange: (data: any) => {
    if (data.startsAt && data.endsAt) {
      const startDate = new Date(data.startsAt)
      const endDate = new Date(data.endsAt)

      if (startDate >= endDate) {
        throw new Error('Start date must be before end date')
      }
    }

    return true
  },

  validateComboRequirements: (data: any) => {
    if (data.requireFullCombo && data.courseRequiredFlags) {
      if (data.courseRequiredFlags.length !== data.courseIds.length) {
        throw new Error('Course required flags must match the number of courses')
      }
    }

    return true
  },
}
