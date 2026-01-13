// Coupon Service

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common'
import { CouponRepository } from './coupon.repo'
import { CourseRepository } from '../course/course.repo'
import { EnrollmentRepository } from '../enrollment/enrollment.repo'
import {
  CreateCouponDTO,
  UpdateCouponDTO,
  ValidateCouponDTO,
  RedeemGiftCouponDTO,
  SelectClassForGiftDTO,
  ApprovalActionDTO,
  ListCouponsQueryDTO,
  PurchaseGiftCouponDTO,
  GiftPurchaseResponseDTO,
} from './coupon.dto'
import {
  CouponType,
  DiscountType,
  CouponStatus,
  RedemptionStatus,
  CouponAuditAction,
  CouponValidationResult,
  GiftRedemptionResult,
} from './coupon.model'

@Injectable()
export class CouponService {
  private readonly logger = new Logger(CouponService.name)

  constructor(
    private readonly couponRepository: CouponRepository,
    private readonly courseRepository: CourseRepository,
    private readonly enrollmentRepository: EnrollmentRepository,
  ) {}

  // ===== CRUD Operations =====

  async createCoupon(createDto: CreateCouponDTO, createdBy: number) {
    // Validate user ID
    if (!createdBy || typeof createdBy !== 'number') {
      throw new BadRequestException('Invalid user ID. User must be authenticated.')
    }

    // Validate coupon code uniqueness
    const existingCoupon = await this.couponRepository.checkCouponExists(createDto.code)
    if (existingCoupon) {
      throw new ConflictException('Coupon code already exists')
    }

    // Validate discount type for discount coupons
    if (createDto.type !== CouponType.GIFT) {
      if (!createDto.discountType || !createDto.discountValue) {
        throw new BadRequestException('Discount type and value are required for discount coupons')
      }

      if (createDto.discountType === DiscountType.PERCENTAGE && createDto.discountValue > 100) {
        throw new BadRequestException('Percentage discount cannot exceed 100%')
      }
    }

    // Validate courses exist
    const courses = await this.courseRepository.findByIds(createDto.courseIds)
    if (courses.length !== createDto.courseIds.length) {
      throw new BadRequestException('One or more courses not found')
    }

    // Validate date range
    if (createDto.startsAt && createDto.endsAt) {
      const startDate = new Date(createDto.startsAt)
      const endDate = new Date(createDto.endsAt)
      if (startDate >= endDate) {
        throw new BadRequestException('Start date must be before end date')
      }
    }

    const coupon = await this.couponRepository.create({
      code: createDto.code,
      title: createDto.title,
      description: createDto.description,
      type: createDto.type,
      discountType: createDto.discountType || null,
      discountValue: createDto.discountValue ? Math.floor(createDto.discountValue) : null,
      minOrderAmount: createDto.minOrderAmount ? Math.floor(createDto.minOrderAmount) : null,
      maxDiscountAmount: createDto.maxDiscountAmount ? Math.floor(createDto.maxDiscountAmount) : null,
      maxRedemptions: createDto.maxRedemptions || null,
      perUserLimit: createDto.perUserLimit || null,
      newUsersOnly: createDto.newUsersOnly || false,
      requireFullCombo: createDto.requireFullCombo || false,
      startsAt: createDto.startsAt ? new Date(createDto.startsAt) : null,
      endsAt: createDto.endsAt ? new Date(createDto.endsAt) : null,
      giftMessage: createDto.giftMessage || null,
      extendDays: createDto.extendDays || 30,
      status: CouponStatus.DRAFT,
      creator: { connect: { id: createdBy } },
      courses: {
        create: createDto.courseIds.map((courseId, index) => ({
          courseId,
          required: createDto.courseRequiredFlags?.[index] ?? true,
        })),
      },
    })

    await this.createAuditLog(coupon.id, createdBy, CouponAuditAction.CREATED, null, coupon)

    this.logger.log(`Coupon ${coupon.code} created by user ${createdBy}`)
    return coupon
  }

  async getCoupon(id: number) {
    const coupon = await this.couponRepository.findById(id)
    if (!coupon) {
      throw new NotFoundException('Coupon not found')
    }

    const stats = await this.couponRepository.getRedemptionStats(id)
    const totalRedemptions = Object.values(stats).reduce((sum: number, count: number) => sum + count, 0)

    return {
      ...coupon,
      usageStats: {
        totalRedemptions,
        remainingUses: coupon.maxRedemptions ? coupon.maxRedemptions - totalRedemptions : undefined,
        isExpired: coupon.endsAt ? new Date() > coupon.endsAt : false,
        isActive: coupon.status === CouponStatus.ACTIVE,
      },
    }
  }

