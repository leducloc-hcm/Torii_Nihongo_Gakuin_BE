import { Injectable } from '@nestjs/common'
import { CreateAssessmentItemDto, UpdateAssessmentItemDto } from './assessment-item.dto'
import { PrismaService } from 'src/shared/services/prisma.service'

@Injectable()
export class AssessmentItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAssessmentItemDto) {
    const { questionIds, questionGroupIds, ...itemData } = data

    return await this.prisma.assessmentItem.create({
      data: {
        ...itemData,
        // Many-to-many với Questions
        questions: questionIds?.length
          ? {
              create: questionIds.map((questionId, index) => ({
                questionId,
                order: index,
              })),
            }
          : undefined,
        // Many-to-many với QuestionGroups
        questionGroups: questionGroupIds?.length
          ? {
              create: questionGroupIds.map((groupId, index) => ({
                groupId,
                order: index,
              })),
            }
          : undefined,
      },
      include: {
        questions: {
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
          },
          orderBy: { order: 'asc' },
        },
        questionGroups: {
          include: {
            group: {
              select: {
                id: true,
                title: true,
                type: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    })
  }

  async findById(id: number) {
    return await this.prisma.assessmentItem.findUnique({
      where: { id },
      include: {
        questions: {
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
          },
          orderBy: { order: 'asc' },
        },
        questionGroups: {
          include: {
            group: {
              select: {
                id: true,
                title: true,
                type: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    })
  }

  async findMany({
    page,
    limit,
    sectionId,
    sortBy,
    sortOrder,
  }: {
    page: number
    limit: number
    sectionId?: number
    sortBy: 'id' | 'order' | 'name' | 'createdAt'
    sortOrder: 'asc' | 'desc'
  }) {
    const where = sectionId ? { sectionId } : {}

    const [data, total] = await Promise.all([
      this.prisma.assessmentItem.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          questions: {
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
            },
            orderBy: { order: 'asc' },
          },
          questionGroups: {
            include: {
              group: {
                select: {
                  id: true,
                  title: true,
                  type: true,
                },
              },
            },
            orderBy: { order: 'asc' },
          },
        },
      }),
      this.prisma.assessmentItem.count({ where }),
    ])

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async update(id: number, data: UpdateAssessmentItemDto) {
    const { questionIds, questionGroupIds, ...itemData } = data

    // Delete old relationships if new ones provided
    if (questionIds !== undefined) {
      await this.prisma.assessmentItemQuestion.deleteMany({
        where: { itemId: id },
      })
    }

    if (questionGroupIds !== undefined) {
      await this.prisma.assessmentItemGroup.deleteMany({
        where: { itemId: id },
      })
    }

    return this.prisma.assessmentItem.update({
      where: { id },
      data: {
        ...itemData,
        // Recreate many-to-many với Questions
        questions: questionIds?.length
          ? {
              create: questionIds.map((questionId, index) => ({
                questionId,
                order: index,
              })),
            }
          : undefined,
        // Recreate many-to-many với QuestionGroups
        questionGroups: questionGroupIds?.length
          ? {
              create: questionGroupIds.map((groupId, index) => ({
                groupId,
                order: index,
              })),
            }
          : undefined,
      },
      include: {
        questions: {
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
          },
          orderBy: { order: 'asc' },
        },
        questionGroups: {
          include: {
            group: {
              select: {
                id: true,
                title: true,
                type: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    })
  }

  async delete(id: number) {
    return await this.prisma.assessmentItem.delete({
      where: { id },
    })
  }
}
