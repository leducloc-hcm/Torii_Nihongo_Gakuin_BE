import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../shared/services/prisma.service'
import { AssessmentPaper, JLPTLevel, Visibility, AssessmentType } from '@prisma/client'
import {
  AssessmentPaperWithRelations,
  AssessmentPaperBasic,
  CreateAssessmentPaperInput,
  UpdateAssessmentPaperInput,
  AssessmentPaperQuery,
} from './assessment-paper.model'

@Injectable()
export class AssessmentPaperRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAssessmentPaperInput): Promise<AssessmentPaper> {
    // If scoreProfileId is provided, get sections from score profile
    let sectionsToCreate: any[] = []

    if (data.scoreProfileId) {
      const scoreProfile = await this.prisma.scoreProfile.findUnique({
        where: { id: data.scoreProfileId },
        include: { sections: true },
      })

      if (scoreProfile && scoreProfile.sections.length > 0) {
        sectionsToCreate = scoreProfile.sections.map((section) => ({
          title: section.title,
          type: section.type,
          timeLimitSec: section.defaultTimeSec,
        }))
      }
    }

    return await this.prisma.assessmentPaper.create({
      data: {
        title: data.title,
        level: data.level,
        type: data.type,
        visibility: data.visibility || 'PRIVATE',
        createdBy: data.createdBy,
        scoreProfileId: data.scoreProfileId,
        seed: data.seed || null,
        version: data.version || 1,
        generatorVersion: data.generatorVersion || null,
        ...(sectionsToCreate.length > 0 && {
          sections: {
            create: sectionsToCreate,
          },
        }),
      },
      include: {
        sections: true,
      },
    })
  }

  async findById(id: number): Promise<AssessmentPaper | null> {
    return await this.prisma.assessmentPaper.findUnique({
      where: { id },
      include: {
        scoreProfile: {
          select: {
            id: true,
            name: true,
            level: true,
            maxTotal: true,
          },
        },
        sections: {
          include: {
            items: {
              include: {
                questions: {
                  include: {
                    question: {
                      include: {
                        option: true,
                      },
                    },
                  },
                },
                questionGroups: {
                  include: {
                    group: {
                      include: {
                        questions: {
                          include: {
                            question: {
                              include: {
                                option: {
                                  select: {
                                    id: true,
                                    content: true,
                                    mediaId: true,
                                  },
                                },
                                media: true,
                              },
                            },
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
    })
  }

  async findByIdWithRelations(id: number): Promise<AssessmentPaperWithRelations | null> {
    return (await this.prisma.assessmentPaper.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        scoreProfile: {
          select: {
            id: true,
            name: true,
            level: true,
            maxTotal: true,
          },
        },
        blueprint: {
          select: {
            id: true,
            level: true,
            totalQuestions: true,
          },
        },
        sections: {
          include: {
            items: {
              include: {
                questions: {
                  include: {
                    question: {
                      include: {
                        option: {
                          select: {
                            id: true,
                            content: true,
                            mediaId: true,
                            order: true,
                            isCorrect: false,
                            image: true,
                          },
                        },
                        media: true,
                      },
                    },
                  },
                },
                questionGroups: {
                  include: {
                    group: {
                      include: {
                        questions: {
                          include: {
                            question: {
                              include: {
                                option: {
                                  select: {
                                    id: true,
                                    content: true,
                                    mediaId: true,
                                    image: true,
                                  },
                                },
                              },
                            },
                          },
                        },
                        media: true,
                      },
                    },
                  },
                },
              },
              orderBy: { order: 'asc' },
            },
          },
        },
        attempts: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
      },
    })) as AssessmentPaperWithRelations | null
  }

  async update(id: number, data: UpdateAssessmentPaperInput): Promise<AssessmentPaper> {
    return await this.prisma.assessmentPaper.update({
      where: { id },
      data,
    })
  }

  async delete(id: number): Promise<AssessmentPaper> {
    return await this.prisma.assessmentPaper.delete({
      where: { id },
    })
  }

  async findMany(query: AssessmentPaperQuery): Promise<{
    data: AssessmentPaperBasic[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }> {
    const {
      page = 1,
      limit = 20,
      search,
      level,
      type,
      visibility,
      createdBy,
      blueprintId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query

    const skip = (page - 1) * limit

    const where: any = {}
    if (search) {
      where.title = {
        contains: search,
        mode: 'insensitive',
      }
    }
    if (level) where.level = level
    if (type) where.type = type
    if (visibility) where.visibility = visibility
    if (createdBy) where.createdBy = createdBy
    if (blueprintId) where.blueprintId = blueprintId

    const orderBy: any = {}
    if (sortBy && sortOrder) {
      orderBy[sortBy] = sortOrder
    }

    const [data, total] = await Promise.all([
      this.prisma.assessmentPaper.findMany({
        skip,
        take: Number(limit),
        where,
        orderBy,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          scoreProfile: {
            select: {
              id: true,
              name: true,
              level: true,
            },
          },
          blueprint: {
            select: {
              id: true,
              level: true,
            },
          },
          _count: {
            select: {
              sections: true,
              attempts: true,
            },
          },
        },
      }),
      this.prisma.assessmentPaper.count({ where }),
    ])

    return {
      data: data as AssessmentPaperBasic[],
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

  async findByLevel(level: JLPTLevel): Promise<AssessmentPaper[]> {
    return await this.prisma.assessmentPaper.findMany({
      where: { level },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findByCreator(createdBy: number): Promise<AssessmentPaper[]> {
    return await this.prisma.assessmentPaper.findMany({
      where: { createdBy },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findPublicAssessments(level?: JLPTLevel, type?: AssessmentType): Promise<AssessmentPaper[]> {
    return await this.prisma.assessmentPaper.findMany({
      where: {
        visibility: 'PUBLIC',
        ...(level && { level }),
        ...(type && { type }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            sections: true,
            attempts: true,
          },
        },
      },
    })
  }

  async searchByContent(searchTerm: string, limit: number = 20): Promise<AssessmentPaper[]> {
    return await this.prisma.assessmentPaper.findMany({
      where: {
        OR: [
          {
            title: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
          {
            sections: {
              some: {
                title: {
                  contains: searchTerm,
                  mode: 'insensitive',
                },
              },
            },
          },
        ],
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            sections: true,
            attempts: true,
          },
        },
      },
    })
  }

  async exists(id: number): Promise<boolean> {
    const count = await this.prisma.assessmentPaper.count({
      where: { id },
    })
    return count > 0
  }

  async existsByIds(ids: number[]): Promise<number[]> {
    const papers = await this.prisma.assessmentPaper.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: { id: true },
    })
    return papers.map((p) => p.id)
  }

  async getTitleExists(title: string, excludeId?: number): Promise<boolean> {
    const count = await this.prisma.assessmentPaper.count({
      where: {
        title,
        ...(excludeId && { id: { not: excludeId } }),
      },
    })
    return count > 0
  }

  async getUserAccess(assessmentId: number, userId: number): Promise<boolean> {
    const assessment = await this.prisma.assessmentPaper.findUnique({
      where: { id: assessmentId },
      select: {
        visibility: true,
        createdBy: true,
      },
    })

    if (!assessment) return false

    if (assessment.visibility === 'PUBLIC') return true

    if (assessment.createdBy === userId) return true

    return false
  }

  async hasAttempts(id: number): Promise<boolean> {
    const count = await this.prisma.assessmentAttempt.count({
      where: { assessmentId: id },
    })
    return count > 0
  }

  async clone(originalId: number, newTitle: string, newVersion: number): Promise<AssessmentPaper> {
    const original = await this.prisma.assessmentPaper.findUnique({
      where: { id: originalId },
      include: {
        sections: {
          include: {
            items: {
              include: {
                questions: true,
                questionGroups: true,
              },
            },
          },
        },
      },
    })

    if (!original) {
      throw new Error('Original assessment not found')
    }

    return await this.prisma.assessmentPaper.create({
      data: {
        title: newTitle,
        level: original.level,
        type: original.type,
        visibility: original.visibility,
        createdBy: original.createdBy,
        scoreProfileId: original.scoreProfileId,
        blueprintId: original.blueprintId,
        seed: original.seed,
        version: newVersion,
        generatorVersion: original.generatorVersion,
        sections: {
          create: original.sections.map((section) => ({
            title: section.title,
            timeLimitSec: section.timeLimitSec,
            type: section.type,
            items: {
              create: section.items.map((item) => ({
                name: item.name,
                scorePerQuestion: item.scorePerQuestion,
                order: item.order,
                questions: {
                  create: item.questions.map((q) => ({
                    questionId: q.questionId,
                    order: q.order,
                    score: q.score,
                  })),
                },
                questionGroups: {
                  create: item.questionGroups.map((qg) => ({
                    groupId: qg.groupId,
                    order: qg.order,
                    score: qg.score,
                  })),
                },
              })),
            },
          })),
        },
      },
    })
  }

  async getAssessmentPaperByAttempt(attemptId: number) {
    const attempt = await this.prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      select: {
        id: true,
        assessmentId: true,
        userId: true,
        score: true,
        earnedScore: true,
        startedAt: true,
        submittedAt: true,
        levelSuggestion: true,
      },
    })

    if (!attempt) {
      throw new Error('Attempt not found')
    }

    // Get assessment paper with full structure
    const paper = await this.prisma.assessmentPaper.findUnique({
      where: { id: attempt.assessmentId },
      include: {
        scoreProfile: {
          select: {
            id: true,
            name: true,
            level: true,
            maxTotal: true,
            minTotalPass: true,
          },
        },
        sections: {
          include: {
            items: {
              include: {
                questions: {
                  include: {
                    question: {
                      include: {
                        option: {
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
                                option: {
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
          orderBy: { id: 'asc' },
        },
      },
    })

    if (!paper) {
      throw new Error('Assessment paper not found')
    }

    // Get all answers for this attempt
    const answers = await this.prisma.assessmentAnswer.findMany({
      where: { attemptId },
      select: {
        questionId: true,
        selectedOptionId: true,
        isCorrect: true,
        timeSpentSec: true,
      },
    })

    const answerMap = new Map(
      answers.map((ans) => [
        ans.questionId,
        {
          selectedOptionId: ans.selectedOptionId,
          timeSpentSec: ans.timeSpentSec,
        },
      ]),
    )

    const enrichedPaper = {
      ...paper,
      attempt: {
        id: attempt.id,
        userId: attempt.userId,
        score: attempt.score,
        earnedScore: attempt.earnedScore,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        levelSuggestion: attempt.levelSuggestion,
      },
      sections: paper.sections.map((section) => ({
        ...section,
        items: section.items.map((item) => ({
          ...item,
          questions: item.questions.map((q) => {
            const userAnswer = answerMap.get(q.question.id)
            return {
              ...q,
              question: {
                ...q.question,
                selectedOptionId: userAnswer?.selectedOptionId || null, // ✅ User's selected answer
                timeSpentSec: userAnswer?.timeSpentSec || null,
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
                    selectedOptionId: userAnswer?.selectedOptionId || null, // ✅ User's selected answer
                    timeSpentSec: userAnswer?.timeSpentSec || null,
                  },
                }
              }),
            },
          })),
        })),
      })),
    }

    return enrichedPaper
  }

  async getAttemptedAssessments(params: {
    userId: number
    type?: 'TEST' | 'EXAM'
    level?: 'N5' | 'N4' | 'N3' | 'N2' | 'N1'
    page: number
    limit: number
  }) {
    const { userId, type, level, page, limit } = params
    const skip = (page - 1) * limit

    const where: any = {
      attempts: {
        some: {
          userId,
          submittedAt: { not: null }, // ✅ Only include submitted attempts
        },
      },
    }

    if (type) where.type = type
    if (level) where.level = level

    const [data, total] = await Promise.all([
      this.prisma.assessmentPaper.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          scoreProfile: {
            select: {
              id: true,
              name: true,
              maxTotal: true,
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
      this.prisma.assessmentPaper.count({ where }),
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

  async getRecentAttempts(assessmentId: number, userId: number) {
    return await this.prisma.assessmentAttempt.findMany({
      where: {
        assessmentId,
        userId, // ✅ Filter by user ID
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

  async getAssessmentPaperByUserAttempt(userId: number, attemptId: number) {
    // Verify attempt belongs to user
    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: {
        id: attemptId,
        userId,
      },
    })

    if (!attempt) {
      throw new Error('Attempt not found or does not belong to this user')
    }

    // Use existing method
    return await this.getAssessmentPaperByAttempt(attemptId)
  }

  /**
   * Get leaderboard for an assessment (top 10 unique users by best score)
   */
  async getAssessmentLeaderboard(assessmentId: number) {
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
        FROM "AssessmentAttempt"
        WHERE "assessmentId" = ${assessmentId}
          AND "score" IS NOT NULL
          AND "submittedAt" IS NOT NULL
        GROUP BY "userId"
      ),
      RankedAttempts AS (
        SELECT 
          aa."id" as attempt_id,
          aa."userId" as user_id,
          u."name" as user_name,
          u."email" as user_email,
          aa."score" as best_score,
          aa."submittedAt" as submitted_at,
          ROW_NUMBER() OVER (
            PARTITION BY aa."userId" 
            ORDER BY aa."score" DESC, aa."submittedAt" ASC
          ) as rn
        FROM "AssessmentAttempt" aa
        JOIN "User" u ON u."id" = aa."userId"
        JOIN UserBestScores ubs ON ubs."userId" = aa."userId" AND aa."score" = ubs.best_score
        WHERE aa."assessmentId" = ${assessmentId}
          AND aa."score" IS NOT NULL
          AND aa."submittedAt" IS NOT NULL
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