  async listCoupons(query: ListCouponsQueryDTO) {
    return this.couponRepository.findMany(query)
  }

  async updateCoupon(id: number, updateDto: UpdateCouponDTO, updatedBy: number) {
    const existingCoupon = await this.couponRepository.findById(id)
    if (!existingCoupon) {
      throw new NotFoundException('Coupon not found')
    }

    // Only allow updates if coupon is in DRAFT status
    if (existingCoupon.status !== CouponStatus.DRAFT) {
      throw new BadRequestException('Only draft coupons can be updated')
    }

    // Validate discount value if provided
    if (
      updateDto.discountValue &&
      existingCoupon.discountType === DiscountType.PERCENTAGE &&
      updateDto.discountValue > 100
    ) {
      throw new BadRequestException('Percentage discount cannot exceed 100%')
    }

    // Validate date range
    if (updateDto.startsAt || updateDto.endsAt) {
      const startDate = updateDto.startsAt ? new Date(updateDto.startsAt) : existingCoupon.startsAt
      const endDate = updateDto.endsAt ? new Date(updateDto.endsAt) : existingCoupon.endsAt
      if (startDate && endDate && startDate >= endDate) {
        throw new BadRequestException('Start date must be before end date')
      }
    }

    const updateData: any = { ...updateDto }
    delete updateData.courseIds
    delete updateData.courseRequiredFlags

    if (updateDto.startsAt) updateData.startsAt = new Date(updateDto.startsAt)
    if (updateDto.endsAt) updateData.endsAt = new Date(updateDto.endsAt)

    // Handle course updates
    if (updateDto.courseIds) {
      const courses = await this.courseRepository.findByIds(updateDto.courseIds)
      if (courses.length !== updateDto.courseIds.length) {
        throw new BadRequestException('One or more courses not found')
      }

      updateData.courses = {
        deleteMany: {},
        create: updateDto.courseIds.map((courseId, index) => ({
          courseId,
          required: updateDto.courseRequiredFlags?.[index] ?? true,
        })),
      }
    }

    const updatedCoupon = await this.couponRepository.update(id, updateData)

    await this.createAuditLog(id, updatedBy, CouponAuditAction.UPDATED, existingCoupon, updatedCoupon)

    this.logger.log(`Coupon ${existingCoupon.code} updated by user ${updatedBy}`)
    return updatedCoupon
  }

  async deleteCoupon(id: number, deletedBy: number) {
    const coupon = await this.couponRepository.findById(id)
    if (!coupon) {
      throw new NotFoundException('Coupon not found')
    }

    // Only allow deletion if coupon has no redemptions
    if (coupon.redemptions && coupon.redemptions.length > 0) {
      throw new BadRequestException('Cannot delete coupon with existing redemptions')
    }

    await this.couponRepository.delete(id)

    this.logger.log(`Coupon ${coupon.code} deleted by user ${deletedBy}`)
    return { message: 'Coupon deleted successfully' }
  }

  // ===== Approval Workflow =====

  async submitForApproval(id: number, submittedBy: number) {
    const coupon = await this.couponRepository.findById(id)
    if (!coupon) {
      throw new NotFoundException('Coupon not found')
    }

    if (coupon.status !== CouponStatus.DRAFT) {
      throw new BadRequestException('Only draft coupons can be submitted for approval')
    }

    const updatedCoupon = await this.couponRepository.update(id, {
      status: CouponStatus.PENDING_APPROVAL,
    })

    await this.createAuditLog(id, submittedBy, CouponAuditAction.SUBMITTED_FOR_APPROVAL, coupon, updatedCoupon)

    this.logger.log(`Coupon ${coupon.code} submitted for approval by user ${submittedBy}`)
    return updatedCoupon
  }

