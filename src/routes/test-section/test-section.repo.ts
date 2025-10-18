import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../shared/services/prisma.service'
import { Prisma } from '@prisma/client'
import {
  TestSection,
  TestSectionWithItems,
  TestSectionWithTest,
  TestSectionBasic,
  CreateTestSectionInput,
  UpdateTestSectionInput,
  TestSectionQuery,
} from './test-section.model'

@Injectable()
export class TestSectionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateTestSectionInput): Promise<TestSection> {
    return await this.prisma.testSection.create({
      data,
    })
  }

  async findById(id: number): Promise<TestSection | null> {
    return await this.prisma.testSection.findUnique({
      where: { id },
    })
  }

  async findByIdWithItems(id: number): Promise<TestSectionWithItems | null> {
    return await this.prisma.testSection.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            question: {
              include: {
                option: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    })
  }

  async findByIdWithTest(id: number): Promise<TestSectionWithTest | null> {
    return await this.prisma.testSection.findUnique({
      where: { id },
      include: {
        test: {
          select: {
            id: true,
            title: true,
            level: true,
          },
        },
        _count: {
          select: {
            items: true,
          },
        },
      },
    })
  }

  async update(id: number, data: UpdateTestSectionInput): Promise<TestSection> {
    return await this.prisma.testSection.update({
      where: { id },
      data,
    })
  }

  async delete(id: number): Promise<TestSection> {
    return await this.prisma.testSection.delete({
      where: { id },
    })
  }

  async findMany(query: TestSectionQuery): Promise<{
    data: TestSectionBasic[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }> {
    const { page = 1, limit = 20, search, type, testId, sortBy = 'order', sortOrder = 'asc' } = query

    const skip = (page - 1) * limit

    const where: Prisma.TestSectionWhereInput = {}

    if (search) {
      where.title = {
        contains: search,
        mode: 'insensitive',
      }
    }

    if (type) where.type = type
    if (testId) where.testId = testId

    const orderBy: Prisma.TestSectionOrderByWithRelationInput = {}
    if (sortBy && sortOrder) {
      orderBy[sortBy] = sortOrder
    }

    const [data, total] = await Promise.all([
      this.prisma.testSection.findMany({
        where,
        skip: Number(skip),
        take: Number(limit),
        orderBy,
        include: {
          _count: {
            select: {
              items: true,
            },
          },
        },
      }),
      this.prisma.testSection.count({ where }),
    ])

    return {
      data: data as TestSectionBasic[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    }
  }

  // ===== Test-specific Operations =====
  async findByTestId(testId: number): Promise<TestSectionBasic[]> {
    const result = await this.prisma.testSection.findMany({
      where: { testId },
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: {
            items: true,
          },
        },
      },
    })
    return result as TestSectionBasic[]
  }

  async findByTestIdWithItems(testId: number): Promise<TestSectionWithItems[]> {
    return await this.prisma.testSection.findMany({
      where: { testId },
      orderBy: { order: 'asc' },
      include: {
        items: {
          include: {
            question: {
              include: {
                option: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    })
  }

  // ===== Bulk Operations =====
  async bulkCreate(testId: number, sections: Omit<CreateTestSectionInput, 'testId'>[]): Promise<TestSection[]> {
    const sectionsWithTestId = sections.map((section) => ({
      ...section,
      testId,
    }))

    const result = await this.prisma.$transaction(
      sectionsWithTestId.map((section) =>
        this.prisma.testSection.create({
          data: section,
        }),
      ),
    )

    return result
  }

  async bulkDelete(ids: number[]): Promise<{ count: number }> {
    return await this.prisma.testSection.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    })
  }

  async reorderSections(updates: Array<{ id: number; order: number }>): Promise<void> {
    await this.prisma.$transaction(
      updates.map(({ id, order }) =>
        this.prisma.testSection.update({
          where: { id },
          data: { order },
        }),
      ),
    )
  }

  // ===== Statistics =====
  async getStatistics(id: number): Promise<{
    totalItems: number
    itemsByType: Record<string, number>
    avgItemsPerSection: number
  }> {
    const section = await this.prisma.testSection.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            question: {
              select: {
                type: true,
              },
            },
          },
        },
      },
    })

    if (!section) {
      return {
        totalItems: 0,
        itemsByType: {},
        avgItemsPerSection: 0,
      }
    }

    const totalItems = section.items.length
    const itemsByType: Record<string, number> = {}

    section.items.forEach((item) => {
      const type = item.question.type
      itemsByType[type] = (itemsByType[type] || 0) + 1
    })

    return {
      totalItems,
      itemsByType,
      avgItemsPerSection: totalItems,
    }
  }

  // ===== Copy Operations =====
  async copySection(id: number, targetTestId: number, newTitle?: string): Promise<TestSection> {
    const originalSection = await this.findByIdWithItems(id)
    if (!originalSection) {
      throw new Error('Section not found')
    }

    // Get the next order for the target test
    const lastSection = await this.prisma.testSection.findFirst({
      where: { testId: targetTestId },
      orderBy: { order: 'desc' },
    })

    const nextOrder = lastSection ? lastSection.order + 1 : 0

    // Create the new section
    const newSection = await this.prisma.testSection.create({
      data: {
        testId: targetTestId,
        title: newTitle || `${originalSection.title} (Copy)`,
        type: originalSection.type,
        order: nextOrder,
      },
    })

    // Copy all items
    if (originalSection.items.length > 0) {
      await this.prisma.testItem.createMany({
        data: originalSection.items.map((item, index) => ({
          sectionId: newSection.id,
          questionId: item.questionId,
          order: index,
        })),
      })
    }

    return newSection
  }

  // ===== Move Operations =====
  async moveSection(id: number, targetTestId: number): Promise<TestSection> {
    // Get the next order for the target test
    const lastSection = await this.prisma.testSection.findFirst({
      where: { testId: targetTestId },
      orderBy: { order: 'desc' },
    })

    const nextOrder = lastSection ? lastSection.order + 1 : 0

    return this.prisma.testSection.update({
      where: { id },
      data: {
        testId: targetTestId,
        order: nextOrder,
      },
    })
  }

  // ===== Validation Helpers =====
  async exists(id: number): Promise<boolean> {
    const count = await this.prisma.testSection.count({
      where: { id },
    })
    return count > 0
  }

  async existsByIds(ids: number[]): Promise<number[]> {
    const sections = await this.prisma.testSection.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: { id: true },
    })
    return sections.map((s) => s.id)
  }

  async getTitleExistsInTest(testId: number, title: string, excludeId?: number): Promise<boolean> {
    const count = await this.prisma.testSection.count({
      where: {
        testId,
        title,
        ...(excludeId && { id: { not: excludeId } }),
      },
    })
    return count > 0
  }

  async getNextOrderForTest(testId: number): Promise<number> {
    const lastSection = await this.prisma.testSection.findFirst({
      where: { testId },
      orderBy: { order: 'desc' },
    })
    return lastSection ? lastSection.order + 1 : 0
  }

  // ===== Order Management =====
  async updateOrdersAfterDelete(testId: number, deletedOrder: number): Promise<void> {
    await this.prisma.testSection.updateMany({
      where: {
        testId,
        order: {
          gt: deletedOrder,
        },
      },
      data: {
        order: {
          decrement: 1,
        },
      },
    })
  }

  async insertAtOrder(testId: number, insertOrder: number): Promise<void> {
    await this.prisma.testSection.updateMany({
      where: {
        testId,
        order: {
          gte: insertOrder,
        },
      },
      data: {
        order: {
          increment: 1,
        },
      },
    })
  }
}
