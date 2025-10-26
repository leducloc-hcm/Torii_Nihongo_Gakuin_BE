import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../../shared/services/prisma.service'
import { QuizItem, Prisma } from '@prisma/client'
import {
  QuizItemWithRelations,
  CreateQuizItemInput,
  UpdateQuizItemInput,
  QuizItemQuery,
  QUIZ_ITEM_ERRORS,
} from './quiz-item.model'

@Injectable()
export class QuizItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateQuizItemInput): Promise<QuizItem> {
    // Check if quiz exists
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: data.quizId },
    })
    if (!quiz) {
      throw new NotFoundException(QUIZ_ITEM_ERRORS.QUIZ_NOT_FOUND)
    }

    // Destructure to separate junction data from item data
    const { questionIds, questionGroupIds, ...itemData } = data

    // Set order if not provided
    let order = itemData.order ?? 0
    if (order === 0) {
      const lastItem = await this.prisma.quizItem.findFirst({
        where: { quizId: itemData.quizId },
        orderBy: { order: 'desc' },
      })
      order = (lastItem?.order ?? -1) + 1
    }

    return await this.prisma.quizItem.create({
      data: {
        ...itemData,
        order,
        questions: questionIds?.length
          ? {
              create: questionIds.map((questionId, index) => ({
                questionId,
                order: index,
              })),
            }
          : undefined,
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
              },
            },
          },
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
        },
      },
    })
  }

  async findById(id: number): Promise<QuizItem | null> {
    return await this.prisma.quizItem.findUnique({
      where: { id },
    })
  }

  async findByIdWithRelations(id: number) {
    return await this.prisma.quizItem.findUnique({
      where: { id },
      include: {
        quiz: {
          include: {
            author: true,
            items: {
              include: {
                questions: {
                  include: {
                    question: {
                      include: {
                        quizItems: {
                          include: {
                            question: {
                              include: {
                                option: {
                                  select: {
                                    id: true,
                                    image: true,
                                    content: true,
                                    mediaId: true,
                                  },
                                },
                                media: true,
                              },
                            },
                          },
                        },
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

  async findMany(query: QuizItemQuery): Promise<{
    data: QuizItemWithRelations[]
    pagination: {
      total: number
      page: number
      limit: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }> {
    // Parse query params to ensure they are numbers
    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 20
    const quizId = query.quizId ? Number(query.quizId) : undefined
    const questionId = query.questionId ? Number(query.questionId) : undefined
    const { sortBy = 'order', sortOrder = 'asc' } = query

    const skip = (page - 1) * limit

    const where: Prisma.QuizItemWhereInput = {}

    if (quizId !== undefined) {
      where.quizId = quizId
    }

    if (questionId !== undefined) {
      where.questions = {
        some: {
          questionId,
        },
      }
    }

    const orderBy: Prisma.QuizItemOrderByWithRelationInput = {}
    if (sortBy === 'id') {
      orderBy.id = sortOrder
    } else if (sortBy === 'order') {
      orderBy.order = sortOrder
    }

    const [items, total] = await Promise.all([
      this.prisma.quizItem.findMany({
        where,
        include: {
          questions: {
            include: {
              question: true,
            },
          },
          questionGroups: {
            include: {
              group: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.quizItem.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

    return {
      data: items as QuizItemWithRelations[],
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    }
  }

  async update(id: number, data: UpdateQuizItemInput): Promise<QuizItem> {
    const quizItem = await this.findById(id)
    if (!quizItem) {
      throw new NotFoundException(QUIZ_ITEM_ERRORS.NOT_FOUND)
    }

    const { questionIds, questionGroupIds, ...updateData } = data

    return await this.prisma.quizItem.update({
      where: { id },
      data: {
        ...updateData,
        ...(questionIds && {
          questions: {
            deleteMany: {},
            create: questionIds.map((questionId, index) => ({
              questionId,
              order: index,
            })),
          },
        }),
        ...(questionGroupIds && {
          questionGroups: {
            deleteMany: {},
            create: questionGroupIds.map((groupId, index) => ({
              groupId,
              order: index,
            })),
          },
        }),
      },
    })
  }

  async delete(id: number): Promise<void> {
    const quizItem = await this.findById(id)
    if (!quizItem) {
      throw new NotFoundException(QUIZ_ITEM_ERRORS.NOT_FOUND)
    }

    await this.prisma.quizItem.delete({
      where: { id },
    })
  }

  async bulkAddQuestions(quizId: number, questionIds: number[]): Promise<{ added: number; skipped: number }> {
    // Check if quiz exists
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
    })
    if (!quiz) {
      throw new NotFoundException(QUIZ_ITEM_ERRORS.QUIZ_NOT_FOUND)
    }

    // Validate all questions exist
    const questions = await this.prisma.question.findMany({
      where: { id: { in: questionIds } },
    })
    if (questions.length !== questionIds.length) {
      throw new NotFoundException(QUIZ_ITEM_ERRORS.QUESTION_NOT_FOUND)
    }

    // Get next order number
    const lastItem = await this.prisma.quizItem.findFirst({
      where: { quizId },
      orderBy: { order: 'desc' },
    })
    const nextOrder = (lastItem?.order ?? -1) + 1

    // Create quiz items with questions
    const created = await Promise.all(
      questionIds.map((questionId, index) =>
        this.prisma.quizItem.create({
          data: {
            quizId,
            order: nextOrder + index,
            questions: {
              create: {
                questionId,
                order: 0,
              },
            },
          },
        }),
      ),
    )

    return { added: created.length, skipped: 0 }
  }

  async reorderQuizItems(quizId: number, items: Array<{ id: number; order: number }>): Promise<void> {
    // Check if quiz exists
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
    })
    if (!quiz) {
      throw new NotFoundException(QUIZ_ITEM_ERRORS.QUIZ_NOT_FOUND)
    }

    // Validate all items belong to the quiz
    const quizItems = await this.prisma.quizItem.findMany({
      where: {
        quizId,
        id: { in: items.map((item) => item.id) },
      },
    })
    if (quizItems.length !== items.length) {
      throw new NotFoundException(QUIZ_ITEM_ERRORS.NOT_FOUND)
    }

    // Update orders in transaction
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.quizItem.update({
          where: { id: item.id },
          data: { order: item.order },
        }),
      ),
    )
  }
}