  async approveOrRejectCoupon(id: number, approvalDto: ApprovalActionDTO, actionBy: number) {
    const coupon = await this.couponRepository.findById(id)
    if (!coupon) {
      throw new NotFoundException('Coupon not found')
    }

    if (coupon.status !== CouponStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Only pending coupons can be approved or rejected')
    }

    const isApproval = approvalDto.action === 'approve'
    const updateData = {
      status: isApproval ? CouponStatus.APPROVED : CouponStatus.REJECTED,
      approvalNote: approvalDto.note,
      ...(isApproval ? { approvedBy: actionBy } : { rejectedBy: actionBy }),
    }

    const updatedCoupon = await this.couponRepository.update(id, updateData)

    const auditAction = isApproval ? CouponAuditAction.APPROVED : CouponAuditAction.REJECTED
    await this.createAuditLog(id, actionBy, auditAction, coupon, updatedCoupon)

    this.logger.log(`Coupon ${coupon.code} ${approvalDto.action}d by user ${actionBy}`)
    return updatedCoupon
  }

  async getPendingApprovals() {
    return this.couponRepository.getPendingApprovalCoupons()
  }

  // ===== Coupon Activation/Deactivation =====

  async toggleCouponStatus(id: number, actionBy: number) {
    const coupon = await this.couponRepository.findById(id)
    if (!coupon) {
      throw new NotFoundException('Coupon not found')
    }

    if (
      coupon.status !== CouponStatus.APPROVED &&
      coupon.status !== CouponStatus.ACTIVE &&
      coupon.status !== CouponStatus.INACTIVE
    ) {
      throw new BadRequestException('Only approved coupons can be activated/deactivated')
    }

    const newStatus = coupon.status === CouponStatus.ACTIVE ? CouponStatus.INACTIVE : CouponStatus.ACTIVE
    const updatedCoupon = await this.couponRepository.update(id, { status: newStatus })

    const auditAction = newStatus === CouponStatus.ACTIVE ? CouponAuditAction.ACTIVATED : CouponAuditAction.DEACTIVATED
    await this.createAuditLog(id, actionBy, auditAction, coupon, updatedCoupon)

    this.logger.log(`Coupon ${coupon.code} ${newStatus.toLowerCase()} by user ${actionBy}`)
    return updatedCoupon
  }

  // ===== Validation =====

