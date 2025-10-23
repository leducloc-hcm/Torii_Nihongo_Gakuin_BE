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

    // Check if question exists
    const question = await this.prisma.question.findUnique({
      where: { id: data.questionId },
    })
    if (!question) {
      throw new NotFoundException(QUIZ_ITEM_ERRORS.QUESTION_NOT_FOUND)
    }

    // Check if question group exists (if provided)
    if (data.questionGroupId) {
      const questionGroup = await this.prisma.questionGroup.findUnique({
        where: { id: data.questionGroupId },
      })
      if (!questionGroup) {
        throw new NotFoundException(QUIZ_ITEM_ERRORS.QUESTION_GROUP_NOT_FOUND)
      }
    }

    // Check for duplicate question in quiz
    const existing = await this.prisma.quizItem.findFirst({
      where: {
        quizId: data.quizId,
        questionId: data.questionId,
      },
    })
    if (existing) {
      throw new ConflictException(QUIZ_ITEM_ERRORS.DUPLICATE_QUESTION)
    }

    // Set order if not provided
    let order = data.order ?? 0
    if (order === 0) {
      const lastItem = await this.prisma.quizItem.findFirst({
        where: { quizId: data.quizId },
        orderBy: { order: 'desc' },
      })
      order = (lastItem?.order ?? -1) + 1
    }

    return await this.prisma.quizItem.create({
      data: {
        ...data,
        order,
      },
    })
  }

  async findById(id: number): Promise<QuizItem | null> {
    return await this.prisma.quizItem.findUnique({
      where: { id },
    })
  }

  async findByIdWithRelations(id: number): Promise<QuizItemWithRelations | null> {
    return (await this.prisma.quizItem.findUnique({
      where: { id },
      include: {
        question: {
          include: {
            option: true,
          },
        },
        questionGroup: true,
      },
    })) as QuizItemWithRelations | null
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
    const { page = 1, limit = 20, quizId, questionId, sortBy = 'order', sortOrder = 'asc' } = query

    const skip = (page - 1) * limit

    const where: Prisma.QuizItemWhereInput = {}

    if (quizId !== undefined) {
      where.quizId = quizId
    }

    if (questionId !== undefined) {
      where.questionId = questionId
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
          question: {
            include: {
              option: true,
            },
          },
          questionGroup: true,
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

    // Check if question group exists (if provided)
    if (data.questionGroupId) {
      const questionGroup = await this.prisma.questionGroup.findUnique({
        where: { id: data.questionGroupId },
      })
      if (!questionGroup) {
        throw new NotFoundException(QUIZ_ITEM_ERRORS.QUESTION_GROUP_NOT_FOUND)
      }
    }

    return await this.prisma.quizItem.update({
      where: { id },
      data,
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

    // Get existing questions in quiz
    const existingItems = await this.prisma.quizItem.findMany({
      where: { quizId },
      select: { questionId: true },
    })
    const existingQuestionIds = existingItems.map((item) => item.questionId)

    // Filter out existing questions
    const newQuestionIds = questionIds.filter((qId) => !existingQuestionIds.includes(qId))

    if (newQuestionIds.length === 0) {
      return { added: 0, skipped: questionIds.length }
    }

    // Get next order number
    const lastItem = await this.prisma.quizItem.findFirst({
      where: { quizId },
      orderBy: { order: 'desc' },
    })
    let nextOrder = (lastItem?.order ?? -1) + 1

    // Create quiz items
    const itemsData = newQuestionIds.map((questionId) => ({
      quizId,
      questionId,
      order: nextOrder++,
    }))

    await this.prisma.quizItem.createMany({
      data: itemsData,
    })

    return { added: newQuestionIds.length, skipped: questionIds.length - newQuestionIds.length }
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
