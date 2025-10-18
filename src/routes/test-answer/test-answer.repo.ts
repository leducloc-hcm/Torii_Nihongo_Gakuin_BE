import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../shared/services/prisma.service'
import { JLPTLevelType, QuestionTypeType, DifficultyType } from 'src/shared/constants/enum.constant'
import {
  TestAnswer,
  TestAnswerWithDetails,
  TestAnswerWithQuestion,
  CreateTestAnswerInput,
  UpdateTestAnswerInput,
  BulkCreateTestAnswersInput,
  BulkUpdateTestAnswersInput,
  QueryTestAnswersInput,
  AnalyticsQueryInput,
  TestAnswerAnalytics,
  AnswerStatistics,
} from './test-answer.model'

@Injectable()
export class TestAnswerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateTestAnswerInput): Promise<TestAnswer> {
    return await this.prisma.testAnswer.create({
      data: {
        attemptId: data.attemptId,
        questionId: data.questionId,
        selectedOptionId: data.selectedOptionId,
        timeSpentSec: data.timeSpentSec,
        explanation: data.explanation,
      },
    })
  }

  async findById(id: number): Promise<TestAnswer | null> {
    return await this.prisma.testAnswer.findUnique({
      where: { id },
    })
  }

  async findByIdWithDetails(id: number): Promise<TestAnswerWithDetails | null> {
    const answer = await this.prisma.testAnswer.findUnique({
      where: { id },
      include: {
        attempt: {
          select: {
            id: true,
            userId: true,
            testId: true,
            startedAt: true,
          },
        },
        question: {
          select: {
            id: true,
            type: true,
            stem: true,
            level: true,
            difficulty: true,
          },
        },
        selectedOption: {
          select: {
            id: true,
            content: true,
            isCorrect: true,
          },
        },
      },
    })

    return answer as unknown as TestAnswerWithDetails | null
  }

  async update(id: number, data: UpdateTestAnswerInput): Promise<TestAnswer> {
    return await this.prisma.testAnswer.update({
      where: { id },
      data,
    })
  }

  async delete(id: number): Promise<TestAnswer> {
    return await this.prisma.testAnswer.delete({
      where: { id },
    })
  }

  async bulkCreate(data: BulkCreateTestAnswersInput): Promise<{ count: number; answers: TestAnswer[] }> {
    const answers = data.answers.map((answer) => ({
      attemptId: data.attemptId,
      questionId: answer.questionId,
      selectedOptionId: answer.selectedOptionId,
      timeSpentSec: answer.timeSpentSec,
      explanation: answer.explanation,
    }))

    const result = await this.prisma.$transaction(async (tx) => {
      const created: TestAnswer[] = []
      for (const answerData of answers) {
        const answer = await tx.testAnswer.create({ data: answerData })
        created.push(answer)
      }
      return created
    })

    return {
      count: result.length,
      answers: result,
    }
  }

  async bulkUpdate(data: BulkUpdateTestAnswersInput): Promise<{ count: number }> {
    let count = 0

    await this.prisma.$transaction(async (tx) => {
      for (const answer of data.answers) {
        await tx.testAnswer.update({
          where: { id: answer.id },
          data: {
            selectedOptionId: answer.selectedOptionId,
            timeSpentSec: answer.timeSpentSec,
            explanation: answer.explanation,
          },
        })
        count++
      }
    })

    return { count }
  }

  async bulkDelete(ids: number[]): Promise<{ count: number }> {
    const result = await this.prisma.testAnswer.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    })

    return { count: result.count }
  }

  async findMany(query: QueryTestAnswersInput): Promise<{
    answers: TestAnswerWithDetails[]
    total: number
  }> {
    const {
      attemptId,
      questionId,
      userId,
      testId,
      isCorrect,
      hasAnswer,
      minTimeSpent,
      maxTimeSpent,
      questionType,
      level,
      difficulty,
      startDate,
      endDate,
      includeQuestion = false,
      includeAttempt = false,
      includeSelectedOption = false,
      page = 1,
      limit = 20,
      sortBy = 'id',
      sortOrder = 'asc',
    } = query

    // Build where clause
    const where: any = {}

    if (attemptId) where.attemptId = attemptId
    if (questionId) where.questionId = questionId
    if (isCorrect !== undefined) where.isCorrect = isCorrect
    if (hasAnswer !== undefined) {
      where.selectedOptionId = hasAnswer ? { not: null } : null
    }
    if (minTimeSpent !== undefined || maxTimeSpent !== undefined) {
      where.timeSpentSec = {}
      if (minTimeSpent !== undefined) where.timeSpentSec.gte = minTimeSpent
      if (maxTimeSpent !== undefined) where.timeSpentSec.lte = maxTimeSpent
    }

    // Add attempt-based filters
    if (userId || testId || startDate || endDate) {
      where.attempt = {}
      if (userId) where.attempt.userId = userId
      if (testId) where.attempt.testId = testId
      if (startDate || endDate) {
        where.attempt.startedAt = {}
        if (startDate) where.attempt.startedAt.gte = new Date(startDate)
        if (endDate) where.attempt.startedAt.lte = new Date(endDate)
      }
    }

    // Add question-based filters
    if (questionType || level || difficulty) {
      where.question = {}
      if (questionType) where.question.type = questionType
      if (level) where.question.level = level
      if (difficulty) where.question.difficulty = difficulty
    }

    // Build include clause
    const include: any = {
      attempt: includeAttempt
        ? {
            select: {
              id: true,
              userId: true,
              testId: true,
              startedAt: true,
            },
          }
        : false,
      question: includeQuestion
        ? {
            select: {
              id: true,
              type: true,
              stem: true,
              level: true,
              difficulty: true,
            },
          }
        : false,
      selectedOption: includeSelectedOption
        ? {
            select: {
              id: true,
              content: true,
              isCorrect: true,
            },
          }
        : false,
    }

    // Execute queries
    const [answers, total] = await Promise.all([
      this.prisma.testAnswer.findMany({
        where,
        include,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.testAnswer.count({ where }),
    ])

    return {
      answers: answers as unknown as TestAnswerWithDetails[],
      total,
    }
  }

  // ===== Analytics Operations =====

  async getAnswersByAttempt(attemptId: number): Promise<TestAnswerWithQuestion[]> {
    const answers = await this.prisma.testAnswer.findMany({
      where: { attemptId },
      include: {
        question: {
          select: {
            id: true,
            type: true,
            stem: true,
            passage: true,
            explanation: true,
            level: true,
            difficulty: true,
            option: {
              select: {
                id: true,
                content: true,
                isCorrect: true,
                order: true,
              },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
      orderBy: { questionId: 'asc' },
    })

    return answers as unknown as TestAnswerWithQuestion[]
  }

  async getQuestionAnalytics(query: AnalyticsQueryInput): Promise<TestAnswerAnalytics[]> {
    const { questionIds, testId, userId, level, questionType, difficulty, startDate, endDate, minAttempts = 1 } = query

    // Build where clause
    const where: any = {}

    if (questionIds && questionIds.length > 0) {
      where.questionId = { in: questionIds }
    }
    if (userId || testId || startDate || endDate) {
      where.attempt = {}
      if (userId) where.attempt.userId = userId
      if (testId) where.attempt.testId = testId
      if (startDate || endDate) {
        where.attempt.startedAt = {}
        if (startDate) where.attempt.startedAt.gte = new Date(startDate)
        if (endDate) where.attempt.startedAt.lte = new Date(endDate)
      }
    }
    if (level || questionType || difficulty) {
      where.question = {}
      if (level) where.question.level = level
      if (questionType) where.question.type = questionType
      if (difficulty) where.question.difficulty = difficulty
    }

    const rawResults = await this.prisma.testAnswer.groupBy({
      by: ['questionId'],
      where,
      _count: {
        id: true,
      },
      _sum: {
        timeSpentSec: true,
      },
      having: {
        id: {
          _count: {
            gte: minAttempts,
          },
        },
      },
    })

    // For each question, get detailed analytics
    const analytics: TestAnswerAnalytics[] = []

    for (const result of rawResults) {
      const questionId = result.questionId
      const totalAttempts = result._count.id

      // Get correct answers count
      const correctCount = await this.prisma.testAnswer.count({
        where: {
          ...where,
          questionId,
          isCorrect: true,
        },
      })

      // Get common wrong answers
      const wrongAnswers = await this.prisma.testAnswer.groupBy({
        by: ['selectedOptionId'],
        where: {
          ...where,
          questionId,
          isCorrect: false,
          selectedOptionId: { not: null },
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: 5,
      })

      const commonWrongAnswers: Array<{
        optionId: number
        content: string
        count: number
        percentage: number
      }> = []

      for (const wa of wrongAnswers) {
        if (wa.selectedOptionId) {
          const option = await this.prisma.option.findUnique({
            where: { id: wa.selectedOptionId },
            select: { id: true, content: true },
          })
          if (option) {
            commonWrongAnswers.push({
              optionId: option.id,
              content: option.content as string,
              count: wa._count.id,
              percentage: Math.round((wa._count.id / totalAttempts) * 100 * 100) / 100,
            })
          }
        }
      }

      analytics.push({
        questionId,
        totalAttempts,
        correctAttempts: correctCount,
        averageTimeSpent: result._sum.timeSpentSec
          ? Math.round((result._sum.timeSpentSec / totalAttempts) * 100) / 100
          : 0,
        difficultyRating: 1.0 - correctCount / totalAttempts, // 0 = easy, 1 = hard
        successRate: Math.round((correctCount / totalAttempts) * 100 * 100) / 100,
        commonWrongAnswers,
      })
    }

    return analytics
  }

  async getAnswerStatistics(query: AnalyticsQueryInput): Promise<AnswerStatistics> {
    const { userId, testId, level, questionType, difficulty, startDate, endDate } = query

    // Build where clause
    const where: any = {}

    if (userId || testId || startDate || endDate) {
      where.attempt = {}
      if (userId) where.attempt.userId = userId
      if (testId) where.attempt.testId = testId
      if (startDate || endDate) {
        where.attempt.startedAt = {}
        if (startDate) where.attempt.startedAt.gte = new Date(startDate)
        if (endDate) where.attempt.startedAt.lte = new Date(endDate)
      }
    }
    if (level || questionType || difficulty) {
      where.question = {}
      if (level) where.question.level = level
      if (questionType) where.question.type = questionType
      if (difficulty) where.question.difficulty = difficulty
    }

    // Get basic counts
    const [totalAnswers, correctAnswers, incorrectAnswers, skippedAnswers] = await Promise.all([
      this.prisma.testAnswer.count({ where }),
      this.prisma.testAnswer.count({ where: { ...where, isCorrect: true } }),
      this.prisma.testAnswer.count({ where: { ...where, isCorrect: false } }),
      this.prisma.testAnswer.count({ where: { ...where, selectedOptionId: null } }),
    ])

    // Get average time
    const timeStats = await this.prisma.testAnswer.aggregate({
      where: { ...where, timeSpentSec: { not: null } },
      _avg: {
        timeSpentSec: true,
      },
    })

    // Get stats by question type (simplified for now)
    // These would need more complex queries to join with question data

    // Placeholder implementation - would need proper aggregation
    const byTypeStats = []
    const byDifficultyStats = []

    const accuracyRate = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100 * 100) / 100 : 0

    return {
      totalAnswers,
      correctAnswers,
      incorrectAnswers,
      skippedAnswers,
      averageTimePerQuestion: timeStats._avg.timeSpentSec ? Math.round(timeStats._avg.timeSpentSec * 100) / 100 : 0,
      accuracyRate,
      byQuestionType: {}, // Would need more complex query to populate properly
      byDifficulty: {}, // Would need more complex query to populate properly
    }
  }

  // ===== Helper Methods =====

  async gradeAnswer(answerId: number): Promise<TestAnswer> {
    const answer = await this.prisma.testAnswer.findUnique({
      where: { id: answerId },
      include: {
        selectedOption: true,
      },
    })

    if (!answer) {
      throw new Error('Answer not found')
    }

    const isCorrect = answer.selectedOption?.isCorrect || false

    return this.prisma.testAnswer.update({
      where: { id: answerId },
      data: { isCorrect },
    })
  }

  async gradeAnswersByAttempt(attemptId: number): Promise<{ count: number }> {
    const answers = await this.prisma.testAnswer.findMany({
      where: { attemptId },
      include: {
        selectedOption: true,
      },
    })

    let count = 0
    await this.prisma.$transaction(async (tx) => {
      for (const answer of answers) {
        const isCorrect = answer.selectedOption?.isCorrect || false
        await tx.testAnswer.update({
          where: { id: answer.id },
          data: { isCorrect },
        })
        count++
      }
    })

    return { count }
  }

  async getAttemptAnswerCount(attemptId: number): Promise<{
    total: number
    answered: number
    correct: number
    skipped: number
  }> {
    const [total, answered, correct, skipped] = await Promise.all([
      this.prisma.testAnswer.count({ where: { attemptId } }),
      this.prisma.testAnswer.count({
        where: { attemptId, selectedOptionId: { not: null } },
      }),
      this.prisma.testAnswer.count({
        where: { attemptId, isCorrect: true },
      }),
      this.prisma.testAnswer.count({
        where: { attemptId, selectedOptionId: null },
      }),
    ])

    return { total, answered, correct, skipped }
  }
}
