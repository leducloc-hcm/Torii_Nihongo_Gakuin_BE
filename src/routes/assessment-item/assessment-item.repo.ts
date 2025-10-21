// ===== AssessmentItem Repository =====
// Database operations for AssessmentItem entity
// Handles CRUD operations, bulk operations, and complex queries

import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../shared/services/prisma.service'
import { AssessmentItem } from '@prisma/client'
import {
  AssessmentItemWithDetails,
  CreateAssessmentItemInput,
  UpdateAssessmentItemInput,
  AssessmentItemQuery,
  ReorderAssessmentItemsInput,
  BulkCreateAssessmentItemsInput,
  BulkDeleteAssessmentItemsInput,
  CopyAssessmentItemsInput,
  MoveAssessmentItemsInput,
  AssessmentItemStats,
} from './assessment-item.model'

@Injectable()
export class AssessmentItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ===== Basic CRUD Operations =====

  async create(data: CreateAssessmentItemInput): Promise<AssessmentItem> {
    // If order not provided, assign next available order
    if (data.order === undefined) {
      const maxOrder = await this.getMaxOrderInSection(data.sectionId)
      data.order = maxOrder + 1
    }

    // Create the data object with proper typing
    const createData: any = {
      sectionId: data.sectionId,
      order: data.order,
    }

    if (data.questionId) {
      createData.questionId = data.questionId
    }

    if (data.questionGroupId) {
      createData.questionGroupId = data.questionGroupId
    }

    if (data.score) {
      createData.score = data.score
    }

    return this.prisma.assessmentItem.create({
      data: createData,
    })
  }

  async findById(
    id: number,
    includeRelations?: { question?: boolean; section?: boolean; questionGroup?: boolean },
  ): Promise<AssessmentItemWithDetails | null> {
    return this.prisma.assessmentItem.findUnique({
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
        questionGroup: includeRelations?.questionGroup
          ? {
              select: {
                id: true,
                title: true,
                type: true,
              },
            }
          : false,
        section: includeRelations?.section
          ? {
              select: {
                id: true,
                title: true,
                assessmentId: true,
                type: true,
              },
            }
          : false,
      },
    }) as Promise<AssessmentItemWithDetails | null>
  }

  async findMany(query: AssessmentItemQuery): Promise<{
    items: AssessmentItemWithDetails[]
    total: number
  }> {
    const {
      sectionId,
      questionId,
      questionGroupId,
      minOrder,
      maxOrder,
      includeQuestion = false,
      includeSection = false,
      includeQuestionGroup = false,
      page = 1,
      limit = 20,
      sortBy = 'order',
      sortOrder = 'asc',
    } = query

    const where: any = {}

    if (sectionId !== undefined) where.sectionId = sectionId
    if (questionId !== undefined) where.questionId = questionId
    if (questionGroupId !== undefined) where.questionGroupId = questionGroupId
    if (minOrder !== undefined || maxOrder !== undefined) {
      where.order = {}
      if (minOrder !== undefined) where.order.gte = minOrder
      if (maxOrder !== undefined) where.order.lte = maxOrder
    }

    const orderBy: any = {}
    orderBy[sortBy] = sortOrder

    const [items, total] = await Promise.all([
      this.prisma.assessmentItem.findMany({
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
          questionGroup: includeQuestionGroup
            ? {
                select: {
                  id: true,
                  title: true,
                  type: true,
                },
              }
            : false,
          section: includeSection
            ? {
                select: {
                  id: true,
                  title: true,
                  assessmentId: true,
                  type: true,
                },
              }
            : false,
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.assessmentItem.count({ where }),
    ])

    return { items: items as AssessmentItemWithDetails[], total }
  }

  async update(id: number, data: UpdateAssessmentItemInput): Promise<AssessmentItem> {
    return await this.prisma.assessmentItem.update({
      where: { id },
      data,
    })
  }

  async delete(id: number): Promise<AssessmentItem> {
    return await this.prisma.assessmentItem.delete({
      where: { id },
    })
  }

  // ===== Bulk Operations =====

  async bulkCreate(data: BulkCreateAssessmentItemsInput): Promise<AssessmentItem[]> {
    const { items } = data

    // Group items by sectionId for efficient order assignment
    const itemsBySection = new Map<number, CreateAssessmentItemInput[]>()

    for (const item of items) {
      const sectionItems = itemsBySection.get(item.sectionId) || []
      sectionItems.push(item)
      itemsBySection.set(item.sectionId, sectionItems)
    }

    // Assign orders for items without order specified
    const itemsToCreate: CreateAssessmentItemInput[] = []

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
    return this.prisma.$transaction(
      itemsToCreate.map((item) => {
        const createData: any = {
          sectionId: item.sectionId,
          order: item.order,
        }

        if (item.questionId) {
          createData.questionId = item.questionId
        }

        if (item.questionGroupId) {
          createData.questionGroupId = item.questionGroupId
        }

        if (item.score) {
          createData.score = item.score
        }

        return this.prisma.assessmentItem.create({ data: createData })
      }),
    )
  }

  async bulkDelete(data: BulkDeleteAssessmentItemsInput): Promise<{ count: number }> {
    const result = await this.prisma.assessmentItem.deleteMany({
      where: {
        id: { in: data.ids },
      },
    })
    return result
  }

  async reorder(data: ReorderAssessmentItemsInput): Promise<AssessmentItem[]> {
    const { items } = data

    return await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.assessmentItem.update({
          where: { id: item.id },
          data: { order: item.order },
        }),
      ),
    )
  }

  // ===== Advanced Operations =====

  async copyItems(itemIds: number[], data: CopyAssessmentItemsInput): Promise<AssessmentItem[]> {
    const { targetSectionId, maintainOrder = true } = data

    // Get source items
    const sourceItems = await this.prisma.assessmentItem.findMany({
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
    return this.prisma.$transaction(
      sourceItems.map((item, index) => {
        const createData: any = {
          sectionId: targetSectionId,
          order: maintainOrder ? startOrder + index : index,
        }

        if (item.questionId) {
          createData.questionId = item.questionId
        }

        if (item.questionGroupId) {
          createData.questionGroupId = item.questionGroupId
        }

        if (item.score) {
          createData.score = item.score
        }

        return this.prisma.assessmentItem.create({ data: createData })
      }),
    )
  }

  async moveItems(itemIds: number[], data: MoveAssessmentItemsInput): Promise<AssessmentItem[]> {
    const { targetSectionId, newOrder } = data

    // Get source items
    const sourceItems = await this.prisma.assessmentItem.findMany({
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
        this.prisma.assessmentItem.update({
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

  async getStatsBySection(sectionId: number): Promise<AssessmentItemStats> {
    const [totalItems, itemsByType, avgStats] = await Promise.all([
      this.prisma.assessmentItem.count({
        where: { sectionId },
      }),
      this.prisma.assessmentItem.groupBy({
        by: ['questionId'],
        where: { sectionId },
        _count: true,
      }),
      this.prisma.assessmentItem.aggregate({
        where: { sectionId },
        _avg: {
          score: true,
        },
        _sum: {
          score: true,
        },
      }),
    ])

    // Get question types for items
    const items = await this.prisma.assessmentItem.findMany({
      where: { sectionId },
      include: {
        question: {
          select: { type: true },
        },
        questionGroup: {
          select: { type: true },
        },
      },
    })

    const typeCount: Record<string, number> = {}
    let totalScore = 0

    for (const item of items) {
      if (item.question) {
        const type = item.question.type
        typeCount[type] = (typeCount[type] || 0) + 1
      } else if (item.questionGroup) {
        const type = item.questionGroup.type
        typeCount[type] = (typeCount[type] || 0) + 1
      }

      if (item.score) {
        totalScore += item.score
      }
    }

    const estimatedDurationMinutes = totalItems * 1.5 // Rough estimate: 1.5 minutes per item

    return {
      totalItems,
      itemsByType: typeCount,
      totalScore: avgStats._sum.score || totalScore,
      avgScore: avgStats._avg.score || undefined,
      estimatedDurationMinutes,
    }
  }

  // ===== Helper Methods =====

  async getMaxOrderInSection(sectionId: number): Promise<number> {
    const result = await this.prisma.assessmentItem.aggregate({
      where: { sectionId },
      _max: { order: true },
    })
    return result._max.order || -1
  }

  async getNextOrderForSection(sectionId: number): Promise<number> {
    const maxOrder = await this.getMaxOrderInSection(sectionId)
    return maxOrder + 1
  }

  async exists(id: number): Promise<boolean> {
    const count = await this.prisma.assessmentItem.count({
      where: { id },
    })
    return count > 0
  }

  async sectionExists(sectionId: number): Promise<boolean> {
    const count = await this.prisma.assessmentSection.count({
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

  async questionGroupExists(questionGroupId: number): Promise<boolean> {
    const count = await this.prisma.questionGroup.count({
      where: { id: questionGroupId },
    })
    return count > 0
  }

  async isQuestionInSection(questionId: number, sectionId: number): Promise<boolean> {
    const count = await this.prisma.assessmentItem.count({
      where: { questionId, sectionId },
    })
    return count > 0
  }

  async getBySectionId(sectionId: number): Promise<AssessmentItemWithDetails[]> {
    return (await this.prisma.assessmentItem.findMany({
      where: { sectionId },
      include: {
        question: {
          select: {
            id: true,
            stem: true,
            type: true,
            difficulty: true,
            level: true,
          },
        },
        questionGroup: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
        section: {
          select: {
            id: true,
            title: true,
            assessmentId: true,
            type: true,
          },
        },
      },
      orderBy: { order: 'asc' },
    })) as AssessmentItemWithDetails[]
  }

  async countBySectionId(sectionId: number): Promise<number> {
    return await this.prisma.assessmentItem.count({
      where: { sectionId },
    })
  }

  async getQuestionsFromGroup(questionGroupId: number): Promise<{ id: number }[]> {
    const questions = await this.prisma.question.findMany({
      where: { questionGroupId },
      select: { id: true },
      orderBy: { id: 'asc' },
    })
    return questions
  }
}
