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

  async findById(id: number) {
    return await this.prisma.quiz.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            questions: {
              include: {
                question: true,
              },
            },
          },
        },
      },
    })
  }

  async findByIdWithRelations(id: number) {
    return await this.prisma.quiz.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            questions: {
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
                  },
                },
              },
            },
            questionGroups: {
              include: {
                group: {
                  include: {
                    media: true,
                    questions: {
                      include: {
                        question: {
                          include: {
                            media: true,
                            option: {
                              select: {
                                id: true,
                                image: true,
                                content: true,
                                mediaId: true,
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
    // Parse query params to ensure they are numbers
    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 20
    const lessonId = query.lessonId ? Number(query.lessonId) : undefined
    const createdBy = query.createdBy ? Number(query.createdBy) : undefined
    const { search, sortBy = 'createdAt', sortOrder = 'desc' } = query

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

  async hasAttempts(id: number): Promise<boolean> {
    const count = await this.prisma.quizAttempt.count({
      where: { quizId: id },
    })
    return count > 0
  }

  async clone(originalId: number, userId: number, newTitle: string): Promise<Quiz> {
    // Get original quiz with all items
    const original = await this.prisma.quiz.findUnique({
      where: { id: originalId },
      include: {
        items: {
          include: {
            questions: true,
            questionGroups: true,
          },
        },
      },
    })

    if (!original) {
      throw new Error('Original quiz not found')
    }

    // Clone the quiz with all items
    return await this.prisma.quiz.create({
      data: {
        title: newTitle,
        timeLimitSec: original.timeLimitSec,
        createdBy: userId,
        lessonId: original.lessonId,
        items: {
          create: original.items.map((item) => ({
            order: item.order,
            questions: {
              create: item.questions.map((q) => ({
                questionId: q.questionId,
                order: q.order,
              })),
            },
            questionGroups: {
              create: item.questionGroups.map((qg) => ({
                groupId: qg.groupId,
                order: qg.order,
              })),
            },
          })),
        },
      },
    })
  }
}
