import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../shared/services/prisma.service'
import { JLPTLevel } from '@prisma/client'
import {
  TestAttempt,
  TestAttemptWithDetails,
  StartTestAttemptInput,
  SubmitTestAttemptInput,
  TestAttemptQueryInput,
  SectionScore,
} from './test-attempt.model'

@Injectable()
export class TestAttemptRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ===== Basic CRUD Operations =====

  async startAttempt(userId: number, data: StartTestAttemptInput): Promise<TestAttempt> {
    return await this.prisma.testAttempt.create({
      data: {
        userId,
        testId: data.testId,
        startedAt: new Date(),
      },
    })
  }

  async findById(
    id: number,
    includeRelations?: {
      user?: boolean
      test?: boolean
      answers?: boolean
    },
  ): Promise<TestAttemptWithDetails | null> {
    return this.prisma.testAttempt.findUnique({
      where: { id },
      include: {
        user: includeRelations?.user
          ? {
              select: {
                id: true,
                name: true,
                email: true,
              },
            }
          : false,
        test: includeRelations?.test
          ? {
              select: {
                id: true,
                title: true,
                level: true,
                _count: {
                  select: { sections: { where: { items: { some: {} } } } },
                },
              },
            }
          : false,
        answers: includeRelations?.answers
          ? {
              include: {
                question: {
                  select: {
                    type: true,
                    testItems: {
                      include: {
                        section: {
                          select: { type: true },
                        },
                      },
                    },
                  },
                },
                selectedOption: {
                  select: {
                    id: true,
                    isCorrect: true,
                  },
                },
              },
            }
          : false,
      },
    }) as Promise<TestAttemptWithDetails | null>
  }

  async findMany(query: TestAttemptQueryInput): Promise<{
    attempts: TestAttemptWithDetails[]
    total: number
  }> {
    const {
      userId,
      testId,
      level,
      startDate,
      endDate,
      passed,
      includeAnswers = false,
      includeUser = false,
      includeTest = false,
      page = 1,
      limit = 20,
      sortBy = 'startedAt',
      sortOrder = 'desc',
    } = query

    const where: any = {}

    if (userId !== undefined) where.userId = userId
    if (testId !== undefined) where.testId = testId
    if (startDate || endDate) {
      where.startedAt = {}
      if (startDate) where.startedAt.gte = new Date(startDate)
      if (endDate) where.startedAt.lte = new Date(endDate)
    }
    if (level !== undefined) {
      where.test = { level }
    }
    if (passed !== undefined) {
      // This would require calculating if they passed based on score
      // For simplicity, we'll use score threshold
      where.score = passed ? { gte: 60 } : { lt: 60 }
    }

    const orderBy: any = {}
    orderBy[sortBy] = sortOrder

    const [attempts, total] = await Promise.all([
      this.prisma.testAttempt.findMany({
        where,
        include: {
          user: includeUser
            ? {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              }
            : false,
          test: includeTest
            ? {
                select: {
                  id: true,
                  title: true,
                  level: true,
                },
              }
            : false,
          answers: includeAnswers
            ? {
                include: {
                  question: {
                    select: {
                      type: true,
                      testItems: {
                        include: {
                          section: {
                            select: { type: true },
                          },
                        },
                      },
                    },
                  },
                  selectedOption: {
                    select: {
                      id: true,
                      isCorrect: true,
                    },
                  },
                },
              }
            : false,
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.testAttempt.count({ where }),
    ])

    return { attempts: attempts as unknown as TestAttemptWithDetails[], total }
  }

  async submitAttempt(attemptId: number, data: SubmitTestAttemptInput): Promise<TestAttempt> {
    // Use transaction to create all answers and update attempt
    return await this.prisma.$transaction(async (tx) => {
      // Create all answers
      await tx.testAnswer.createMany({
        data: data.answers.map((answer) => ({
          attemptId,
          questionId: answer.questionId,
          selectedOptionId: answer.selectedOptionId || null,
        })),
      })

      // Update attempt with submission time
      return await tx.testAttempt.update({
        where: { id: attemptId },
        data: {
          submittedAt: new Date(),
        },
      })
    })
  }

  async gradeAttempt(attemptId: number, score: number, levelSuggestion: JLPTLevel | null): Promise<TestAttempt> {
    return await this.prisma.testAttempt.update({
      where: { id: attemptId },
      data: {
        score,
        levelSuggestion,
      },
    })
  }

  // ===== Query and Validation Methods =====

  async exists(id: number): Promise<boolean> {
    const count = await this.prisma.testAttempt.count({
      where: { id },
    })
    return count > 0
  }

  async userHasStartedTest(userId: number, testId: number): Promise<boolean> {
    const count = await this.prisma.testAttempt.count({
      where: { userId, testId },
    })
    return count > 0
  }

  async testExists(testId: number): Promise<boolean> {
    const count = await this.prisma.testPaper.count({
      where: { id: testId },
    })
    return count > 0
  }

  async userExists(userId: number): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { id: userId },
    })
    return count > 0
  }

  async isSubmitted(attemptId: number): Promise<boolean> {
    const attempt = await this.prisma.testAttempt.findUnique({
      where: { id: attemptId },
      select: { submittedAt: true },
    })
    return attempt?.submittedAt !== null
  }

  // ===== Answer and Grading Methods =====

  async getAttemptAnswers(attemptId: number): Promise<
    Array<{
      id: number
      questionId: number
      selectedOptionId: number | null
      isCorrect: boolean
      question: {
        type: string
        section: {
          type: string
        }
      }
    }>
  > {
    // Get the attempt to find the test ID
    const attempt = await this.prisma.testAttempt.findUnique({
      where: { id: attemptId },
      select: { testId: true },
    })

    if (!attempt) return []

    // Get answers with question details and section info through TestItem
    const answers = await this.prisma.testAnswer.findMany({
      where: { attemptId },
      include: {
        question: {
          include: {
            testItems: {
              where: { section: { testId: attempt.testId } },
              include: {
                section: {
                  select: { type: true },
                },
              },
            },
          },
        },
        selectedOption: {
          select: { isCorrect: true },
        },
      },
    })

    return answers.map((answer) => ({
      id: answer.id,
      questionId: answer.questionId,
      selectedOptionId: answer.selectedOptionId,
      isCorrect: answer.selectedOption?.isCorrect || false,
      question: {
        type: answer.question.type,
        section: {
          type: answer.question.testItems[0]?.section.type || 'UNKNOWN',
        },
      },
    }))
  }

  async calculateSectionScores(attemptId: number): Promise<SectionScore[]> {
    const answers = await this.getAttemptAnswers(attemptId)

    // Group answers by section type
    const sectionGroups = new Map<string, { correct: number; total: number }>()

    for (const answer of answers) {
      const sectionType = answer.question.section.type
      const current = sectionGroups.get(sectionType) || { correct: 0, total: 0 }

      current.total++
      if (answer.isCorrect) {
        current.correct++
      }

      sectionGroups.set(sectionType, current)
    }

    // Convert to SectionScore format
    const sectionScores: SectionScore[] = []

    for (const [sectionType, stats] of sectionGroups) {
      const rawScore = stats.total > 0 ? stats.correct / stats.total : 0
      // Scale to 60 points for JLPT format (each section is out of 60)
      const scaledScore = Math.round(rawScore * 60)

      sectionScores.push({
        sectionType,
        correctAnswers: stats.correct,
        totalQuestions: stats.total,
        rawScore,
        scaledScore,
        passed: scaledScore >= 19, // Minimum for most JLPT sections
      })
    }

    return sectionScores
  }

  // ===== Statistics Methods =====

  async getTestStatistics(testId: number): Promise<{
    totalAttempts: number
    completedAttempts: number
    averageScore: number
    highestScore: number
    lowestScore: number
    passRate: number
    levelSuggestions: Record<string, number>
  }> {
    const [totalAttempts, completedAttempts, scores, levelDistribution] = await Promise.all([
      this.prisma.testAttempt.count({
        where: { testId },
      }),
      this.prisma.testAttempt.count({
        where: { testId, submittedAt: { not: null } },
      }),
      this.prisma.testAttempt.findMany({
        where: { testId, score: { not: null } },
        select: { score: true },
      }),
      this.prisma.testAttempt.groupBy({
        by: ['levelSuggestion'],
        where: { testId, levelSuggestion: { not: null } },
        _count: { levelSuggestion: true },
      }),
    ])

    const scoreValues = scores.map((s) => s.score!).filter((s) => s !== null)

    let averageScore = 0
    let highestScore = 0
    let lowestScore = 0
    let passRate = 0

    if (scoreValues.length > 0) {
      averageScore = scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length
      highestScore = Math.max(...scoreValues)
      lowestScore = Math.min(...scoreValues)
      passRate = (scoreValues.filter((score) => score >= 60).length / scoreValues.length) * 100
    }

    const levelSuggestions: Record<string, number> = {}
    for (const item of levelDistribution) {
      if (item.levelSuggestion) {
        levelSuggestions[item.levelSuggestion] = item._count.levelSuggestion
      }
    }

    return {
      totalAttempts,
      completedAttempts,
      averageScore: Math.round(averageScore * 100) / 100,
      highestScore,
      lowestScore,
      passRate: Math.round(passRate * 100) / 100,
      levelSuggestions,
    }
  }

  async getLeaderboard(
    testId: number,
    limit: number = 10,
  ): Promise<
    Array<{
      rank: number
      user: { id: number; name: string }
      bestScore: number
      achievedAt: Date
      attemptCount: number
    }>
  > {
    const topScores = await this.prisma.$queryRaw<
      Array<{
        userId: number
        userName: string
        bestScore: number
        achievedAt: Date
        attemptCount: bigint
      }>
    >`
      WITH user_best_scores AS (
        SELECT 
          "userId",
          MAX("score") as best_score,
          COUNT(*) as attempt_count
        FROM "TestAttempt" 
        WHERE "testId" = ${testId} AND "score" IS NOT NULL
        GROUP BY "userId"
      ),
      user_best_attempts AS (
        SELECT DISTINCT ON (ta."userId")
          ta."userId",
          u."name" as user_name,
          ubs.best_score,
          ta."submittedAt" as achieved_at,
          ubs.attempt_count
        FROM "TestAttempt" ta
        JOIN "User" u ON u."id" = ta."userId"
        JOIN user_best_scores ubs ON ubs."userId" = ta."userId" AND ta."score" = ubs.best_score
        WHERE ta."testId" = ${testId}
        ORDER BY ta."userId", ta."submittedAt" DESC
      )
      SELECT *
      FROM user_best_attempts
      ORDER BY best_score DESC, achieved_at ASC
      LIMIT ${limit}
    `

    return topScores.map((entry, index) => ({
      rank: index + 1,
      user: {
        id: entry.userId,
        name: entry.userName,
      },
      bestScore: entry.bestScore,
      achievedAt: entry.achievedAt,
      attemptCount: Number(entry.attemptCount),
    }))
  }

  async getUserBestAttempt(userId: number, testId: number): Promise<TestAttempt | null> {
    return await this.prisma.testAttempt.findFirst({
      where: {
        userId,
        testId,
        score: { not: null },
      },
      orderBy: { score: 'desc' },
    })
  }

  async getUserAttemptCount(userId: number, testId: number): Promise<number> {
    return await this.prisma.testAttempt.count({
      where: { userId, testId },
    })
  }
}
