import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  Enrollment,
  EnrollmentWithRelations,
  EnrollmentCreateInput,
  EnrollmentUpdateInput,
  EnrollmentWhereUniqueInput,
  EnrollmentWhereInput,
  EnrollmentOrderByInput,
  MyEnrollmentType,
} from './enrollment.model'

@Injectable()
export class EnrollmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly includeRelations = {
    user: {
      select: {
        id: true,
        name: true,
        email: true,
        customerProfile: {
          select: {
            avatar: true,
            username: true,
          },
        },
      },
    },
    course: {
      select: {
        id: true,
        slug: true,
        title: true,
        subtitle: true,
        description: true,
        level: true,
        courseType: true,
        thumbnailUrl: true,
        price: true,
        status: true,
        _count: {
          select: {
            modules: true,
          },
        },
      },
    },
  }

  private readonly includeMyEnrollmentRelations = {
    course: {
      select: {
        id: true,
        slug: true,
        title: true,
        subtitle: true,
        description: true,
        level: true,
        courseType: true,
        thumbnailUrl: true,
        price: true,
        status: true,
        _count: {
          select: {
            modules: true,
          },
        },
      },
    },
  }

  async create(data: EnrollmentCreateInput): Promise<EnrollmentWithRelations> {
    return (await this.prisma.enrollment.create({
      data: data as any,
      include: this.includeRelations,
    })) as any
  }

  async findAll(params: {
    skip?: number
    take?: number
    where?: EnrollmentWhereInput
    orderBy?: EnrollmentOrderByInput
  }): Promise<{ enrollments: EnrollmentWithRelations[]; total: number }> {
    const { skip, take, where, orderBy } = params

    const [enrollments, total] = await Promise.all([
      this.prisma.enrollment.findMany({
        skip,
        take,
        where: where as any,
        orderBy: orderBy as any,
        include: this.includeRelations,
      }) as unknown as Promise<EnrollmentWithRelations[]>,
      this.prisma.enrollment.count({ where: where as any }),
    ])

    return { enrollments, total }
  }

  async findOne(where: EnrollmentWhereUniqueInput): Promise<EnrollmentWithRelations | null> {
    return this.prisma.enrollment.findUnique({
      where: where as any,
      include: this.includeRelations,
    }) as Promise<EnrollmentWithRelations | null>
  }

  async findByUserAndCourse(userId: number, courseId: number): Promise<EnrollmentWithRelations | null> {
    return this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      include: this.includeRelations,
    }) as Promise<EnrollmentWithRelations | null>
  }

  async findMyEnrollments(
    userId: number,
    params: {
      skip?: number
      take?: number
      expired?: boolean
      courseType?: 'VIDEO_QUIZ' | 'VIDEO_QUIZ_LIVE' | 'LIVE_ONLY'
      orderBy?: EnrollmentOrderByInput
    },
  ): Promise<{ enrollments: MyEnrollmentType[]; total: number }> {
    const { skip, take, expired, courseType, orderBy } = params

    const where: any = { userId }

    // Filter by expiration status
    if (expired !== undefined) {
      if (expired) {
        where.expiresAt = {
          lt: new Date(),
        }
      } else {
        where.OR = [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
      }
    }

    // Filter by course type
    if (courseType) {
      where.courseType = courseType
    }

    const [enrollments, total] = await Promise.all([
      this.prisma.enrollment.findMany({
        skip,
        take,
        where,
        orderBy: orderBy as any,
        select: {
          id: true,
          courseId: true,
          courseType: true,
          createdAt: true,
          expiresAt: true,
          course: {
            select: {
              id: true,
              slug: true,
              title: true,
              subtitle: true,
              description: true,
              level: true,
              courseType: true,
              thumbnailUrl: true,
              price: true,
              status: true,
              _count: {
                select: {
                  modules: true,
                },
              },
            },
          },
        },
      }) as unknown as Promise<MyEnrollmentType[]>,
      this.prisma.enrollment.count({ where }),
    ])

    return { enrollments, total }
  }

  async update(params: {
    where: EnrollmentWhereUniqueInput
    data: EnrollmentUpdateInput
  }): Promise<EnrollmentWithRelations> {
    const { where, data } = params

    return (await this.prisma.enrollment.update({
      where: where as any,
      data: data as any,
      include: this.includeRelations,
    })) as any
  }

  async delete(where: EnrollmentWhereUniqueInput): Promise<Enrollment> {
    return await this.prisma.enrollment.delete({
      where: where as any,
    })
  }

  async checkEnrollmentExists(userId: number, courseId: number): Promise<boolean> {
    const count = await this.prisma.enrollment.count({
      where: {
        userId,
        courseId,
      },
    })
    return count > 0
  }

  async checkUserExists(userId: number): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: {
        id: userId,
        role: 'CUSTOMER',
      },
    })
    return count > 0
  }

  async checkCourseExists(courseId: number): Promise<{ exists: boolean; courseType?: string; status?: string }> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { courseType: true, status: true },
    })

    if (!course) {
      return { exists: false }
    }

    return {
      exists: true,
      courseType: course.courseType,
      status: course.status,
    }
  }

  async findExpiredEnrollments(params?: {
    skip?: number
    take?: number
    orderBy?: EnrollmentOrderByInput
  }): Promise<{ enrollments: EnrollmentWithRelations[]; total: number }> {
    const { skip, take, orderBy } = params || {}

    const where = {
      expiresAt: {
        lt: new Date(),
      },
    }

    return this.findAll({ skip, take, where, orderBy })
  }

  async findActiveEnrollments(
    userId?: number,
    params?: {
      skip?: number
      take?: number
      orderBy?: EnrollmentOrderByInput
    },
  ): Promise<{ enrollments: EnrollmentWithRelations[]; total: number }> {
    const { skip, take, orderBy } = params || {}

    const where: any = {
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    }

    if (userId) {
      where.userId = userId
    }

    return this.findAll({ skip, take, where, orderBy })
  }

  async getUserEnrollmentCount(userId: number): Promise<number> {
    return await this.prisma.enrollment.count({
      where: { userId },
    })
  }

  async getCourseEnrollmentCount(courseId: number): Promise<number> {
    return await this.prisma.enrollment.count({
      where: { courseId },
    })
  }

  async bulkUpdateExpirations(enrollmentIds: number[], expiresAt: Date | null): Promise<{ count: number }> {
    return await this.prisma.enrollment.updateMany({
      where: {
        id: {
          in: enrollmentIds,
        },
      },
      data: {
        expiresAt,
      },
    })
  }

  async findUserEnrollmentsByCourseIds(
    userId: number,
    courseIds: number[],
  ): Promise<{ courseId: number; expiresAt: Date | null }[]> {
    return await this.prisma.enrollment.findMany({
      where: {
        userId,
        courseId: {
          in: courseIds,
        },
      },
      select: {
        courseId: true,
        expiresAt: true,
      },
    })
  }
}
