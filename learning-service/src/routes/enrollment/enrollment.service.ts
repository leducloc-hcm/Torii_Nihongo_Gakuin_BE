import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { EnrollmentRepository } from './enrollment.repo'
import { CreateEnrollmentDTO, UpdateEnrollmentDTO, QueryEnrollmentDTO } from './enrollment.dto'
import {
  EnrollmentWithRelations,
  EnrollmentWhereInput,
  EnrollmentOrderByInput,
  MyEnrollmentType,
} from './enrollment.model'
import { PrismaService } from 'src/shared/services/prisma.service'

@Injectable()
export class EnrollmentService {
  constructor(
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(createEnrollmentDto: CreateEnrollmentDTO, userId: number): Promise<EnrollmentWithRelations> {
    const { courseId, courseType, expiresAt } = createEnrollmentDto

    const userExists = await this.enrollmentRepository.checkUserExists(userId)
    if (!userExists) {
      throw new BadRequestException('User does not exist or is not authorized to enroll in courses')
    }

    const courseCheck = await this.enrollmentRepository.checkCourseExists(courseId)
    if (!courseCheck.exists) {
      throw new NotFoundException(`Course with ID ${courseId} not found`)
    }

    if (courseCheck.status !== 'PUBLISHED') {
      throw new BadRequestException('Cannot enroll in a course that is not published')
    }

    if (courseCheck.courseType !== courseType) {
      throw new BadRequestException(`Course type mismatch. Expected ${courseCheck.courseType}, got ${courseType}`)
    }

    const existingEnrollment = await this.enrollmentRepository.checkEnrollmentExists(userId, courseId)
    if (existingEnrollment) {
      throw new ConflictException(`User is already enrolled in course with ID ${courseId}`)
    }

    return this.enrollmentRepository.create({
      userId,
      courseId,
      courseType,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    })
  }

  async findAll(queryDto: QueryEnrollmentDTO) {
    const { page, limit, userId, courseId, courseType, expired, sortBy, sortOrder } = queryDto
    const skip = (page - 1) * limit

    const where: EnrollmentWhereInput = {}

    if (userId) {
      where.userId = userId
    }

    if (courseId) {
      where.courseId = courseId
    }

    if (courseType) {
      where.courseType = courseType
    }

    if (expired !== undefined) {
      if (expired) {
        where.expiresAt = {
          lt: new Date(),
        }
      } else {
        where.OR = [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
      }
    }

    const orderBy: EnrollmentOrderByInput = {}
    if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder
    } else if (sortBy === 'expiresAt') {
      orderBy.expiresAt = sortOrder
    }

    const { enrollments, total } = await this.enrollmentRepository.findAll({
      skip,
      take: limit,
      where,
      orderBy,
    })

    return {
      data: enrollments,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async findOne(id: number): Promise<EnrollmentWithRelations> {
    const enrollment = await this.enrollmentRepository.findOne({ id })

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${id} not found`)
    }

    return enrollment
  }

  async findByUserAndCourse(userId: number, courseId: number): Promise<EnrollmentWithRelations> {
    const enrollment = await this.enrollmentRepository.findByUserAndCourse(userId, courseId)

    if (!enrollment) {
      throw new NotFoundException(`Enrollment not found for user ${userId} and course ${courseId}`)
    }

    return enrollment
  }

  async findMyEnrollments(
    userId: number,
    params: {
      page?: number
      limit?: number
      expired?: boolean
      courseType?: 'VIDEO_QUIZ' | 'VIDEO_QUIZ_LIVE' | 'LIVE_ONLY'
      sortBy?: 'createdAt' | 'expiresAt'
      sortOrder?: 'asc' | 'desc'
    } = {},
  ) {
    const { page = 1, limit = 10, expired, courseType, sortBy = 'createdAt', sortOrder = 'desc' } = params

    const skip = (page - 1) * Number(limit)

    const orderBy: EnrollmentOrderByInput = {}
    if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder
    } else if (sortBy === 'expiresAt') {
      orderBy.expiresAt = sortOrder
    }

    const { enrollments, total } = await this.enrollmentRepository.findMyEnrollments(userId, {
      skip,
      take: Number(limit),
      expired,
      courseType,
      orderBy,
    })

    // Calculate progress for each enrollment
    const enrollmentsWithProgress = await Promise.all(
      enrollments.map(async (enrollment) => {
        const progress = await this.calculateCourseProgress(userId, enrollment.courseId)
        return {
          ...enrollment,
          progressPercentage: progress.progressPercentage,
          totalLessons: progress.totalLessons,
          completedLessons: progress.completedLessons,
        }
      }),
    )

    return {
      data: enrollmentsWithProgress,
      meta: {
        page,
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    }
  }

  private async calculateCourseProgress(
    userId: number,
    courseId: number,
  ): Promise<{ progressPercentage: number; totalLessons: number; completedLessons: number }> {
    // Get total lessons count for the course
    const totalLessons = await this.prisma.lesson.count({
      where: {
        module: {
          courseId,
        },
      },
    })

    // Get completed lessons count for the user in this course
    const completedLessons = await this.prisma.lessonProgress.count({
      where: {
        userId,
        completed: true,
        lesson: {
          module: {
            courseId,
          },
        },
      },
    })

    const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

    return {
      progressPercentage,
      totalLessons,
      completedLessons,
    }
  }

  async update(
    id: number,
    updateEnrollmentDto: UpdateEnrollmentDTO,
    requestUserId: number,
  ): Promise<EnrollmentWithRelations> {
    const existingEnrollment = await this.findOne(id)

    if (existingEnrollment.userId !== requestUserId) {
      throw new ForbiddenException('You can only update your own enrollments')
    }

    const { expiresAt } = updateEnrollmentDto

    return this.enrollmentRepository.update({
      where: { id },
      data: {
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    })
  }

  async remove(id: number, requestUserId: number): Promise<EnrollmentWithRelations> {
    const enrollment = await this.findOne(id)

    if (enrollment.userId !== requestUserId) {
      throw new ForbiddenException('You can only remove your own enrollments')
    }
    await this.enrollmentRepository.delete({ id })

    return enrollment
  }

  async removeByUserAndCourse(
    userId: number,
    courseId: number,
    requestUserId: number,
  ): Promise<EnrollmentWithRelations> {
    const enrollment = await this.findByUserAndCourse(userId, courseId)

    if (enrollment.userId !== requestUserId) {
      throw new ForbiddenException('You can only remove your own enrollments')
    }

    await this.enrollmentRepository.delete({
      userId_courseId: {
        userId,
        courseId,
      },
    })

    return enrollment
  }

  async getExpiredEnrollments(
    params: {
      page?: number
      limit?: number
      sortBy?: 'createdAt' | 'expiresAt'
      sortOrder?: 'asc' | 'desc'
    } = {},
  ) {
    const { page = 1, limit = 10, sortBy = 'expiresAt', sortOrder = 'asc' } = params

    const skip = (page - 1) * limit

    const orderBy: EnrollmentOrderByInput = {}
    if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder
    } else if (sortBy === 'expiresAt') {
      orderBy.expiresAt = sortOrder
    }

    const { enrollments, total } = await this.enrollmentRepository.findExpiredEnrollments({
      skip,
      take: limit,
      orderBy,
    })

    return {
      data: enrollments,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async getActiveEnrollments(
    userId?: number,
    params: {
      page?: number
      limit?: number
      sortBy?: 'createdAt' | 'expiresAt'
      sortOrder?: 'asc' | 'desc'
    } = {},
  ) {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = params

    const skip = (page - 1) * limit

    const orderBy: EnrollmentOrderByInput = {}
    if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder
    } else if (sortBy === 'expiresAt') {
      orderBy.expiresAt = sortOrder
    }

    const { enrollments, total } = await this.enrollmentRepository.findActiveEnrollments(userId, {
      skip,
      take: limit,
      orderBy,
    })

    return {
      data: enrollments,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async getUserEnrollmentStats(userId: number) {
    const totalCount = await this.enrollmentRepository.getUserEnrollmentCount(userId)
    const { enrollments: activeEnrollments } = await this.enrollmentRepository.findActiveEnrollments(userId, {
      take: 1000,
    })
    const { enrollments: expiredEnrollments } = await this.enrollmentRepository.findExpiredEnrollments({ take: 1000 })

    const userExpiredCount = expiredEnrollments.filter((e) => e.userId === userId).length

    // Calculate completion stats
    const completedCoursesCount = await Promise.all(
      activeEnrollments.map(async (enrollment) => {
        const progress = await this.calculateCourseProgress(userId, enrollment.courseId)
        return progress.progressPercentage === 100
      }),
    ).then((results) => results.filter(Boolean).length)

    return {
      total: totalCount,
      active: activeEnrollments.length,
      expired: userExpiredCount,
      completed: completedCoursesCount,
      inProgress: activeEnrollments.length - completedCoursesCount,
    }
  }

  async getCourseEnrollmentStats(courseId: number) {
    const totalCount = await this.enrollmentRepository.getCourseEnrollmentCount(courseId)

    return {
      total: totalCount,
    }
  }

  async bulkExtendEnrollments(enrollmentIds: number[], expiresAt: Date): Promise<{ updatedCount: number }> {
    const result = await this.enrollmentRepository.bulkUpdateExpirations(enrollmentIds, expiresAt)
    return { updatedCount: result.count }
  }

  async bulkRemoveExpirations(enrollmentIds: number[]): Promise<{ updatedCount: number }> {
    const result = await this.enrollmentRepository.bulkUpdateExpirations(enrollmentIds, null)
    return { updatedCount: result.count }
  }

  async isUserEnrolled(userId: number, courseId: number): Promise<boolean> {
    try {
      const enrollment = await this.enrollmentRepository.findByUserAndCourse(userId, courseId)

      if (!enrollment) {
        return false
      }

      if (enrollment.expiresAt && enrollment.expiresAt < new Date()) {
        return false
      }

      return true
    } catch {
      return false
    }
  }

  async checkUserEnrollments(userId: number, courseIds: number[]): Promise<number[]> {
    if (courseIds.length === 0) {
      return []
    }

    try {
      const enrollments = await this.enrollmentRepository.findUserEnrollmentsByCourseIds(userId, courseIds)

      // Filter out expired enrollments and return only active course IDs
      const activeEnrollments = enrollments.filter((enrollment) => {
        if (enrollment.expiresAt && enrollment.expiresAt < new Date()) {
          return false
        }
        return true
      })

      return activeEnrollments.map((enrollment) => enrollment.courseId)
    } catch {
      return []
    }
  }
}
