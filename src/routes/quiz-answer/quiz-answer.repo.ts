import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../../shared/services/prisma.service'
import { QuizAnswer, Prisma } from '@prisma/client'
import {
  QuizAnswerWithRelations,
  QuizAnswerBasic,
  CreateQuizAnswerInput,
  UpdateQuizAnswerInput,
  QuizAnswerQuery,
  QUIZ_ANSWER_ERRORS,
} from './quiz-answer.model'

@Injectable()
export class QuizAnswerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateQuizAnswerInput): Promise<QuizAnswer> {
    // Check if attempt exists and is not submitted
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id: data.attemptId },
    })
    if (!attempt) {
      throw new NotFoundException(QUIZ_ANSWER_ERRORS.ATTEMPT_NOT_FOUND)
    }
    if (attempt.submittedAt) {
      throw new BadRequestException(QUIZ_ANSWER_ERRORS.ATTEMPT_SUBMITTED)
    }

    // Check if question exists
    const question = await this.prisma.question.findUnique({
      where: { id: data.questionId },
      include: { options: true },
    })
    if (!question) {
      throw new NotFoundException(QUIZ_ANSWER_ERRORS.QUESTION_NOT_FOUND)
    }

    // Check if option exists (if provided)
    if (data.selectedOptionId) {
      const option = await this.prisma.option.findUnique({
        where: { id: data.selectedOptionId },
      })
      if (!option) {
        throw new NotFoundException(QUIZ_ANSWER_ERRORS.OPTION_NOT_FOUND)
      }
    }

    // Check for duplicate answer
    const existing = await this.prisma.quizAnswer.findFirst({
      where: {
        attemptId: data.attemptId,
        questionId: data.questionId,
      },
    })
    if (existing) {
      throw new ConflictException(QUIZ_ANSWER_ERRORS.DUPLICATE_ANSWER)
    }

    // Calculate correctness
    let isCorrect = false
    if (data.selectedOptionId && question.options) {
      const selectedOption = question.options.find((opt) => opt.id === data.selectedOptionId)
      isCorrect = selectedOption?.isCorrect || false
    }

    return await this.prisma.quizAnswer.create({
      data: {
        attemptId: data.attemptId,
        questionId: data.questionId,
        selectedOptionId: data.selectedOptionId || null,
        isCorrect,
        explanation: data.explanation || null,
      },
    })
  }

  async findById(id: number): Promise<QuizAnswer | null> {
    return await this.prisma.quizAnswer.findUnique({
      where: { id },
    })
  }

  async findByIdWithRelations(id: number): Promise<QuizAnswerWithRelations | null> {
    return (await this.prisma.quizAnswer.findUnique({
      where: { id },
      include: {
        attempt: true,
        question: true,
        selectedOption: true,
      },
    })) as QuizAnswerWithRelations | null
  }

  async findMany(query: QuizAnswerQuery): Promise<{
    data: QuizAnswerBasic[]
    pagination: {
      total: number
      page: number
      limit: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }> {
    const { page = 1, limit = 20, attemptId, questionId, isCorrect, sortBy = 'id', sortOrder = 'asc' } = query

    const skip = (page - 1) * limit

    const where: Prisma.QuizAnswerWhereInput = {}

    if (attemptId !== undefined) {
      where.attemptId = attemptId
    }

    if (questionId !== undefined) {
      where.questionId = questionId
    }

    if (isCorrect !== undefined) {
      where.isCorrect = isCorrect
    }

    const orderBy: Prisma.QuizAnswerOrderByWithRelationInput = {}
    if (sortBy === 'id') {
      orderBy.id = sortOrder
    } else if (sortBy === 'attemptId') {
      orderBy.attemptId = sortOrder
    } else if (sortBy === 'questionId') {
      orderBy.questionId = sortOrder
    }

    const [answers, total] = await Promise.all([
      this.prisma.quizAnswer.findMany({
        where,
        include: {
          question: {
            select: { id: true, stem: true, type: true },
          },
          selectedOption: {
            select: { id: true, content: true, isCorrect: true },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.quizAnswer.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

    return {
      data: answers as QuizAnswerBasic[],
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

  async update(id: number, data: UpdateQuizAnswerInput): Promise<QuizAnswer> {
    const answer = await this.findById(id)
    if (!answer) {
      throw new NotFoundException(QUIZ_ANSWER_ERRORS.NOT_FOUND)
    }

    // Check if attempt is not submitted
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id: answer.attemptId },
    })
    if (!attempt) {
      throw new NotFoundException(QUIZ_ANSWER_ERRORS.ATTEMPT_NOT_FOUND)
    }
    if (attempt.submittedAt) {
      throw new BadRequestException(QUIZ_ANSWER_ERRORS.ATTEMPT_SUBMITTED)
    }

    // Check if option exists (if provided)
    if (data.selectedOptionId) {
      const option = await this.prisma.option.findUnique({
        where: { id: data.selectedOptionId },
      })
      if (!option) {
        throw new NotFoundException(QUIZ_ANSWER_ERRORS.OPTION_NOT_FOUND)
      }
    }

    // Recalculate correctness if option changed
    let isCorrect = answer.isCorrect
    if (data.selectedOptionId !== undefined) {
      if (data.selectedOptionId === null) {
        isCorrect = false
      } else {
        const question = await this.prisma.question.findUnique({
          where: { id: answer.questionId },
          include: { options: true },
        })
        if (question?.options) {
          const selectedOption = question.options.find((opt) => opt.id === data.selectedOptionId)
          isCorrect = selectedOption?.isCorrect || false
        }
      }
    }

    return await this.prisma.quizAnswer.update({
      where: { id },
      data: {
        selectedOptionId: data.selectedOptionId,
        explanation: data.explanation,
        isCorrect,
      },
    })
  }

  async delete(id: number): Promise<void> {
    const answer = await this.findById(id)
    if (!answer) {
      throw new NotFoundException(QUIZ_ANSWER_ERRORS.NOT_FOUND)
    }

    // Check if attempt is not submitted
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id: answer.attemptId },
    })
    if (!attempt) {
      throw new NotFoundException(QUIZ_ANSWER_ERRORS.ATTEMPT_NOT_FOUND)
    }
    if (attempt.submittedAt) {
      throw new BadRequestException(QUIZ_ANSWER_ERRORS.ATTEMPT_SUBMITTED)
    }

    await this.prisma.quizAnswer.delete({
      where: { id },
    })
  }

  async getAttemptAnswers(attemptId: number) {
    return await this.prisma.quizAnswer.findMany({
      where: { attemptId },
      include: {
        question: {
          select: { id: true, stem: true, type: true },
        },
        selectedOption: {
          select: { id: true, content: true, isCorrect: true },
        },
      },
      orderBy: { id: 'asc' },
    })
  }

  async getQuestionAnswer(attemptId: number, questionId: number) {
    return await this.prisma.quizAnswer.findFirst({
      where: { attemptId, questionId },
      include: {
        question: true,
        selectedOption: true,
      },
    })
  }
}
