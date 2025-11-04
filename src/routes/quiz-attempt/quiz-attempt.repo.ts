import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../shared/services/prisma.service'
import { QuizAttempt, Prisma } from '@prisma/client'
import {
  QuizAttemptWithRelations,
  QuizAttemptBasic,
  StartQuizAttemptInput,
  SubmitQuizAttemptInput,
  QuizAttemptQuery,
  QUIZ_ATTEMPT_ERRORS,
  QuizAttemptWithStatistics,
} from './quiz-attempt.model'

@Injectable()
export class QuizAttemptRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: StartQuizAttemptInput, userId: number): Promise<QuizAttempt> {
    // Check if quiz exists
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: data.quizId },
      include: {
        items: true,
      },
    })
    if (!quiz) {
      throw new NotFoundException(QUIZ_ATTEMPT_ERRORS.QUIZ_NOT_FOUND)
    }

    // Check if quiz has questions
    if (!quiz.items || quiz.items.length === 0) {
      throw new BadRequestException(QUIZ_ATTEMPT_ERRORS.NO_QUESTIONS)
    }

    return await this.prisma.quizAttempt.create({
      data: {
        quizId: data.quizId,
        userId,
        startedAt: new Date(),
      },
    })
  }

  async findById(id: number): Promise<QuizAttempt | null> {
    return await this.prisma.quizAttempt.findUnique({
      where: { id },
    })
  }

  async findByIdWithRelations(id: number): Promise<QuizAttemptWithRelations | null> {
    return (await this.prisma.quizAttempt.findUnique({
      where: { id },
      include: {
        quiz: {
          select: { id: true, title: true, timeLimitSec: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
        answers: {
          include: {
            question: true,
            selectedOption: true,
          },
        },
      },
    })) as QuizAttemptWithRelations | null
  }

  async findMany(query: QuizAttemptQuery): Promise<{
    data: QuizAttemptBasic[]
    pagination: {
      total: number
      page: number
      limit: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }> {
    const { page = 1, limit = 20, quizId, userId, completed, sortBy = 'startedAt', sortOrder = 'desc' } = query

    const skip = (page - 1) * limit

    const where: Prisma.QuizAttemptWhereInput = {}

    if (quizId !== undefined) {
      where.quizId = quizId
    }

    if (userId !== undefined) {
      where.userId = userId
    }

    if (completed !== undefined) {
      where.submittedAt = completed ? { not: null } : null
    }

    const orderBy: Prisma.QuizAttemptOrderByWithRelationInput = {}
    if (sortBy === 'id') {
      orderBy.id = sortOrder
    } else if (sortBy === 'startedAt') {
      orderBy.startedAt = sortOrder
    } else if (sortBy === 'submittedAt') {
      orderBy.submittedAt = sortOrder
    }

    const [attempts, total] = await Promise.all([
      this.prisma.quizAttempt.findMany({
        where,
        include: {
          quiz: {
            select: { id: true, title: true },
          },
          user: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: {
              answers: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.quizAttempt.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

    return {
      data: attempts as QuizAttemptBasic[],
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

  async submitAttempt(attemptId: number, data: SubmitQuizAttemptInput): Promise<QuizAttemptWithStatistics> {
    // Get attempt with quiz and questions
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          include: {
            items: {
              include: {
                questions: {
                  include: {
                    question: {
                      include: {
                        options: true,
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

    if (!attempt) {
      throw new NotFoundException(QUIZ_ATTEMPT_ERRORS.NOT_FOUND)
    }

    if (attempt.submittedAt) {
      throw new BadRequestException(QUIZ_ATTEMPT_ERRORS.ALREADY_SUBMITTED)
    }

    // Collect all questions from quiz items
    const allQuestions = attempt.quiz.items.flatMap((item) => item.questions.map((q) => q.question))
    const questionIds = allQuestions.map((q) => q.id)
    const answerQuestionIds = data.answers.map((answer) => answer.questionId)

    // Create answers data - include both answered and unanswered questions
    const answersData: Array<{
      attemptId: number
      questionId: number
      selectedOptionId: number | null
      isCorrect: boolean
    }> = []

    // Process answered questions
    for (const answer of data.answers) {
      const question = allQuestions.find((q) => q.id === answer.questionId)
      if (!question) continue

      let isCorrect = false

      // Check if selected option is correct
      if (answer.selectedOptionId && question.options) {
        const selectedOption = question.options.find((opt: any) => opt.id === answer.selectedOptionId)
        isCorrect = selectedOption?.isCorrect || false
      }

      answersData.push({
        attemptId,
        questionId: answer.questionId,
        selectedOptionId: answer.selectedOptionId || null,
        isCorrect,
      })
    }

    // Add unanswered questions as incorrect (no selected option)
    const missingQuestionIds = questionIds.filter((qId) => !answerQuestionIds.includes(qId))
    for (const questionId of missingQuestionIds) {
      answersData.push({
        attemptId,
        questionId,
        selectedOptionId: null, // No answer selected
        isCorrect: false, // Unanswered = incorrect
      })
    }

    // Calculate statistics
    const totalQuestions = questionIds.length
    const correctAnswers = answersData.filter((a) => a.isCorrect).length
    const answeredQuestions = data.answers.length
    const unansweredQuestions = missingQuestionIds.length
    const incorrectAnswers = totalQuestions - correctAnswers
    const accuracyPercentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0

    // Save answers and update attempt
    await this.prisma.$transaction(async (tx) => {
      // Create answers
      await tx.quizAnswer.createMany({
        data: answersData,
      })

      // Update attempt as submitted with statistics
      await tx.quizAttempt.update({
        where: { id: attemptId },
        data: {
          submittedAt: new Date(),
          score: accuracyPercentage, // Store accuracy percentage in score field
        },
      })
    })

    // Return updated attempt with statistics
    const updatedAttempt = await this.findById(attemptId)
    return {
      ...updatedAttempt!,
      statistics: {
        totalQuestions,
        answeredQuestions,
        unansweredQuestions,
        correctAnswers,
        incorrectAnswers,
        accuracyPercentage: Math.round(accuracyPercentage * 100) / 100, // Round to 2 decimals
      },
    }
  }

  async delete(id: number): Promise<void> {
    const attempt = await this.findById(id)
    if (!attempt) {
      throw new NotFoundException(QUIZ_ATTEMPT_ERRORS.NOT_FOUND)
    }

    await this.prisma.$transaction(async (tx) => {
      // Delete answers first
      await tx.quizAnswer.deleteMany({
        where: { attemptId: id },
      })

      // Delete attempt
      await tx.quizAttempt.delete({
        where: { id },
      })
    })
  }

  async getUserAttempts(userId: number, quizId?: number) {
    const where: Prisma.QuizAttemptWhereInput = { userId }
    if (quizId) {
      where.quizId = quizId
    }

    return await this.prisma.quizAttempt.findMany({
      where,
      include: {
        quiz: {
          select: { id: true, title: true },
        },
      },
      orderBy: { startedAt: 'desc' },
    })
  }

  async getUserLatestAttempt(userId: number, quizId: number) {
    return await this.prisma.quizAttempt.findFirst({
      where: { userId, quizId },
      orderBy: { startedAt: 'desc' },
      include: {
        answers: {
          include: {
            question: true,
            selectedOption: true,
          },
        },
      },
    })
  }
}
