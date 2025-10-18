import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common'
import { TestAttemptRepository } from './test-attempt.repo'
import {
  TestAttempt,
  TestAttemptWithDetails,
  TestAttemptStats,
  StartTestAttemptInput,
  SubmitTestAttemptInput,
  TestAttemptQueryInput,
  SectionScore,
  LevelEvaluation,
  JLPT_SCORING_CRITERIA,
  SECTION_GROUPINGS,
  determineSectionGrouping,
  evaluateJLPTLevel,
  calculateScaledScore,
  TEST_ATTEMPT_ERRORS,
} from './test-attempt.model'
import { JLPTLevelType } from 'src/shared/constants/enum.constant'
import { JLPTLevel } from 'src/routes/test-paper/test-paper.model'

export interface PaginatedTestAttempts {
  attempts: TestAttemptWithDetails[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

@Injectable()
export class TestAttemptService {
  constructor(private readonly testAttemptRepo: TestAttemptRepository) {}

  // ===== Basic CRUD Operations =====

  async startTest(userId: number, data: StartTestAttemptInput): Promise<TestAttempt> {
    // Validate test exists
    if (!(await this.testAttemptRepo.testExists(data.testId))) {
      throw new NotFoundException(TEST_ATTEMPT_ERRORS.TEST_NOT_FOUND)
    }

    // Validate user exists
    if (!(await this.testAttemptRepo.userExists(userId))) {
      throw new NotFoundException(TEST_ATTEMPT_ERRORS.USER_NOT_FOUND)
    }

    // Check if user has already started this test
    if (await this.testAttemptRepo.userHasStartedTest(userId, data.testId)) {
      throw new ConflictException(TEST_ATTEMPT_ERRORS.ALREADY_STARTED)
    }

    return this.testAttemptRepo.startAttempt(userId, data)
  }

  async getAttempt(
    id: number,
    includeRelations?: {
      user?: boolean
      test?: boolean
      answers?: boolean
    },
  ): Promise<TestAttemptWithDetails> {
    const attempt = await this.testAttemptRepo.findById(id, includeRelations)
    if (!attempt) {
      throw new NotFoundException(TEST_ATTEMPT_ERRORS.NOT_FOUND)
    }
    return attempt
  }

  async getAttempts(query: TestAttemptQueryInput): Promise<PaginatedTestAttempts> {
    const { page = 1, limit = 20 } = query

    if (page < 1) {
      throw new BadRequestException('Page must be greater than 0')
    }

    if (limit < 1 || limit > 100) {
      throw new BadRequestException('Limit must be between 1 and 100')
    }

    const result = await this.testAttemptRepo.findMany(query)

    return {
      attempts: result.attempts,
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
    }
  }

  async submitTest(attemptId: number, data: SubmitTestAttemptInput): Promise<TestAttempt> {
    // Validate attempt exists
    if (!(await this.testAttemptRepo.exists(attemptId))) {
      throw new NotFoundException(TEST_ATTEMPT_ERRORS.NOT_FOUND)
    }

    // Check if already submitted
    if (await this.testAttemptRepo.isSubmitted(attemptId)) {
      throw new ConflictException(TEST_ATTEMPT_ERRORS.ALREADY_SUBMITTED)
    }

    // Validate answers format
    if (!data.answers || data.answers.length === 0) {
      throw new BadRequestException('At least one answer is required')
    }

    return this.testAttemptRepo.submitAttempt(attemptId, data)
  }

  // ===== Grading and Scoring =====

  async gradeAttempt(attemptId: number): Promise<TestAttemptStats> {
    // Validate attempt exists
    const attempt = await this.testAttemptRepo.findById(attemptId, { test: true })
    if (!attempt) {
      throw new NotFoundException(TEST_ATTEMPT_ERRORS.NOT_FOUND)
    }

    // Check if submitted
    if (!(await this.testAttemptRepo.isSubmitted(attemptId))) {
      throw new BadRequestException(TEST_ATTEMPT_ERRORS.SUBMISSION_REQUIRED)
    }

    // Calculate section scores
    const sectionScores = await this.calculateSectionScores(attemptId, attempt.test.level)

    // Calculate overall statistics
    const totalQuestions = sectionScores.reduce((sum, section) => sum + section.totalQuestions, 0)
    const correctAnswers = sectionScores.reduce((sum, section) => sum + section.correctAnswers, 0)
    const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0

    // Evaluate JLPT level
    const levelEvaluation = evaluateJLPTLevel(sectionScores, attempt.test.level)

    // Update attempt with score and level suggestion
    const gradedAttempt = await this.testAttemptRepo.gradeAttempt(attemptId, accuracy, levelEvaluation.suggestedLevel)

    // Return detailed stats
    return {
      ...gradedAttempt,
      totalQuestions,
      correctAnswers,
      accuracy: Math.round(accuracy * 100) / 100,
      sectionScores,
      levelEvaluation,
    }
  }

  private async calculateSectionScores(attemptId: number, testLevel: JLPTLevel): Promise<SectionScore[]> {
    // Get all answers for this attempt
    const answers = await this.testAttemptRepo.getAttemptAnswers(attemptId)

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

    // Determine section grouping based on JLPT level
    const groupingKey = determineSectionGrouping(testLevel)
    const sectionGroupings = SECTION_GROUPINGS[groupingKey]

    // Calculate scores for grouped sections
    const sectionScores: SectionScore[] = []

    for (const [groupName, sectionTypes] of Object.entries(sectionGroupings)) {
      let totalCorrect = 0
      let totalQuestions = 0

      // Sum up scores for sections in this group
      for (const sectionType of sectionTypes) {
        const stats = sectionGroups.get(sectionType)
        if (stats) {
          totalCorrect += stats.correct
          totalQuestions += stats.total
        }
      }

      if (totalQuestions > 0) {
        const rawScore = totalCorrect / totalQuestions
        const scaledScore = calculateScaledScore(totalCorrect, totalQuestions, 60) // JLPT sections are out of 60

        // Determine minimum score requirement for this group
        const criteria = JLPT_SCORING_CRITERIA[testLevel]
        const sectionCriteria = criteria.sections[groupName as keyof typeof criteria.sections]
        const minScore = sectionCriteria?.minScore || 19

        sectionScores.push({
          sectionType: groupName,
          correctAnswers: totalCorrect,
          totalQuestions,
          rawScore,
          scaledScore,
          passed: scaledScore >= minScore,
        })
      }
    }

    return sectionScores
  }

  // ===== Statistics and Analytics =====

  async getTestStatistics(testId: number) {
    return this.testAttemptRepo.getTestStatistics(testId)
  }

  async getLeaderboard(testId: number, limit: number = 10) {
    return this.testAttemptRepo.getLeaderboard(testId, limit)
  }

  async getUserBestAttempt(userId: number, testId: number): Promise<TestAttempt | null> {
    return this.testAttemptRepo.getUserBestAttempt(userId, testId)
  }

  async getUserAttemptCount(userId: number, testId: number): Promise<number> {
    return this.testAttemptRepo.getUserAttemptCount(userId, testId)
  }

  async canStartTest(
    userId: number,
    testId: number,
  ): Promise<{
    canStart: boolean
    reason?: string
    existingAttempt?: TestAttempt
  }> {
    if (!(await this.testAttemptRepo.testExists(testId))) {
      return { canStart: false, reason: TEST_ATTEMPT_ERRORS.TEST_NOT_FOUND }
    }

    const hasStarted = await this.testAttemptRepo.userHasStartedTest(userId, testId)
    if (hasStarted) {
      const existingAttempt = await this.testAttemptRepo.findMany({
        userId,
        testId,
        limit: 1,
        includeAnswers: false,
        includeUser: false,
        includeTest: false,
      })

      return {
        canStart: false,
        reason: TEST_ATTEMPT_ERRORS.ALREADY_STARTED,
        existingAttempt: existingAttempt.attempts[0] || undefined,
      }
    }

    return { canStart: true }
  }

  async getAttemptProgress(attemptId: number): Promise<{
    totalQuestions: number
    answeredQuestions: number
    remainingQuestions: number
    completionPercentage: number
  }> {
    const answers = await this.testAttemptRepo.getAttemptAnswers(attemptId)
    const totalQuestions = answers.length
    const answeredQuestions = answers.filter((a) => a.selectedOptionId !== null).length
    const remainingQuestions = totalQuestions - answeredQuestions
    const completionPercentage = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0

    return {
      totalQuestions,
      answeredQuestions,
      remainingQuestions,
      completionPercentage: Math.round(completionPercentage * 100) / 100,
    }
  }

  async analyzeLevelReadiness(
    userId: number,
    targetLevel: JLPTLevel,
  ): Promise<{
    isReady: boolean
    recommendation: string
    recentAttempts: TestAttempt[]
    averageScore: number
    strongAreas: string[]
    weakAreas: string[]
  }> {
    const levels: JLPTLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']
    const targetIndex = levels.indexOf(targetLevel)
    const relevantLevels = levels.slice(targetIndex)

    const recentAttemptsResult = await this.testAttemptRepo.findMany({
      userId,
      includeAnswers: false,
      includeUser: false,
      includeTest: true,
      level: targetLevel, // Just look at attempts for target level for now
      limit: 10,
    })
    const recentAttempts = recentAttemptsResult.attempts
    const totalScore = recentAttempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0)
    const attemptCount = recentAttempts.length

    const averageScore = attemptCount > 0 ? totalScore / attemptCount : 0
    const isReady = averageScore >= 70 // Basic threshold

    let recommendation = ''
    if (isReady) {
      recommendation = `You're ready to attempt ${targetLevel}! Your recent performance shows good preparation.`
    } else {
      recommendation = `Continue practicing before attempting ${targetLevel}. Focus on your weak areas.`
    }

    return {
      isReady,
      recommendation,
      recentAttempts,
      averageScore,
      strongAreas: [], // Would be calculated from section performance
      weakAreas: [], // Would be calculated from section performance
    }
  }
}
