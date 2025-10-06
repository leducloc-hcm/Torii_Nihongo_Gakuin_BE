import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  Lesson,
  LessonWithRelations,
  LessonCreateInput,
  LessonUpdateInput,
  LessonWhereUniqueInput,
  LessonWhereInput,
  LessonOrderByInput,
} from './lesson.model'

@Injectable()
export class LessonRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly includeRelations = {
    module: {
      select: {
        id: true,
        title: true,
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    },
    resources: {
      select: {
        id: true,
        url: true,
        kind: true,
        mimeType: true,
        sizeByte: true,
        caption: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc' as const,
      },
    },
    liveSession: {
      select: {
        id: true,
        title: true,
        scheduledAt: true,
        endedAt: true,
        mode: true,
        roomKey: true,
      },
    },
    quiz: {
      select: {
        id: true,
        title: true,
        _count: {
          select: {
            items: true,
          },
        },
      },
    },
    _count: {
      select: {
        notes: true,
        resources: true,
      },
    },
  }

  async create(data: LessonCreateInput): Promise<LessonWithRelations> {
    return (await this.prisma.lesson.create({
      data,
      include: this.includeRelations,
    })) as any
  }

  async findAll(params: {
    skip?: number
    take?: number
    where?: LessonWhereInput
    orderBy?: LessonOrderByInput
  }): Promise<{ lessons: LessonWithRelations[]; total: number }> {
    const { skip, take, where, orderBy } = params

    const [lessons, total] = await Promise.all([
      this.prisma.lesson.findMany({
        skip,
        take,
        where: where as any,
        orderBy: orderBy as any,
        include: this.includeRelations,
      }) as Promise<LessonWithRelations[]>,
      this.prisma.lesson.count({ where: where as any }),
    ])

    return { lessons, total }
  }

  async findOne(where: LessonWhereUniqueInput): Promise<LessonWithRelations | null> {
    return (await this.prisma.lesson.findUnique({
      where: where as any,
      include: this.includeRelations,
    })) as any
  }

  async update(params: { where: LessonWhereUniqueInput; data: LessonUpdateInput }): Promise<LessonWithRelations> {
    const { where, data } = params

    return (await this.prisma.lesson.update({
      where: where as any,
      data,
      include: this.includeRelations,
    })) as any
  }

  async delete(where: LessonWhereUniqueInput): Promise<Lesson> {
    return this.prisma.lesson.delete({
      where: where as any,
    })
  }

  async checkModuleExists(moduleId: number): Promise<boolean> {
    const count = await this.prisma.module.count({
      where: { id: moduleId },
    })
    return count > 0
  }

  async findByModule(
    moduleId: number,
    params: {
      skip?: number
      take?: number
      where?: Omit<LessonWhereInput, 'moduleId'>
      orderBy?: LessonOrderByInput
    },
  ): Promise<{ lessons: LessonWithRelations[]; total: number }> {
    const { skip, take, where = {}, orderBy } = params

    const whereWithModule = { ...where, moduleId }

    return this.findAll({ skip, take, where: whereWithModule, orderBy })
  }

  async getMaxOrder(moduleId: number): Promise<number> {
    const result = await this.prisma.lesson.aggregate({
      where: { moduleId },
      _max: {
        order: true,
      },
    })

    return result._max.order ?? 0
  }

  async reorderLessons(moduleId: number, lessonOrders: { id: number; order: number }[]): Promise<void> {
    // Use transaction to update all orders atomically
    await this.prisma.$transaction(
      lessonOrders.map(({ id, order }) =>
        this.prisma.lesson.update({
          where: { id },
          data: { order },
        }),
      ),
    )
  }

  async getPublishedLessons(params: {
    skip?: number
    take?: number
    where?: Omit<LessonWhereInput, 'status'>
    orderBy?: LessonOrderByInput
  }): Promise<{ lessons: LessonWithRelations[]; total: number }> {
    const { skip, take, where = {}, orderBy } = params

    const whereWithStatus = { ...where, status: 'PUBLISHED' as const }

    return this.findAll({ skip, take, where: whereWithStatus, orderBy })
  }

  async findByCourse(
    courseId: number,
    params: {
      skip?: number
      take?: number
      where?: Omit<LessonWhereInput, 'moduleId'>
      orderBy?: LessonOrderByInput
    },
  ): Promise<{ lessons: LessonWithRelations[]; total: number }> {
    const { skip, take, where = {}, orderBy } = params

    // Find all module IDs for the course first
    const modules = await this.prisma.module.findMany({
      where: { courseId },
      select: { id: true },
    })

    const moduleIds = modules.map((m) => m.id)

    if (moduleIds.length === 0) {
      return { lessons: [], total: 0 }
    }

    const whereWithModules = {
      ...where,
      moduleId: { in: moduleIds },
    }

    return this.findAll({ skip, take, where: whereWithModules as any, orderBy })
  }
}
