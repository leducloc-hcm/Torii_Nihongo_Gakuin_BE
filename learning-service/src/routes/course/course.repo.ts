import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  Course,
  CourseWithRelations,
  CourseCreateInput,
  CourseUpdateInput,
  CourseWhereUniqueInput,
  CourseWhereInput,
  CourseOrderByInput,
} from './course.model'

@Injectable()
export class CourseRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly includeRelations = {
    modules: {
      select: {
        id: true,
        title: true,
        order: true,
        _count: {
          select: {
            lessons: true,
          },
        },
      },
      orderBy: {
        order: 'asc' as const,
      },
    },
    _count: {
      select: {
        modules: true,
        enrollments: true,
        reviews: true,
      },
    },
  }

  private readonly includeRelationsWithReviews = {
    ...this.includeRelations,
    reviews: {
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc' as const,
      },
      take: 10, // Limit reviews to 10 most recent
    },
  }

  async create(data: CourseCreateInput): Promise<CourseWithRelations> {
    return (await this.prisma.course.create({
      data: {
        ...data,
        price: Number(data.price ?? 0),
      },
      include: this.includeRelations,
    })) as any
  }

  async findAll(params: {
    skip?: number
    take?: number
    where?: CourseWhereInput
    orderBy?: CourseOrderByInput
  }): Promise<{ courses: CourseWithRelations[]; total: number }> {
    const { skip, take, where, orderBy } = params

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where: where as any,
        orderBy: orderBy as any,
        include: this.includeRelations,
      }) as unknown as Promise<CourseWithRelations[]>,
      this.prisma.course.count({ where: where as any }),
    ])

    return { courses, total }
  }

  async findOne(where: CourseWhereUniqueInput, includeReviews = false): Promise<CourseWithRelations | null> {
    return this.prisma.course.findUnique({
      where: where as any,
      include: this.includeRelations,
    }) as Promise<CourseWithRelations | null>
  }

  async findBySlug(slug: string, includeReviews = false): Promise<CourseWithRelations | null> {
    return this.prisma.course.findUnique({
      where: { slug },
      include: includeReviews ? this.includeRelationsWithReviews : this.includeRelations,
    }) as Promise<CourseWithRelations | null>
  }

  async update(params: { where: CourseWhereUniqueInput; data: CourseUpdateInput }): Promise<CourseWithRelations> {
    const { where, data } = params

    return (await this.prisma.course.update({
      where: where as any,
      data: {
        ...data,
        price: data.price !== undefined ? Number(data.price) : undefined,
      },
      include: this.includeRelations,
    })) as any
  }

  async delete(where: CourseWhereUniqueInput): Promise<Course> {
    return await this.prisma.course.delete({
      where: where as any,
    })
  }

  async checkSlugExists(slug: string, excludeId?: number): Promise<boolean> {
    const count = await this.prisma.course.count({
      where: {
        slug,
        ...(excludeId && { id: { not: excludeId } }),
      },
    })
    return count > 0
  }

  async checkLecturerExists(lecturerId: number): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: {
        id: lecturerId,
        role: {
          in: ['LECTURER', 'ADMIN'],
        },
      },
    })
    return count > 0
  }

  async findByLecturer(
    lecturerId: number,
    params: {
      skip?: number
      take?: number
      where?: Omit<CourseWhereInput, 'lecturerId'>
      orderBy?: CourseOrderByInput
    },
  ): Promise<{ courses: CourseWithRelations[]; total: number }> {
    const { skip, take, where = {}, orderBy } = params

    const whereWithLecturer = { ...where, lecturerId }

    return this.findAll({ skip, take, where: whereWithLecturer, orderBy })
  }

  async getPublishedCourses(params: {
    skip?: number
    take?: number
    where?: Omit<CourseWhereInput, 'status'>
    orderBy?: CourseOrderByInput
  }): Promise<{ courses: CourseWithRelations[]; total: number }> {
    const { skip, take, where = {}, orderBy } = params

    const whereWithStatus = { ...where, status: 'PUBLISHED' as const }

    return this.findAll({ skip, take, where: whereWithStatus, orderBy })
  }

  async findByIds(ids: number[]): Promise<Course[]> {
    return this.prisma.course.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        price: true,
        courseType: true,
        level: true,
        status: true,
      },
    }) as Promise<Course[]>
  }
  async findAllPendingReviewCourses(params: { where?: CourseWhereInput }): Promise<CourseWithRelations[]> {
    const { where = {} } = params

    const whereWithStatus = { ...where, status: 'PENDING_REVIEW' as const }

    const { courses } = await this.findAll({ where: whereWithStatus })
    return courses
  }
}
