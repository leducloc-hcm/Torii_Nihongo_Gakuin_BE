import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../shared/services/prisma.service'
import { JLPTLevel } from '@prisma/client'
import {
  AssessmentAnswerBase as AssessmentAnswer,
  AssessmentAnswerWithDetails,
  AssessmentAnswerWithQuestion,
  CreateAssessmentAnswerInput,
  UpdateAssessmentAnswerInput,
  AssessmentAnswerQuery,
  AssessmentAnswerStatsInput,
} from './assessment-answer.model'

@Injectable()
export class AssessmentAnswerRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ===== Basic CRUD Operations =====

  async create(data: CreateAssessmentAnswerInput): Promise<AssessmentAnswer> {
    return await this.prisma.assessmentAnswer.create({
      data: {
        attemptId: data.attemptId,
        questionId: data.questionId,
        selectedOptionId: data.selectedOptionId || null,
        timeSpentSec: data.timeSpentSec || null,
      },
    })
  }

  async findById(
    id: number,
    includeRelations?: {
      question?: boolean
      attempt?: boolean
      selectedOption?: boolean
    },
  ): Promise<AssessmentAnswerWithDetails | null> {
    return this.prisma.assessmentAnswer.findUnique({
      where: { id },
      include: {
        question: includeRelations?.question
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
        attempt: includeRelations?.attempt
          ? {
              select: {
                id: true,
                userId: true,
                assessmentId: true,
                startedAt: true,
              },
            }
          : false,
        selectedOption: includeRelations?.selectedOption
          ? {
              select: {
                id: true,
                content: true,
                isCorrect: true,
              },
            }
          : false,
      },
    }) as Promise<AssessmentAnswerWithDetails | null>
  }

  async findMany(query: AssessmentAnswerQuery): Promise<{
    answers: AssessmentAnswerWithDetails[]
    total: number
  }> {
    const {
      attemptId,
      questionId,
      userId,
      assessmentId,
      isCorrect,
      level,
      questionType,
      includeQuestion = false,
      includeAttempt = false,
      includeSelectedOption = false,
      page = 1,
      limit = 20,
      sortBy = 'id',
      sortOrder = 'asc',
    } = query

    const where: any = {}

    if (attemptId !== undefined) where.attemptId = attemptId
    if (questionId !== undefined) where.questionId = questionId
    if (isCorrect !== undefined) where.isCorrect = isCorrect

    // Filter by user through attempt
    if (userId !== undefined) {
      where.attempt = { userId }
    }

    // Filter by assessment through attempt
    if (assessmentId !== undefined) {
      where.attempt = { ...where.attempt, assessmentId }
    }

    // Filter by question level
    if (level !== undefined) {
      where.question = { level }
    }

    // Filter by question type
    if (questionType !== undefined) {
      where.question = { ...where.question, type: questionType }
    }

    const orderBy: any = {}
    orderBy[sortBy] = sortOrder

    const [answers, total] = await Promise.all([
      this.prisma.assessmentAnswer.findMany({
        where,
        include: {
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
          attempt: includeAttempt
            ? {
                select: {
                  id: true,
                  userId: true,
                  assessmentId: true,
                  startedAt: true,
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
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.assessmentAnswer.count({ where }),
    ])

    return { answers: answers as unknown as AssessmentAnswerWithDetails[], total }
  }

  async update(id: number, data: UpdateAssessmentAnswerInput): Promise<AssessmentAnswer> {
    return await this.prisma.assessmentAnswer.update({
      where: { id },
      data: {
        ...(data.selectedOptionId !== undefined && { selectedOptionId: data.selectedOptionId }),
        ...(data.timeSpentSec !== undefined && { timeSpentSec: data.timeSpentSec }),
        ...(data.isCorrect !== undefined && { isCorrect: data.isCorrect }),
        ...(data.explanation !== undefined && { explanation: data.explanation }),
      },
    })
  }

  async delete(id: number): Promise<AssessmentAnswer> {
    return await this.prisma.assessmentAnswer.delete({
      where: { id },
    })
  }

  // ===== Bulk Operations =====

  async createBulk(answers: CreateAssessmentAnswerInput[]): Promise<AssessmentAnswer[]> {
    return await this.prisma.$transaction(async (tx) => {
      const createdAnswers: AssessmentAnswer[] = []
      for (const answerData of answers) {
        const answer = await tx.assessmentAnswer.create({ data: answerData })
        createdAnswers.push(answer)
      }
      return createdAnswers
    })
  }

  async updateBulk(
    attemptId: number,
    updates: Array<{ id: number } & UpdateAssessmentAnswerInput>,
  ): Promise<AssessmentAnswer[]> {
    return await this.prisma.$transaction(async (tx) => {
      const updatedAnswers: AssessmentAnswer[] = []
      for (const update of updates) {
        const { id, ...updateData } = update
        const answer = await tx.assessmentAnswer.update({
          where: { id },
          data: updateData,
        })
        updatedAnswers.push(answer)
      }
      return updatedAnswers
    })
  }

  async updateBulkByQuestion(
    attemptId: number,
    updates: Array<{ questionId: number } & UpdateAssessmentAnswerInput>,
  ): Promise<AssessmentAnswer[]> {
    return await this.prisma.$transaction(async (tx) => {
      const updatedAnswers: AssessmentAnswer[] = []
      for (const update of updates) {
        const { questionId, ...updateData } = update
        const answer = await tx.assessmentAnswer.updateMany({
          where: { attemptId, questionId },
          data: updateData,
        })
        // Get the updated record
        const updatedRecord = await tx.assessmentAnswer.findFirst({
          where: { attemptId, questionId },
        })
        if (updatedRecord) {
          updatedAnswers.push(updatedRecord)
        }
      }
      return updatedAnswers
    })
  }

  async deleteAttemptAnswers(attemptId: number): Promise<number> {
    const result = await this.prisma.assessmentAnswer.deleteMany({
      where: { attemptId },
    })
    return result.count
  }

  // ===== Grading Operations =====

  async gradeAttemptAnswers(attemptId: number): Promise<{
    gradedCount: number
    totalCount: number
  }> {
    // Get all answers for the attempt with their options
    const answers = await this.prisma.assessmentAnswer.findMany({
      where: { attemptId },
      include: {
        selectedOption: {
          select: { isCorrect: true },
        },
      },
    })

    let gradedCount = 0

    // Grade each answer
    for (const answer of answers) {
      if (answer.selectedOptionId) {
        const isCorrect = answer.selectedOption?.isCorrect || false
        await this.prisma.assessmentAnswer.update({
          where: { id: answer.id },
          data: { isCorrect },
        })
        gradedCount++
      } else {
        // No option selected - mark as incorrect
        await this.prisma.assessmentAnswer.update({
          where: { id: answer.id },
          data: { isCorrect: false },
        })
      }
    }

    return {
      gradedCount,
      totalCount: answers.length,
    }
  }

  // ===== Query and Retrieval Methods =====

  async getAttemptAnswers(attemptId: number): Promise<AssessmentAnswer[]> {
    return this.prisma.assessmentAnswer.findMany({
      where: { attemptId },
      orderBy: { questionId: 'asc' },
    })
  }

  async getAttemptAnswersWithQuestions(attemptId: number): Promise<AssessmentAnswerWithQuestion[]> {
    const answers = await this.prisma.assessmentAnswer.findMany({
      where: { attemptId },
      include: {
        question: {
          include: {
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

    return answers.map((answer) => ({
      ...answer,
      question: {
        ...answer.question,
        options: answer.question.option,
      },
    })) as unknown as AssessmentAnswerWithQuestion[]
  }

  async getAnswersForAnalytics(query: AssessmentAnswerStatsInput): Promise<
    Array<{
      id: number
      attemptId: number
      questionId: number
      selectedOptionId: number | null
      isCorrect: boolean | null
      timeSpentSec: number | null
      explanation: string | null
      question: {
        id: number
        type: string
        stem: string
        level: JLPTLevel
        difficulty: string
      }
      attempt: {
        id: number
        userId: number
        assessmentId: number
        startedAt: Date
      }
    }>
  > {
    const where: any = {}

    if (query.questionId) where.questionId = query.questionId
    if (query.assessmentId) {
      where.attempt = { assessmentId: query.assessmentId }
    }
    if (query.level) {
      where.question = { level: query.level }
    }
    if (query.questionType) {
      where.question = { ...where.question, type: query.questionType }
    }
    if (query.startDate || query.endDate) {
      where.attempt = {
        ...where.attempt,
        startedAt: {
          ...(query.startDate && { gte: new Date(query.startDate) }),
          ...(query.endDate && { lte: new Date(query.endDate) }),
        },
      }
    }

    return this.prisma.assessmentAnswer.findMany({
      where,
      select: {
        id: true,
        attemptId: true,
        questionId: true,
        selectedOptionId: true,
        isCorrect: true,
        timeSpentSec: true,
        explanation: true,
        question: {
          select: {
            id: true,
            type: true,
            stem: true,
            level: true,
            difficulty: true,
          },
        },
        attempt: {
          select: {
            id: true,
            userId: true,
            assessmentId: true,
            startedAt: true,
          },
        },
      },
    })
  }

  async getQuestionStatistics(questionId: number): Promise<{
    totalAttempts: number
    correctAttempts: number
    averageTimeSpent: number
  }> {
    const [totalAttempts, correctAttempts, timeStats] = await Promise.all([
      this.prisma.assessmentAnswer.count({ where: { questionId } }),
      this.prisma.assessmentAnswer.count({ where: { questionId, isCorrect: true } }),
      this.prisma.assessmentAnswer.aggregate({
        where: { questionId, timeSpentSec: { not: null } },
        _avg: { timeSpentSec: true },
      }),
    ])

    return {
      totalAttempts,
      correctAttempts,
      averageTimeSpent: timeStats._avg.timeSpentSec || 0,
    }
  }

  async getWrongAnswersForUser(
    userId: number,
    assessmentId?: number,
    limit: number = 20,
  ): Promise<AssessmentAnswerWithQuestion[]> {
    const where: any = {
      isCorrect: false,
      attempt: { userId },
    }

    if (assessmentId) {
      where.attempt.assessmentId = assessmentId
    }

    const answers = await this.prisma.assessmentAnswer.findMany({
      where,
      include: {
        question: {
          include: {
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
      orderBy: { id: 'desc' },
      take: limit,
    })

    return answers.map((answer) => ({
      ...answer,
      question: {
        ...answer.question,
        options: answer.question.option,
      },
    })) as unknown as AssessmentAnswerWithQuestion[]
  }

  async getAttemptProgress(attemptId: number): Promise<{
    totalQuestions: number
    answeredQuestions: number
    correctAnswers: number
    skippedQuestions: number
  }> {
    const [totalQuestions, answeredQuestions, correctAnswers, skippedQuestions] = await Promise.all([
      this.prisma.assessmentAnswer.count({ where: { attemptId } }),
      this.prisma.assessmentAnswer.count({ where: { attemptId, selectedOptionId: { not: null } } }),
      this.prisma.assessmentAnswer.count({ where: { attemptId, isCorrect: true } }),
      this.prisma.assessmentAnswer.count({ where: { attemptId, selectedOptionId: null } }),
    ])

    return {
      totalQuestions,
      answeredQuestions,
      correctAnswers,
      skippedQuestions,
    }
  }

  // ===== Validation Methods =====

  async attemptExists(attemptId: number): Promise<boolean> {
    const count = await this.prisma.assessmentAttempt.count({
      where: { id: attemptId },
    })
    return count > 0
  }

  async questionExists(questionId: number): Promise<boolean> {
    const count = await this.prisma.question.count({
      where: { id: questionId },
    })
    return count > 0
  }

  async answerExists(attemptId: number, questionId: number): Promise<boolean> {
    const count = await this.prisma.assessmentAnswer.count({
      where: { attemptId, questionId },
    })
    return count > 0
  }

  async optionBelongsToQuestion(optionId: number, questionId: number): Promise<boolean> {
    const count = await this.prisma.option.count({
      where: { id: optionId, questionId },
    })
    return count > 0
  }

  async isAttemptSubmitted(attemptId: number): Promise<boolean> {
    const attempt = await this.prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      select: { submittedAt: true },
    })
    return attempt?.submittedAt !== null
  }
}
