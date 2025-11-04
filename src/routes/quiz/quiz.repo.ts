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
        version: data.version || 1,
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
                    options: {
                      select: {
                        id: true,
                        image: true,
                        content: true,
                        isCorrect: true,
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
                            options: {
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
        version: data.version,
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

    return await this.prisma.quiz.create({
      data: {
        title: newTitle,
        timeLimitSec: original.timeLimitSec,
        version: original.version + 1,
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

  async getAttemptedQuizzes(params: { userId: number; page: number; limit: number }) {
    const { userId, page, limit } = params
    const skip = (page - 1) * limit

    const where: any = {
      attempts: {
        some: {
          userId,
          submittedAt: { not: null },
        },
      },
    }

    const [data, total] = await Promise.all([
      this.prisma.quiz.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          lesson: {
            select: {
              id: true,
              title: true,
            },
          },
          _count: {
            select: {
              attempts: {
                where: {
                  userId,
                  submittedAt: { not: null },
                },
              },
            },
          },
          attempts: {
            where: {
              userId,
              submittedAt: { not: null },
            },
            orderBy: { submittedAt: 'desc' },
            take: 1,
            select: {
              id: true,
              score: true,
              submittedAt: true,
            },
          },
        },
      }),
      this.prisma.quiz.count({ where }),
    ])

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    }
  }

  async getRecentAttempts(quizId: number, userId: number) {
    return await this.prisma.quizAttempt.findMany({
      where: {
        quizId,
        userId,
        submittedAt: { not: null },
      },
      orderBy: { startedAt: 'desc' },
      take: 3,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })
  }

  async getQuizByAttempt(attemptId: number) {
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      select: {
        id: true,
        quizId: true,
        userId: true,
        score: true,
        startedAt: true,
        submittedAt: true,
      },
    })

    if (!attempt) {
      throw new Error('Attempt not found')
    }

    type QuizWithItems = Prisma.QuizGetPayload<{
      include: {
        author: { select: { id: true; name: true; email: true } }
        lesson: { select: { id: true; title: true } }
        items: {
          include: {
            questions: {
              include: {
                question: {
                  include: {
                    options: true
                    media: true
                  }
                }
              }
            }
            questionGroups: {
              include: {
                group: {
                  include: {
                    questions: {
                      include: {
                        question: {
                          include: {
                            options: true
                            media: true
                          }
                        }
                      }
                    }
                    media: true
                  }
                }
              }
            }
          }
        }
      }
    }>

    const quiz: QuizWithItems | null = await this.prisma.quiz.findUnique({
      where: { id: attempt.quizId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        lesson: {
          select: {
            id: true,
            title: true,
          },
        },
        items: {
          include: {
            questions: {
              include: {
                question: {
                  include: {
                    options: {
                      select: {
                        id: true,
                        content: true,
                        isCorrect: true,
                        order: true,
                        mediaId: true,
                      },
                      orderBy: { order: 'asc' },
                    },
                    media: true,
                  },
                },
              },
              orderBy: { order: 'asc' },
            },
            questionGroups: {
              include: {
                group: {
                  include: {
                    questions: {
                      include: {
                        question: {
                          include: {
                            options: {
                              select: {
                                id: true,
                                content: true,
                                isCorrect: true,
                                order: true,
                                mediaId: true,
                              },
                              orderBy: { order: 'asc' },
                            },
                            media: true,
                          },
                        },
                      },
                      orderBy: { order: 'asc' },
                    },
                    media: true,
                  },
                },
              },
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!quiz) {
      throw new Error('Quiz not found')
    }

    // Get all answers for this attempt
    const answers = await this.prisma.quizAnswer.findMany({
      where: { attemptId },
      select: {
        questionId: true,
        selectedOptionId: true,
        isCorrect: true,
      },
    })

    const answerMap = new Map(
      answers.map((ans) => [
        ans.questionId,
        {
          selectedOptionId: ans.selectedOptionId,
          isCorrect: ans.isCorrect,
        },
      ]),
    )

    const enrichedQuiz = {
      ...quiz,
      attempt: {
        id: attempt.id,
        userId: attempt.userId,
        score: attempt.score,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
      },
      items: quiz.items.map((item) => ({
        ...item,
        questions: item.questions.map((q) => {
          const userAnswer = answerMap.get(q.question.id)
          return {
            ...q,
            question: {
              ...q.question,
              selectedOptionId: userAnswer?.selectedOptionId || null,
              isCorrect: userAnswer?.isCorrect || null,
            },
          }
        }),
        questionGroups: item.questionGroups.map((qg) => ({
          ...qg,
          group: {
            ...qg.group,
            questions: qg.group.questions.map((gq) => {
              const userAnswer = answerMap.get(gq.question.id)
              return {
                ...gq,
                question: {
                  ...gq.question,
                  selectedOptionId: userAnswer?.selectedOptionId || null,
                  isCorrect: userAnswer?.isCorrect || null,
                },
              }
            }),
          },
        })),
      })),
    }

    return enrichedQuiz
  }

  async getQuizByUserAttempt(userId: number, attemptId: number) {
    const attempt = await this.prisma.quizAttempt.findFirst({
      where: {
        id: attemptId,
        userId,
      },
    })

    if (!attempt) {
      throw new Error('Attempt not found or does not belong to this user')
    }

    return await this.getQuizByAttempt(attemptId)
  }

  async getQuizLeaderboard(quizId: number) {
    const topAttempts = await this.prisma.$queryRaw<
      Array<{
        userId: number
        userName: string
        userEmail: string
        bestScore: number
        attemptId: number
        submittedAt: Date
      }>
    >`
      WITH UserBestScores AS (
        SELECT 
          "userId",
          MAX("score") as best_score
        FROM "QuizAttempt"
        WHERE "quizId" = ${quizId}
          AND "score" IS NOT NULL
          AND "submittedAt" IS NOT NULL
        GROUP BY "userId"
      ),
      RankedAttempts AS (
        SELECT 
          qa."id" as attempt_id,
          qa."userId" as user_id,
          u."name" as user_name,
          u."email" as user_email,
          qa."score" as best_score,
          qa."submittedAt" as submitted_at,
          ROW_NUMBER() OVER (
            PARTITION BY qa."userId" 
            ORDER BY qa."score" DESC, qa."submittedAt" ASC
          ) as rn
        FROM "QuizAttempt" qa
        JOIN "User" u ON u."id" = qa."userId"
        JOIN UserBestScores ubs ON ubs."userId" = qa."userId" AND qa."score" = ubs.best_score
        WHERE qa."quizId" = ${quizId}
          AND qa."score" IS NOT NULL
          AND qa."submittedAt" IS NOT NULL
      )
      SELECT 
        user_id as "userId",
        user_name as "userName",
        user_email as "userEmail",
        best_score as "bestScore",
        attempt_id as "attemptId",
        submitted_at as "submittedAt"
      FROM RankedAttempts
      WHERE rn = 1
      ORDER BY best_score DESC, submitted_at ASC
      LIMIT 10
    `

    return topAttempts.map((entry, index) => ({
      rank: index + 1,
      user: {
        id: entry.userId,
        name: entry.userName,
        email: entry.userEmail,
      },
      bestScore: entry.bestScore,
      attemptId: entry.attemptId,
      submittedAt: entry.submittedAt,
    }))
  }
}
