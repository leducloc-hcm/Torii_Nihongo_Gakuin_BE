import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../shared/services/prisma.service'
import { AssessmentItem } from '@prisma/client'
import {
  AssessmentItemWithDetails,
  CreateAssessmentItemInput,
  CreateAssessmentItemWithTypeInput,
  UpdateAssessmentItemInput,
  AssessmentItemQuery,
  ReorderAssessmentItemsInput,
  BulkCreateAssessmentItemsInput,
  BulkDeleteAssessmentItemsInput,
  CopyAssessmentItemsInput,
  MoveAssessmentItemsInput,
  AssessmentItemStats,
  getScorePerQuestion,
  validateScorePerQuestion,
  ASSESSMENT_ITEM_CONSTRAINTS,
} from './assessment-item.model'

@Injectable()
export class AssessmentItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAssessmentItemInput): Promise<AssessmentItem> {
    // If order not provided, assign next available order
    if (data.order === undefined) {
      const maxOrder = await this.getMaxOrderInSection(data.sectionId)
      data.order = maxOrder + 1
    }

    // Get assessment type for scoring validation
    const assessmentType = data.assessmentType || (await this.getAssessmentType(data.sectionId)) || 'TEST'

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

    if (data.name) {
      createData.name = data.name
    }

    if (data.timeLimitSec) {
      createData.timeLimitSec = data.timeLimitSec
    }

    // Handle scorePerQuestion based on assessment type
    try {
      const scorePerQuestion = getScorePerQuestion(assessmentType, data.scorePerQuestion)
      createData.scorePerQuestion = scorePerQuestion
    } catch (error) {
      throw new Error(`Invalid scorePerQuestion for ${assessmentType} type: ${error.message}`)
    }

