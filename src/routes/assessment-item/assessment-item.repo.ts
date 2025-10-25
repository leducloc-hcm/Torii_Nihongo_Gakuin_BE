import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../shared/services/prisma.service'
import { AssessmentItem } from '@prisma/client'
import { AssessmentItemWithDetails } from './assessment-item.model'

export interface CreateAssessmentItemInput {
  sectionId: number
  questionId?: number
  questionGroupId?: number
  order?: number
  name?: string
  timeLimitSec?: number
  scorePerQuestion?: number
}

export interface UpdateAssessmentItemInput {
  questionId?: number
  questionGroupId?: number
  order?: number
  name?: string
  timeLimitSec?: number
  scorePerQuestion?: number
}

export interface AssessmentItemQuery {
  page?: number
  limit?: number
  sectionId?: number
  questionId?: number
  questionGroupId?: number
  minOrder?: number
  maxOrder?: number
  includeQuestion?: boolean
  includeSection?: boolean
  includeQuestionGroup?: boolean
  sortBy?: string
  sortOrder?: string
}

@Injectable()
export class AssessmentItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAssessmentItemInput): Promise<AssessmentItem> {
    if (data.order === undefined) {
      const maxOrder = await this.getMaxOrderInSection(data.sectionId)
      data.order = maxOrder + 1
    }

    return this.prisma.assessmentItem.create({
      data: {
        sectionId: data.sectionId,
        questionId: data.questionId,
        questionGroupId: data.questionGroupId,
        order: data.order,
        name: data.name,
        timeLimitSec: data.timeLimitSec,
        scorePerQuestion: data.scorePerQuestion,
      },
      include: {
        questionGroup: {
          include: {
            questions: {
              include: {
                question: {
                  select: {
                    id: true,
                    stem: true,
                    level: true,
                    type: true,
                    difficulty: true,
                    media: {
                      select: {
                        id: true,
                        url: true,
                        kind: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
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

  async exists(id: number): Promise<boolean> {
    const count = await this.prisma.assessmentItem.count({
      where: { id },
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

  async getMaxOrderInSection(sectionId: number): Promise<number> {
    const result = await this.prisma.assessmentItem.aggregate({
      where: { sectionId },
      _max: { order: true },
    })
    return result._max.order || -1
  }
}
