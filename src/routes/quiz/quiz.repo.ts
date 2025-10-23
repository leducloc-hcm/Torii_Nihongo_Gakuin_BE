import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../shared/services/prisma.service'
import { Quiz } from '@prisma/client'
import {
  QuizBase,
  QuizWithRelations,
  QuizBasic,
  CreateQuizInput,
  UpdateQuizInput,
  QuizQuery,
  QuizStats,
} from './quiz.model'
import { Prisma } from '@prisma/client'

@Injectable()
export class QuizRepository {
  constructor(private readonly prisma: PrismaService) {}
  async create(data: CreateQuizInput, createdBy: number): Promise<Quiz> {
    return await this.prisma.quiz.create({
      data: {
        title: data.title,
        lessonId: data.lessonId || null,
        timeLimitSec: data.timeLimitSec,
        createdBy,
      },
    })
  }

  async findById(id: number): Promise<Quiz | null> {
    return await this.prisma.quiz.findUnique({
      where: { id },
    })
  }

  async findByIdWithRelations(id: number): Promise<QuizWithRelations | null> {
    return (await this.prisma.quiz.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
        lesson: true,
        attempts: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    })) as QuizWithRelations | null
  }

  async findMany(query: QuizQuery): Promise<{
    data: QuizBasic[]
    pagination: {
      total: number
      page: number
      limit: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }> {
    const { page = 1, limit = 20, search, lessonId, createdBy, sortBy = 'createdAt', sortOrder = 'desc' } = query

    const skip = (page - 1) * limit

    const where: Prisma.QuizWhereInput = {}

    if (search) {
      where.title = {
        contains: search,
        mode: 'insensitive',
      }
    }

    if (lessonId !== undefined) {
      where.lessonId = lessonId
    }

    if (createdBy !== undefined) {
      where.createdBy = createdBy
    }

    const orderBy: Prisma.QuizOrderByWithRelationInput = {}
    if (sortBy === 'id') {
      orderBy.id = sortOrder
    } else if (sortBy === 'title') {
      orderBy.title = sortOrder
    } else if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder
    } else if (sortBy === 'createdBy') {
      orderBy.createdBy = sortOrder
    }

    const [quizzes, total] = await Promise.all([
      this.prisma.quiz.findMany({
        where,
        include: {
          author: {
            select: { id: true, name: true, email: true },
          },
          lesson: {
            select: { id: true, title: true },
          },
          _count: {
            select: {
              attempts: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.quiz.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

    return {
      data: quizzes as QuizBasic[],
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

  async update(id: number, data: UpdateQuizInput): Promise<Quiz> {
    return await this.prisma.quiz.update({
      where: { id },
      data: {
        title: data.title,
        lessonId: data.lessonId,
        timeLimitSec: data.timeLimitSec,
      },
    })
  }

  async delete(id: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Delete answers first
      await tx.quizAnswer.deleteMany({
        where: {
          attempt: {
            quizId: id,
          },
        },
      })

      await tx.quizAttempt.deleteMany({
        where: { quizId: id },
      })

      await tx.quizItem.deleteMany({
        where: { quizId: id },
      })

      await tx.quiz.delete({
        where: { id },
      })
    })
  }

  async getTitleExists(title: string, excludeId?: number): Promise<boolean> {
    const where: Prisma.QuizWhereInput = { title }
    if (excludeId) {
      where.id = { not: excludeId }
    }

    const count = await this.prisma.quiz.count({ where })
    return count > 0
  }

  async bulkDelete(ids: number[]): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Delete answers first
      await tx.quizAnswer.deleteMany({
        where: {
          attempt: {
            quizId: { in: ids },
          },
        },
      })

      // Delete attempts
      await tx.quizAttempt.deleteMany({
        where: { quizId: { in: ids } },
      })

      // Delete quiz items
      await tx.quizItem.deleteMany({
        where: { quizId: { in: ids } },
      })

      // Delete quizzes
      await tx.quiz.deleteMany({
        where: { id: { in: ids } },
      })
    })
  }

  // ===== Statistics =====

  async getQuizStats(quizId: number): Promise<QuizStats> {
    const attempts = await this.prisma.quizAttempt.findMany({
      where: { quizId },
      select: { submittedAt: true },
    })

    const totalAttempts = attempts.length
    const completedAttempts = attempts.filter((a) => a.submittedAt).length

    // Since we don't have score anymore, we return basic stats
    const completionRate = totalAttempts > 0 ? completedAttempts / totalAttempts : 0

    return {
      totalAttempts,
      completedAttempts,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      passRate: 0,
      completionRate: Math.round(completionRate * 100) / 100,
    }
  }
}
