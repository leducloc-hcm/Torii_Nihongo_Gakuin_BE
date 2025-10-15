import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  Module,
  ModuleWithRelations,
  ModuleCreateInput,
  ModuleUpdateInput,
  ModuleWhereUniqueInput,
  ModuleWhereInput,
  ModuleOrderByInput,
} from './module.model'

@Injectable()
export class ModuleRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly includeRelations = {
    course: {
      select: {
        id: true,
        title: true,
        slug: true,
      },
    },
    lessons: {
      select: {
        id: true,
        title: true,
        kind: true,
        order: true,
        status: true,
        durationSec: true,
        createdAt: true,
      },
      orderBy: {
        order: 'asc' as const,
      },
    },
    _count: {
      select: {
        lessons: true,
      },
    },
  }

  async create(data: ModuleCreateInput): Promise<ModuleWithRelations> {
    return (await this.prisma.module.create({
      data,
      include: this.includeRelations,
    })) as any
  }

  async findAll(params: {
    skip?: number
    take?: number
    where?: ModuleWhereInput
    orderBy?: ModuleOrderByInput
  }): Promise<{ modules: ModuleWithRelations[]; total: number }> {
    const { skip, take, where, orderBy } = params

    const [modules, total] = await Promise.all([
      this.prisma.module.findMany({
        skip,
        take,
        where: where as any,
        orderBy: orderBy as any,
        include: this.includeRelations,
      }) as Promise<ModuleWithRelations[]>,
      this.prisma.module.count({ where: where as any }),
    ])

    return { modules, total }
  }

  async findOne(where: ModuleWhereUniqueInput): Promise<ModuleWithRelations | null> {
    return (await this.prisma.module.findUnique({
      where: where as any,
      include: this.includeRelations,
    })) as any
  }

  async update(params: { where: ModuleWhereUniqueInput; data: ModuleUpdateInput }): Promise<ModuleWithRelations> {
    const { where, data } = params

    return (await this.prisma.module.update({
      where: where as any,
      data,
      include: this.includeRelations,
    })) as any
  }

  async delete(where: ModuleWhereUniqueInput): Promise<Module> {
    return await this.prisma.module.delete({
      where: where as any,
    })
  }

  async checkCourseExists(courseId: number): Promise<boolean> {
    const count = await this.prisma.course.count({
      where: { id: courseId },
    })
    return count > 0
  }

  async findByCourse(
    courseId: number,
    params: {
      skip?: number
      take?: number
      where?: Omit<ModuleWhereInput, 'courseId'>
      orderBy?: ModuleOrderByInput
    },
  ): Promise<{ modules: ModuleWithRelations[]; total: number }> {
    const { skip, take, where = {}, orderBy } = params

    const whereWithCourse = { ...where, courseId }

    return this.findAll({ skip, take, where: whereWithCourse, orderBy })
  }

  async getMaxOrder(courseId: number): Promise<number> {
    const result = await this.prisma.module.aggregate({
      where: { courseId },
      _max: {
        order: true,
      },
    })

    return result._max.order ?? 0
  }

  async reorderModules(courseId: number, moduleOrders: { id: number; order: number }[]): Promise<void> {
    // Use transaction to update all orders atomically
    await this.prisma.$transaction(
      moduleOrders.map(({ id, order }) =>
        this.prisma.module.update({
          where: { id },
          data: { order },
        }),
      ),
    )
  }
}
