import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../shared/services/prisma.service'
import { JLPTLevel } from '@prisma/client'
import {
  AssessmentAttemptBase as AssessmentAttempt,
  AssessmentAttemptWithDetails,
  StartAssessmentAttemptInput,
  SubmitAssessmentAttemptInput,
  AssessmentAttemptQuery as AssessmentAttemptQueryInput,
  SectionScore,
} from './assessment-attempt.model'

@Injectable()
export class AssessmentAttemptRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ===== Basic CRUD Operations =====

  async startAttempt(userId: number, data: StartAssessmentAttemptInput): Promise<AssessmentAttempt> {
    return await this.prisma.assessmentAttempt.create({
      data: {
        userId,
        assessmentId: data.assessmentId,
        startedAt: new Date(),
      },
    })
  }

  async findById(
    id: number,
    includeRelations?: {
      user?: boolean
      assessment?: boolean
      answers?: boolean
      assessmentWithScoreProfile?: boolean
    },
  ): Promise<AssessmentAttemptWithDetails | null> {
    return this.prisma.assessmentAttempt.findUnique({
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
        assessment:
          includeRelations?.assessment || includeRelations?.assessmentWithScoreProfile
            ? {
                select: {
                  id: true,
                  title: true,
                  type: true,
                  level: true,
                  scoreProfile: includeRelations?.assessmentWithScoreProfile
                    ? {
                        select: {
                          id: true,
                          name: true,
                          level: true,
                          maxTotal: true,
                          minTotalPass: true,
                          sections: true,
                        },
                      }
                    : false,
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
    }) as Promise<AssessmentAttemptWithDetails | null>
  }

  async findMany(query: AssessmentAttemptQueryInput): Promise<{
    attempts: AssessmentAttemptWithDetails[]
    total: number
  }> {
    const {
      userId,
      assessmentId,
      level,
      startDate,
      endDate,
      submitted,
      includeAnswers = false,
      includeUser = false,
      includeAssessment = false,
      page = 1,
      limit = 20,
      sortBy = 'startedAt',
      sortOrder = 'desc',
    } = query

    const where: any = {}

    if (userId !== undefined) where.userId = userId
    if (assessmentId !== undefined) where.assessmentId = assessmentId
    if (startDate || endDate) {
      where.startedAt = {}
      if (startDate) where.startedAt.gte = new Date(startDate)
      if (endDate) where.startedAt.lte = new Date(endDate)
    }
    if (level !== undefined) {
      where.assessment = { level }
    }
    if (submitted !== undefined) {
      where.submittedAt = submitted ? { not: null } : null
    }

    const orderBy: any = {}
    orderBy[sortBy] = sortOrder

    const [attempts, total] = await Promise.all([
      this.prisma.assessmentAttempt.findMany({
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
          assessment: includeAssessment
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
      this.prisma.assessmentAttempt.count({ where }),
    ])

    return { attempts: attempts as unknown as AssessmentAttemptWithDetails[], total }
  }

  async submitAttempt(attemptId: number, data: SubmitAssessmentAttemptInput): Promise<AssessmentAttempt> {
    // Use transaction to create all answers and update attempt
    return await this.prisma.$transaction(async (tx) => {
      // Create all answers
      await tx.assessmentAnswer.createMany({
        data: data.answers.map((answer) => ({
          attemptId,
          questionId: answer.questionId,
          selectedOptionId: answer.selectedOptionId || null,
          timeSpentSec: answer.timeSpentSec || null,
        })),
      })

      // Update attempt with submission time
      return await tx.assessmentAttempt.update({
        where: { id: attemptId },
        data: {
          submittedAt: new Date(),
        },
      })
    })
  }

  async gradeAttempt(attemptId: number, score: number, levelSuggestion: JLPTLevel | null): Promise<AssessmentAttempt> {
    return await this.prisma.assessmentAttempt.update({
      where: { id: attemptId },
      data: {
        score,
        earnedScore: score, // Can be calculated differently if needed
        levelSuggestion,
      },
    })
  }

  // ===== Query and Validation Methods =====

  async exists(id: number): Promise<boolean> {
    const count = await this.prisma.assessmentAttempt.count({
      where: { id },
    })
    return count > 0
  }

  async userHasStartedAssessment(userId: number, assessmentId: number): Promise<boolean> {
    const count = await this.prisma.assessmentAttempt.count({
      where: { userId, assessmentId },
    })
    return count > 0
  }

  async assessmentExists(assessmentId: number): Promise<boolean> {
    const count = await this.prisma.assessmentPaper.count({
      where: { id: assessmentId },
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
    const attempt = await this.prisma.assessmentAttempt.findUnique({
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
      timeSpentSec: number | null
      question: {
        type: string
        section: {
          type: string
        }
      }
    }>
  > {
    // Get the attempt to find the assessment ID
    const attempt = await this.prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      select: { assessmentId: true },
    })

    if (!attempt) return []

    // Get answers with question details
    const answers = await this.prisma.assessmentAnswer.findMany({
      where: { attemptId },
      include: {
        question: {
          select: {
            type: true,
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
      timeSpentSec: answer.timeSpentSec,
      isCorrect: answer.selectedOption?.isCorrect || false,
      question: {
        type: answer.question.type,
        section: {
          type: 'UNKNOWN',
        },
      },
    }))
  }

  async getAttemptAnswersWithScores(attemptId: number): Promise<
    Array<{
      id: number
      questionId: number
      selectedOptionId: number | null
      isCorrect: boolean
      timeSpentSec: number | null
      scorePerQuestion: number
      question: {
        type: string
        section: {
          type: string
        }
      }
    }>
  > {
    // Get the attempt to find the assessment ID
    const attempt = await this.prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      select: { assessmentId: true },
    })

    if (!attempt) return []

    // Get answers with question details
    const answers = await this.prisma.assessmentAnswer.findMany({
      where: { attemptId },
      include: {
        question: {
          select: {
            type: true,
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
      timeSpentSec: answer.timeSpentSec,
      isCorrect: answer.selectedOption?.isCorrect || false,
      scorePerQuestion: 1, // Default score
      question: {
        type: answer.question.type,
        section: {
          type: 'UNKNOWN',
        },
      },
    }))
  }

  /**
   * Get attempt answers with full question and options details (for showing results)
   */
  async getAttemptAnswersWithQuestions(attemptId: number): Promise<
    Array<{
      id: number
      questionId: number
      selectedOptionId: number | null
      question: {
        id: number
        type: string
        stem: string
        passage: string | null
        explanation: string | null
        options: Array<{
          id: number
          content: string | null
          isCorrect: boolean
        }>
      }
    }>
  > {
    const answers = await this.prisma.assessmentAnswer.findMany({
      where: { attemptId },
      include: {
        question: {
          select: {
            id: true,
            type: true,
            stem: true,
            passage: true,
            explanation: true,
            option: {
              select: {
                id: true,
                content: true,
                isCorrect: true,
              },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
      orderBy: { questionId: 'asc' },
    })

    return answers.map((answer: any) => ({
      id: answer.id,
      questionId: answer.questionId,
      selectedOptionId: answer.selectedOptionId,
      question: {
        id: answer.question.id,
        type: answer.question.type,
        stem: answer.question.stem,
        passage: answer.question.passage,
        explanation: answer.question.explanation,
        options: answer.question.option,
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

  async getAssessmentStatistics(assessmentId: number): Promise<{
    totalAttempts: number
    completedAttempts: number
    averageScore: number
    highestScore: number
    lowestScore: number
    passRate: number
    levelSuggestions: Record<string, number>
  }> {
    const [totalAttempts, completedAttempts, scores, levelDistribution] = await Promise.all([
      this.prisma.assessmentAttempt.count({
        where: { assessmentId },
      }),
      this.prisma.assessmentAttempt.count({
        where: { assessmentId, submittedAt: { not: null } },
      }),
      this.prisma.assessmentAttempt.findMany({
        where: { assessmentId, score: { not: null } },
        select: { score: true },
      }),
      this.prisma.assessmentAttempt.groupBy({
        by: ['levelSuggestion'],
        where: { assessmentId, levelSuggestion: { not: null } },
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
    assessmentId: number,
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
        FROM "AssessmentAttempt" 
        WHERE "assessmentId" = ${assessmentId} AND "score" IS NOT NULL
        GROUP BY "userId"
      ),
      user_best_attempts AS (
        SELECT DISTINCT ON (aa."userId")
          aa."userId",
          u."name" as user_name,
          ubs.best_score,
          aa."submittedAt" as achieved_at,
          ubs.attempt_count
        FROM "AssessmentAttempt" aa
        JOIN "User" u ON u."id" = aa."userId"
        JOIN user_best_scores ubs ON ubs."userId" = aa."userId" AND aa."score" = ubs.best_score
        WHERE aa."assessmentId" = ${assessmentId}
        ORDER BY aa."userId", aa."submittedAt" DESC
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

  async getUserBestAttempt(userId: number, assessmentId: number): Promise<AssessmentAttempt | null> {
    return await this.prisma.assessmentAttempt.findFirst({
      where: {
        userId,
        assessmentId,
        score: { not: null },
      },
      orderBy: { score: 'desc' },
    })
  }

  async getUserLatestAttempt(userId: number, assessmentId: number): Promise<AssessmentAttempt | null> {
    return await this.prisma.assessmentAttempt.findFirst({
      where: {
        userId,
        assessmentId,
      },
      orderBy: { startedAt: 'desc' },
    })
  }

  async getUserAttemptCount(userId: number, assessmentId: number): Promise<number> {
    return await this.prisma.assessmentAttempt.count({
      where: { userId, assessmentId },
    })
  }
}