    return this.prisma.assessmentItem.create({
      data: createData,
    })
  }

  async createWithTypeValidation(data: CreateAssessmentItemWithTypeInput): Promise<AssessmentItem> {
    // Validate scorePerQuestion based on assessment type
    const validation = validateScorePerQuestion(data.assessmentType, data.scorePerQuestion)
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid scorePerQuestion')
    }

    // If order not provided, assign next available order
    if (data.order === undefined) {
      const maxOrder = await this.getMaxOrderInSection(data.sectionId)
      data.order = maxOrder + 1
    }

    const createData: any = {
      sectionId: data.sectionId,
      order: data.order,
      scorePerQuestion: validation.defaultValue,
    }

    if (data.questionId) {
      createData.questionId = data.questionId
    }

    if (data.questionGroupId) {
      createData.questionGroupId = data.questionGroupId
    }

    if (data.name) {
      createData.name = data.name
    }

    if (data.timeLimitSec) {
      createData.timeLimitSec = data.timeLimitSec
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
    // If scorePerQuestion is being updated, validate it against assessment type
    if (data.scorePerQuestion !== undefined) {
      const item = await this.findById(id)
      if (!item) {
        throw new Error('Assessment item not found')
      }

      const assessmentType = data.assessmentType || (await this.getAssessmentType(item.sectionId)) || 'TEST'

      // Validate scorePerQuestion based on assessment type
      const validation = validateScorePerQuestion(assessmentType, data.scorePerQuestion)
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid scorePerQuestion')
      }

      // Update with validated value
      data.scorePerQuestion = validation.defaultValue
    }

    // Remove assessmentType from data as it's not a database field
    const { assessmentType, ...updateData } = data

    return await this.prisma.assessmentItem.update({
      where: { id },
      data: updateData,
    })
  }

  async updateScoring(id: number, scorePerQuestion: number, assessmentType?: 'TEST' | 'EXAM'): Promise<AssessmentItem> {
    // Get current item to fetch assessment type if not provided
    const item = await this.findById(id)
    if (!item) {
      throw new Error('Assessment item not found')
    }

    const finalAssessmentType = assessmentType || (await this.getAssessmentType(item.sectionId)) || 'TEST'

    // Validate scorePerQuestion for the assessment type
    const validation = validateScorePerQuestion(finalAssessmentType, scorePerQuestion)
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid scorePerQuestion for assessment type')
    }

    return await this.prisma.assessmentItem.update({
      where: { id },
      data: {
        scorePerQuestion: validation.defaultValue,
      },
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

        if (item.name) {
          createData.name = item.name
        }

        if (item.timeLimitSec) {
          createData.timeLimitSec = item.timeLimitSec
        }

        if (item.scorePerQuestion !== undefined) {
          createData.scorePerQuestion = item.scorePerQuestion
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

    for (const item of items) {
      if (item.question) {
        const type = item.question.type
        typeCount[type] = (typeCount[type] || 0) + 1
      } else if (item.questionGroup) {
        const type = item.questionGroup.type
        typeCount[type] = (typeCount[type] || 0) + 1
      }
    }

    const estimatedDurationMinutes = totalItems * 1.5 // Rough estimate: 1.5 minutes per item

    // Calculate total score based on assessment type
    const section = await this.prisma.assessmentSection.findUnique({
      where: { id: sectionId },
      include: {
        assessment: {
          select: { type: true },
        },
      },
    })

    let totalScore = 0
    let avgScore = 0

    if (section?.assessment.type === 'EXAM') {
      // For EXAM type, calculate total score
      for (const item of items) {
        const scorePerQuestion = item.scorePerQuestion || 1.0
        let questionCount = 1

        if (item.questionGroupId) {
          // Count questions in group (many-to-many relation)
          const questionGroup = await this.prisma.questionGroup.findUnique({
            where: { id: item.questionGroupId },
            include: {
              questions: {
                select: { questionId: true },
              },
            },
          })
          questionCount = questionGroup?.questions.length || 1
        }

        totalScore += scorePerQuestion * questionCount
      }

      avgScore = totalItems > 0 ? totalScore / totalItems : 0
    }

    return {
      totalItems,
      itemsByType: typeCount,
      totalScore,
      avgScore: avgScore > 0 ? avgScore : undefined,
      estimatedDurationMinutes,
    }
  }

  // ===== Helper Methods =====

  async getAssessmentType(sectionId: number): Promise<'TEST' | 'EXAM' | null> {
    const section = await this.prisma.assessmentSection.findUnique({
      where: { id: sectionId },
      include: {
        assessment: {
          select: { type: true },
        },
      },
    })

    return section?.assessment.type as 'TEST' | 'EXAM' | null
  }

  async getQuestionCountInGroup(questionGroupId: number): Promise<number> {
    const questionGroup = await this.prisma.questionGroup.findUnique({
      where: { id: questionGroupId },
      include: {
        questions: {
          select: { questionId: true },
        },
      },
    })

    return questionGroup?.questions.length || 0
  }

  async calculateItemTotalScore(item: AssessmentItemWithDetails, assessmentType?: 'TEST' | 'EXAM'): Promise<number> {
    // If assessment type not provided, fetch it
    if (!assessmentType) {
      assessmentType = (await this.getAssessmentType(item.sectionId)) || 'TEST'
    }

    // For TEST type: use scorePerQuestion but don't calculate total score for assessment grading
    // (scorePerQuestion is stored for individual question scoring but total assessment score stays 0)
    if (assessmentType === 'TEST') {
      return 0 // TEST assessments don't contribute to total score calculation
    }

    // For EXAM type, calculate score based on scorePerQuestion * questionCount
    const scorePerQuestion = item.scorePerQuestion || 0
    let questionCount = 1

    if (item.questionId) {
      questionCount = 1
    } else if (item.questionGroupId) {
      questionCount = await this.getQuestionCountInGroup(item.questionGroupId)
    }

    return scorePerQuestion * questionCount
  }

  async calculateItemScoring(item: AssessmentItemWithDetails, assessmentType?: 'TEST' | 'EXAM') {
    // If assessment type not provided, fetch it
    if (!assessmentType) {
      assessmentType = (await this.getAssessmentType(item.sectionId)) || 'TEST'
    }

    let questionCount = 1
    if (item.questionId) {
      questionCount = 1
    } else if (item.questionGroupId) {
      questionCount = await this.getQuestionCountInGroup(item.questionGroupId)
    }

    const scorePerQuestion =
      item.scorePerQuestion ||
      (assessmentType === 'TEST' ? ASSESSMENT_ITEM_CONSTRAINTS.DEFAULT_TEST_SCORE_PER_QUESTION : 0)
    const totalScore = assessmentType === 'TEST' ? 0 : scorePerQuestion * questionCount

    return {
      totalQuestions: questionCount,
      totalScore,
      scorePerQuestion,
      isTestType: assessmentType === 'TEST',
      assessmentType,
    }
  }

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
    // Get questions through many-to-many relation
    const questionGroupQuestions = await this.prisma.questionGroupQuestion.findMany({
      where: { groupId: questionGroupId },
      select: {
        questionId: true,
      },
      orderBy: { order: 'asc' },
    })

    return questionGroupQuestions.map((qgq) => ({ id: qgq.questionId }))
  }
}