  async validateCoupon(validationDto: ValidateCouponDTO, userId: number): Promise<CouponValidationResult> {
    const coupon = await this.couponRepository.findByCode(validationDto.code)

    if (!coupon) {
      return { isValid: false, errors: ['Coupon not found'] }
    }

    const errors: string[] = []

    // Check status
    if (coupon.status !== CouponStatus.ACTIVE) {
      errors.push('Coupon is not active')
    }

    // Check date range
    const now = new Date()
    if (coupon.startsAt && now < coupon.startsAt) {
      errors.push('Coupon is not yet valid')
    }
    if (coupon.endsAt && now > coupon.endsAt) {
      errors.push('Coupon has expired')
    }

    // Check usage limits
    const totalRedemptions = coupon.redemptions?.length || 0
    if (coupon.maxRedemptions && totalRedemptions >= coupon.maxRedemptions) {
      errors.push('Coupon usage limit reached')
    }

    // Check per-user limit
    if (coupon.perUserLimit) {
      const userRedemptions = await this.couponRepository.getUserRedemptionCount(coupon.id, userId)
      if (userRedemptions >= coupon.perUserLimit) {
        errors.push('You have reached the usage limit for this coupon')
      }
    }

    // Check new users only
    if (coupon.newUsersOnly) {
      // Implementation depends on how you define "new user"
      // This is a placeholder - you might check enrollment count, registration date, etc.
    }

    // Check minimum order amount
    if (coupon.minOrderAmount && validationDto.totalAmount < coupon.minOrderAmount) {
      errors.push(`Minimum order amount of $${coupon.minOrderAmount / 100} required`)
    }

    // Check course eligibility and combo requirements
    const couponCourseIds = coupon.courses.map((cc) => cc.courseId)
    const userCourseIds = validationDto.courseIds

    // Check if any eligible courses are in the cart
    const eligibleCoursesInCart = userCourseIds.filter((id) => couponCourseIds.includes(id))
    if (eligibleCoursesInCart.length === 0) {
      errors.push('No eligible courses in cart')
    }

    // Check combo requirements for DISCOUNT_MULTI
    if (coupon.type === CouponType.DISCOUNT_MULTI && coupon.requireFullCombo) {
      const requiredCourseIds = coupon.courses.filter((cc) => cc.required).map((cc) => cc.courseId)
      const missingRequiredCourses = requiredCourseIds.filter((id) => !userCourseIds.includes(id))

      if (missingRequiredCourses.length > 0) {
        errors.push('All required courses must be in cart for this coupon')
        return {
          isValid: false,
          errors,
          requiresCombo: true,
          missingCourses: missingRequiredCourses,
        }
      }
    }

    if (errors.length > 0) {
      return { isValid: false, errors }
    }

    // Calculate discount
    let discount
    if (coupon.type !== CouponType.GIFT && coupon.discountType && coupon.discountValue) {
      const eligibleAmount = this.calculateEligibleAmount(eligibleCoursesInCart, coupon.courses)
      const discountAmount = this.calculateDiscountAmount(
        eligibleAmount,
        coupon.discountType as any,
        coupon.discountValue,
        coupon.maxDiscountAmount || undefined,
      )

      discount = {
        type: coupon.discountType as any,
        value: coupon.discountValue,
        appliedAmount: discountAmount,
        maxDiscountReached: coupon.maxDiscountAmount ? discountAmount >= coupon.maxDiscountAmount : false,
      }
    }

    return {
      isValid: true,
      errors: [],
      discount,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        title: coupon.title,
        type: coupon.type,
      },
    }
  }

  // ===== Gift Coupon Redemption =====

  async redeemGiftCoupon(redeemDto: RedeemGiftCouponDTO, userId: number): Promise<GiftRedemptionResult> {
    const coupon = await this.couponRepository.findByCode(redeemDto.code)

    if (!coupon) {
      throw new NotFoundException('Gift coupon not found')
    }

    if (coupon.type !== CouponType.GIFT) {
      throw new BadRequestException('This is not a gift coupon')
    }

    // Validate coupon like a regular validation but for gifts
    const validation = await this.validateCoupon(
      {
        code: redeemDto.code,
        courseIds: coupon.courses.map((cc) => cc.courseId),
        totalAmount: 0,
      },
      userId,
    )

    if (!validation.isValid) {
      throw new BadRequestException(validation.errors.join(', '))
    }

    // Check if user already redeemed this coupon
    const existingRedemption = await this.couponRepository.findRedemption(coupon.id, userId)
    if (existingRedemption) {
      throw new ConflictException('You have already redeemed this gift coupon')
    }

    const enrolledCourses: any[] = []
    const pendingClassSelections: any[] = []

    // Process each course in the gift
    for (const couponCourse of coupon.courses) {
      const course = couponCourse.course
      const existingEnrollment = await this.enrollmentRepository.findByUserAndCourse(userId, course.id)

      if (existingEnrollment) {
        // Handle existing enrollment
        if (course.courseType === 'VIDEO_QUIZ') {
          // Extend expiry date
          const extendDays = coupon.extendDays || 30
          const newExpiryDate = new Date()
          newExpiryDate.setDate(newExpiryDate.getDate() + extendDays)

          await this.enrollmentRepository.update({
            where: { id: existingEnrollment.id },
            data: { expiresAt: newExpiryDate },
          })

          enrolledCourses.push({
            courseId: course.id,
            title: course.title,
            action: 'extended',
            extendedDays: extendDays,
          })
        } else {
          // For live courses, user already has access
          enrolledCourses.push({
            courseId: course.id,
            title: course.title,
            action: 'enrolled', // already enrolled
          })
        }
      } else {
        // New enrollment
        if (course.courseType === 'VIDEO_QUIZ' || course.courseType === 'VIDEO_QUIZ_LIVE') {
          // Direct enrollment for video courses
          const expiryDate = new Date()
          expiryDate.setDate(expiryDate.getDate() + (coupon.extendDays || 30))

          await this.enrollmentRepository.create({
            userId,
            courseId: course.id,
            courseType: course.courseType,
            expiresAt: expiryDate,
          })

          enrolledCourses.push({
            courseId: course.id,
            title: course.title,
            action: 'enrolled',
          })
        } else {
          // Live courses require class selection
          const availableClasses = this.getAvailableClassesForCourse(course.id)

          if (availableClasses.length === 0) {
            throw new BadRequestException(`No available classes for course: ${course.title}`)
          }

          pendingClassSelections.push({
            courseId: course.id,
            title: course.title,
            availableClasses,
          })
        }
      }
    }

    // Create redemption record
    const redemptionStatus =
      pendingClassSelections.length > 0 ? RedemptionStatus.PARTIALLY_COMPLETED : RedemptionStatus.COMPLETED

    const redemption = await this.couponRepository.createRedemption({
      coupon: { connect: { id: coupon.id } },
      user: { connect: { id: userId } },
      giftedCourses: enrolledCourses,
      pendingClassSelections: pendingClassSelections.map((p) => p.courseId),
      status: redemptionStatus,
      completedAt: redemptionStatus === RedemptionStatus.COMPLETED ? new Date() : undefined,
    })

    await this.createAuditLog(coupon.id, userId, CouponAuditAction.REDEEMED, null, { redemptionId: redemption.id })

    this.logger.log(`Gift coupon ${coupon.code} redeemed by user ${userId}`)

    return {
      success: true,
      message:
        pendingClassSelections.length > 0
          ? 'Gift partially redeemed. Please select classes for live courses.'
          : 'Gift successfully redeemed!',
      enrolledCourses,
      pendingClassSelections,
    }
  }

  async selectClassForGift(selectDto: SelectClassForGiftDTO, userId: number) {
    const coupon = await this.couponRepository.findByCode(selectDto.couponCode)
    if (!coupon) {
      throw new NotFoundException('Coupon not found')
    }

    const redemption = await this.couponRepository.findRedemption(coupon.id, userId)
    if (!redemption) {
      throw new NotFoundException('No redemption found for this coupon')
    }

    if (!redemption.pendingClassSelections.includes(selectDto.courseId)) {
      throw new BadRequestException('Course is not pending class selection')
    }

    // Validate class exists and has capacity
    const classExists = this.validateClassSelection(selectDto.courseId, selectDto.classId)
    if (!classExists) {
      throw new BadRequestException('Invalid class selection')
    }

    // Create enrollment
    await this.enrollmentRepository.create({
      userId,
      courseId: selectDto.courseId,
      courseType: 'LIVE_ONLY',
    })

    // Update redemption
    const updatedPendingClasses = redemption.pendingClassSelections.filter((id) => id !== selectDto.courseId)
    const newStatus =
      updatedPendingClasses.length === 0 ? RedemptionStatus.COMPLETED : RedemptionStatus.PARTIALLY_COMPLETED

    await this.couponRepository.updateRedemption(redemption.id, {
      pendingClassSelections: updatedPendingClasses,
      status: newStatus,
      completedAt: newStatus === RedemptionStatus.COMPLETED ? new Date() : undefined,
    })

    this.logger.log(`Class ${selectDto.classId} selected for course ${selectDto.courseId} by user ${userId}`)

    return {
      success: true,
      message: 'Class selection completed',
      remainingSelections: updatedPendingClasses.length,
    }
  }

  // ===== User Redemption History =====

  async getUserRedemptions(userId: number, params: { page?: number; limit?: number } = {}) {
    return this.couponRepository.getUserRedemptions(userId, params)
  }

  // ===== Gift Purchase =====

  async createPurchasedGiftCoupon(userId: number, dto: PurchaseGiftCouponDTO): Promise<GiftPurchaseResponseDTO> {
    // Validate courses exist
    const courses = await this.courseRepository.findByIds(dto.courseIds)
    if (courses.length !== dto.courseIds.length) {
      throw new BadRequestException('One or more courses not found')
    }

    // Generate unique gift code
    let code = this.generateUniqueGiftCode()
    let existingCoupon = await this.couponRepository.checkCouponExists(code)
    while (existingCoupon) {
      code = this.generateUniqueGiftCode()
      existingCoupon = await this.couponRepository.checkCouponExists(code)
    }

    // Create coupon in DRAFT status (will be activated after payment)
    const coupon = await this.couponRepository.create({
      code,
      title: `Gift Coupon - ${courses.map((c) => c.title).join(', ')}`,
      description: dto.giftMessage,
      type: CouponType.GIFT,
      status: CouponStatus.DRAFT,
      creator: { connect: { id: userId } },
      newUsersOnly: false,
      requireFullCombo: false,
      courses: { create: [] }, // We'll link courses separately
    })

    // Link courses to coupon
    await this.couponRepository.linkCourses(
      coupon.id,
      dto.courseIds.map((courseId) => ({ courseId, required: true })),
    )

    // Update coupon with gift purchase fields
    const updatedCoupon = await this.couponRepository.update(coupon.id, {
      purchasedBy: userId,
      recipientEmail: dto.recipientEmail,
      recipientName: dto.recipientName,
      isGiftPurchase: true,
      purchasedAt: new Date(),
    } as any)

    // Calculate total price
    const totalAmount = courses.reduce((sum, course) => sum + course.price, 0)

    // Create audit log
    await this.createAuditLog(
      coupon.id,
      userId,
      CouponAuditAction.CREATED,
      null,
      updatedCoupon,
      'Gift coupon created for purchase',
    )

    this.logger.log(`Gift coupon ${coupon.code} created by user ${userId}`)

    // Return the gift coupon details
    // Payment creation will be handled by the controller to avoid circular dependencies
    return {
      couponId: updatedCoupon.id,
      code: updatedCoupon.code,
      status: updatedCoupon.status,
      purchasedAt: updatedCoupon.purchasedAt?.toISOString() || new Date().toISOString(),
      totalAmount,
      courses: courses.map((c) => ({
        id: c.id,
        title: c.title,
        price: c.price,
      })),
      recipientEmail: dto.recipientEmail,
      recipientName: dto.recipientName,
      giftMessage: dto.giftMessage,
      // Add payment information that can be used by the controller
      paymentRequired: true,
      paymentDetails: {
        userId,
        couponId: updatedCoupon.id,
        totalAmount,
        courses: courses.map((c) => ({
          id: c.id,
          title: c.title,
          price: c.price,
        })),
      },
    }
  }

  private generateUniqueGiftCode(): string {
    // Generate format: GIFT-XXXX-XXXX-XXXX
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed ambiguous characters
    const segments: string[] = []

    for (let i = 0; i < 3; i++) {
      let segment = ''
      for (let j = 0; j < 4; j++) {
        segment += chars[Math.floor(Math.random() * chars.length)]
      }
      segments.push(segment)
    }

    return `GIFT-${segments.join('-')}`
  }

  async activateGiftCouponAfterPayment(couponId: number, orderId: number): Promise<void> {
    const coupon = await this.couponRepository.findById(couponId)
    if (!coupon) {
      throw new NotFoundException('Gift coupon not found')
    }

    if (!coupon.purchasedBy) {
      throw new BadRequestException('This coupon is not a purchased gift')
    }

    const oldValues = { status: coupon.status }

    await this.couponRepository.update(couponId, {
      status: CouponStatus.ACTIVE,
      purchaseOrderId: orderId,
      purchasedAt: new Date(),
    } as any)

    const newValues = { status: CouponStatus.ACTIVE, purchaseOrderId: orderId, purchasedAt: new Date() }

    // Create audit log
    await this.createAuditLog(
      couponId,
      coupon.purchasedBy,
      CouponAuditAction.ACTIVATED,
      oldValues,
      newValues,
      'Gift coupon activated after payment completion',
    )

    this.logger.log(`Gift coupon ${coupon.code} activated after payment`)
  }

  async getUserPurchasedGifts(userId: number, params: { page?: number; limit?: number } = {}) {
    const page = params.page || 1
    const limit = params.limit || 10
    const skip = (page - 1) * limit

    const [gifts, total] = await Promise.all([
      this.couponRepository.findPurchasedGifts(userId, skip, limit),
      this.couponRepository.countPurchasedGifts(userId),
    ])

    return {
      data: gifts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  // ===== Private Helper Methods =====

  private async createAuditLog(
    couponId: number,
    userId: number,
    action: CouponAuditAction,
    oldValues: any,
    newValues: any,
    note?: string,
  ) {
    await this.couponRepository.createAuditLog({
      coupon: { connect: { id: couponId } },
      user: { connect: { id: userId } },
      action,
      oldValues: oldValues ? JSON.stringify(oldValues) : undefined,
      newValues: newValues ? JSON.stringify(newValues) : undefined,
      note,
    })
  }

  private calculateEligibleAmount(userCourseIds: number[], couponCourses: any[]): number {
    // This would need to fetch course prices and calculate eligible amount
    // Placeholder implementation
    return 10000 // $100.00 in cents
  }

  private calculateDiscountAmount(
    eligibleAmount: number,
    discountType: DiscountType,
    discountValue: number,
    maxDiscountAmount?: number,
  ): number {
    let discount = 0

    if (discountType === DiscountType.PERCENTAGE) {
      discount = Math.floor((eligibleAmount * discountValue) / 100)
    } else {
      discount = discountValue
    }

    if (maxDiscountAmount && discount > maxDiscountAmount) {
      discount = maxDiscountAmount
    }

    return discount
  }

  private getAvailableClassesForCourse(courseId: number) {
    // This would fetch available classes for the course
    // Placeholder implementation
    return []
  }

  private validateClassSelection(courseId: number, classId: number): boolean {
    // This would validate that the class exists for the course and has capacity
    // Placeholder implementation
    return true
  }
}
