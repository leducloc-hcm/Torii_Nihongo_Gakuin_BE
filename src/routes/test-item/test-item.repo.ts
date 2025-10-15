// ===== TestItem Repository =====
// Database operations for TestItem entity
// Handles CRUD operations, bulk operations, and complex queries

import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../shared/services/prisma.service'
import {
  TestItem,
  TestItemWithDetails,
  CreateTestItemInput,
  UpdateTestItemInput,
  TestItemQueryInput,
  ReorderTestItemsInput,
  BulkCreateTestItemsInput,
  BulkDeleteTestItemsInput,
  CopyTestItemsInput,
  MoveTestItemsInput,
} from './test-item.model'

@Injectable()
export class TestItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ===== Basic CRUD Operations =====

  async create(data: CreateTestItemInput): Promise<TestItem> {
    // If order not provided, assign next available order
    if (data.order === undefined) {
      const maxOrder = await this.getMaxOrderInSection(data.sectionId)
      data.order = maxOrder + 1
    }

    return this.prisma.testItem.create({
      data,
    })
  }

  async findById(
    id: number,
    includeRelations?: { question?: boolean; section?: boolean },
  ): Promise<TestItemWithDetails | null> {
    return this.prisma.testItem.findUnique({
      where: { id },
      include: {
        question: includeRelations?.question
          ? {
              select: {
                id: true,
                stem: true,
                type: true,
                difficulty: true,
                level: true,
              },
            }
          : false,
        section: includeRelations?.section
          ? {
              select: {
                id: true,
                title: true,
                testId: true,
              },
            }
          : false,
      },
    }) as Promise<TestItemWithDetails | null>
  }

  async findMany(query: TestItemQueryInput): Promise<{
    items: TestItemWithDetails[]
    total: number
  }> {
    const {
      sectionId,
      questionId,
      minOrder,
      maxOrder,
      includeQuestion = false,
      includeSection = false,
      page = 1,
      limit = 20,
      sortBy = 'order',
      sortOrder = 'asc',
    } = query

    const where: any = {}

    if (sectionId !== undefined) where.sectionId = sectionId
    if (questionId !== undefined) where.questionId = questionId
    if (minOrder !== undefined || maxOrder !== undefined) {
      where.order = {}
      if (minOrder !== undefined) where.order.gte = minOrder
      if (maxOrder !== undefined) where.order.lte = maxOrder
    }

    const orderBy: any = {}
    orderBy[sortBy] = sortOrder

    const [items, total] = await Promise.all([
      this.prisma.testItem.findMany({
        where,
        include: {
          question: includeQuestion
            ? {
                select: {
                  id: true,
                  stem: true,
                  type: true,
                  difficulty: true,
                  level: true,
                },
              }
            : false,
          section: includeSection
            ? {
                select: {
                  id: true,
                  title: true,
                  testId: true,
                },
              }
            : false,
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.testItem.count({ where }),
    ])

    return { items: items as TestItemWithDetails[], total }
  }

  async update(id: number, data: UpdateTestItemInput): Promise<TestItem> {
    return this.prisma.testItem.update({
      where: { id },
      data,
    })
  }

  async delete(id: number): Promise<TestItem> {
    return this.prisma.testItem.delete({
      where: { id },
    })
  }

  // ===== Bulk Operations =====

  async bulkCreate(data: BulkCreateTestItemsInput): Promise<TestItem[]> {
    const { items } = data

    // Group items by sectionId for efficient order assignment
    const itemsBySection = new Map<number, CreateTestItemInput[]>()

    for (const item of items) {
      const sectionItems = itemsBySection.get(item.sectionId) || []
      sectionItems.push(item)
      itemsBySection.set(item.sectionId, sectionItems)
    }

    // Assign orders for items without order specified
    const itemsToCreate: CreateTestItemInput[] = []

    for (const [sectionId, sectionItems] of itemsBySection) {
      const maxOrder = await this.getMaxOrderInSection(sectionId)
      let nextOrder = maxOrder + 1

      for (const item of sectionItems) {
        if (item.order === undefined) {
          item.order = nextOrder++
        }
        itemsToCreate.push(item)
      }
    }

    // Use transaction to create all items
    return this.prisma.$transaction(itemsToCreate.map((item) => this.prisma.testItem.create({ data: item })))
  }

  async bulkDelete(data: BulkDeleteTestItemsInput): Promise<{ count: number }> {
    const result = await this.prisma.testItem.deleteMany({
      where: {
        id: { in: data.ids },
      },
    })
    return result
  }

  async reorder(data: ReorderTestItemsInput): Promise<TestItem[]> {
    const { updates } = data

    return this.prisma.$transaction(
      updates.map((update) =>
        this.prisma.testItem.update({
          where: { id: update.id },
          data: { order: update.newOrder },
        }),
      ),
    )
  }

  // ===== Advanced Operations =====

  async copyItems(itemIds: number[], data: CopyTestItemsInput): Promise<TestItem[]> {
    const { targetSectionId, maintainOrder = true } = data

    // Get source items
    const sourceItems = await this.prisma.testItem.findMany({
      where: { id: { in: itemIds } },
      orderBy: { order: 'asc' },
    })

    if (sourceItems.length === 0) return []

    let startOrder = 0
    if (maintainOrder) {
      const maxOrder = await this.getMaxOrderInSection(targetSectionId)
      startOrder = maxOrder + 1
    }

    // Create new items in target section
    const newItems = sourceItems.map((item, index) => ({
      sectionId: targetSectionId,
      questionId: item.questionId,
      order: maintainOrder ? startOrder + index : index,
    }))

    return this.prisma.$transaction(newItems.map((item) => this.prisma.testItem.create({ data: item })))
  }

  async moveItems(itemIds: number[], data: MoveTestItemsInput): Promise<TestItem[]> {
    const { targetSectionId, newOrder } = data

    // Get source items
    const sourceItems = await this.prisma.testItem.findMany({
      where: { id: { in: itemIds } },
      orderBy: { order: 'asc' },
    })

    if (sourceItems.length === 0) return []

    let startOrder = newOrder || 0
    if (newOrder === undefined) {
      const maxOrder = await this.getMaxOrderInSection(targetSectionId)
      startOrder = maxOrder + 1
    }

    // Update items to target section
    return this.prisma.$transaction(
      sourceItems.map((item, index) =>
        this.prisma.testItem.update({
          where: { id: item.id },
          data: {
            sectionId: targetSectionId,
            order: startOrder + index,
          },
        }),
      ),
    )
  }

  // ===== Statistics =====

  async getStatsBySection(sectionId: number): Promise<{
    totalItems: number
    itemsByType: Record<string, number>
    avgDifficulty?: number
    estimatedDurationMinutes?: number
  }> {
    const [totalItems, itemsByType, avgStats] = await Promise.all([
      this.prisma.testItem.count({
        where: { sectionId },
      }),
      this.prisma.testItem.groupBy({
        by: ['questionId'],
        where: { sectionId },
        _count: true,
      }),
      this.prisma.testItem.aggregate({
        where: { sectionId },
        _avg: {
          // Assuming we might add difficulty to TestItem later
        },
      }),
    ])

    // Get question types for items
    const items = await this.prisma.testItem.findMany({
      where: { sectionId },
      include: {
        question: {
          select: { type: true, difficulty: true },
        },
      },
    })

    const typeCount: Record<string, number> = {}
    const difficultyMap = { EASY: 1, MEDIUM: 2, HARD: 3 }
    let totalDifficulty = 0
    let difficultyCount = 0

    for (const item of items) {
      const type = item.question.type
      typeCount[type] = (typeCount[type] || 0) + 1

      if (item.question.difficulty && difficultyMap[item.question.difficulty as keyof typeof difficultyMap]) {
        totalDifficulty += difficultyMap[item.question.difficulty as keyof typeof difficultyMap]
        difficultyCount++
      }
    }

    const avgDifficulty = difficultyCount > 0 ? totalDifficulty / difficultyCount : undefined
    const estimatedDurationMinutes = totalItems * 1.5 // Rough estimate: 1.5 minutes per item

    return {
      totalItems,
      itemsByType: typeCount,
      avgDifficulty,
      estimatedDurationMinutes,
    }
  }

  // ===== Helper Methods =====

  private async getMaxOrderInSection(sectionId: number): Promise<number> {
    const result = await this.prisma.testItem.aggregate({
      where: { sectionId },
      _max: { order: true },
    })
    return result._max.order || -1
  }

  async exists(id: number): Promise<boolean> {
    const count = await this.prisma.testItem.count({
      where: { id },
    })
    return count > 0
  }

  async sectionExists(sectionId: number): Promise<boolean> {
    const count = await this.prisma.testSection.count({
      where: { id: sectionId },
    })
    return count > 0
  }

  async questionExists(questionId: number): Promise<boolean> {
    const count = await this.prisma.question.count({
      where: { id: questionId },
    })
    return count > 0
  }

  async isQuestionInSection(questionId: number, sectionId: number): Promise<boolean> {
    const count = await this.prisma.testItem.count({
      where: { questionId, sectionId },
    })
    return count > 0
  }

  async getBySectionId(sectionId: number): Promise<TestItem[]> {
    return this.prisma.testItem.findMany({
      where: { sectionId },
      orderBy: { order: 'asc' },
    })
  }

  async countBySectionId(sectionId: number): Promise<number> {
    return this.prisma.testItem.count({
      where: { sectionId },
    })
  }
}
