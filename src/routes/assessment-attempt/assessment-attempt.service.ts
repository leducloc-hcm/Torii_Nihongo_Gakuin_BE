import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common'
import { AssessmentAttemptRepository } from './assessment-attempt.repo'
import {
  AssessmentAttemptBase as AssessmentAttempt,
  AssessmentAttemptWithDetails,
  AssessmentAttemptWithStats,
  StartAssessmentAttemptInput,
  SubmitAssessmentAttemptInput,
  AssessmentAttemptQuery as AssessmentAttemptQueryInput,
  SectionScore,
  LevelEvaluation,
  JLPT_SCORING_CRITERIA,
  SECTION_GROUPINGS,
  determineSectionGrouping,
  evaluateJLPTLevel,
  calculateScaledScore,
  ASSESSMENT_ATTEMPT_ERRORS,
} from './assessment-attempt.model'
import { JLPTLevel } from '@prisma/client'

export interface PaginatedAssessmentAttempts {
  attempts: AssessmentAttemptWithDetails[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

@Injectable()
export class AssessmentAttemptService {
  constructor(private readonly assessmentAttemptRepo: AssessmentAttemptRepository) {}

  // ===== Basic CRUD Operations =====

  async startAssessment(userId: number, data: StartAssessmentAttemptInput): Promise<AssessmentAttempt> {
    // Validate assessment exists
    if (!(await this.assessmentAttemptRepo.assessmentExists(data.assessmentId))) {
      throw new NotFoundException(ASSESSMENT_ATTEMPT_ERRORS.ASSESSMENT_NOT_FOUND)
    }

    // Validate user exists
    if (!(await this.assessmentAttemptRepo.userExists(userId))) {
      throw new NotFoundException(ASSESSMENT_ATTEMPT_ERRORS.USER_NOT_FOUND)
    }

    // Check if user has already started this assessment
    if (await this.assessmentAttemptRepo.userHasStartedAssessment(userId, data.assessmentId)) {
      throw new ConflictException(ASSESSMENT_ATTEMPT_ERRORS.ALREADY_STARTED)
    }

    return this.assessmentAttemptRepo.startAttempt(userId, data)
  }

  async getAttempt(
    id: number,
    includeRelations?: {
      user?: boolean
      assessment?: boolean
      answers?: boolean
    },
  ): Promise<AssessmentAttemptWithDetails> {
    const attempt = await this.assessmentAttemptRepo.findById(id, includeRelations)
    if (!attempt) {
      throw new NotFoundException(ASSESSMENT_ATTEMPT_ERRORS.NOT_FOUND)
    }
    return attempt
  }

  async getAttempts(query: AssessmentAttemptQueryInput): Promise<PaginatedAssessmentAttempts> {
    const { page = 1, limit = 20 } = query

    if (page < 1) {
      throw new BadRequestException('Page must be greater than 0')
    }

    if (limit < 1 || limit > 100) {
      throw new BadRequestException('Limit must be between 1 and 100')
    }

    const result = await this.assessmentAttemptRepo.findMany(query)

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

  async submitAssessment(attemptId: number, data: SubmitAssessmentAttemptInput): Promise<AssessmentAttempt> {
    // Validate attempt exists
    if (!(await this.assessmentAttemptRepo.exists(attemptId))) {
      throw new NotFoundException(ASSESSMENT_ATTEMPT_ERRORS.NOT_FOUND)
    }

    // Check if already submitted
    if (await this.assessmentAttemptRepo.isSubmitted(attemptId)) {
      throw new ConflictException(ASSESSMENT_ATTEMPT_ERRORS.ALREADY_SUBMITTED)
    }

    // Validate answers format
    if (!data.answers || data.answers.length === 0) {
      throw new BadRequestException('At least one answer is required')
    }

    return this.assessmentAttemptRepo.submitAttempt(attemptId, data)
  }

  // ===== Grading and Scoring =====

  async gradeAttempt(attemptId: number): Promise<AssessmentAttemptWithStats> {
    // Validate attempt exists
    const attempt = await this.assessmentAttemptRepo.findById(attemptId, { assessment: true })
    if (!attempt) {
      throw new NotFoundException(ASSESSMENT_ATTEMPT_ERRORS.NOT_FOUND)
    }

    // Check if submitted
    if (!(await this.assessmentAttemptRepo.isSubmitted(attemptId))) {
      throw new BadRequestException(ASSESSMENT_ATTEMPT_ERRORS.SUBMISSION_REQUIRED)
    }

    // Calculate section scores
    const sectionScores = await this.calculateSectionScores(attemptId, attempt.assessment.level)

    // Calculate overall statistics
    const totalQuestions = sectionScores.reduce((sum, section) => sum + section.totalQuestions, 0)
    const correctAnswers = sectionScores.reduce((sum, section) => sum + section.correctAnswers, 0)
    const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0

    // Evaluate JLPT level
    const levelEvaluation = evaluateJLPTLevel(sectionScores, attempt.assessment.level)

    // Update attempt with score and level suggestion
    const gradedAttempt = await this.assessmentAttemptRepo.gradeAttempt(
      attemptId,
      accuracy,
      levelEvaluation.suggestedLevel,
    )

    // Return detailed stats
    return {
      ...gradedAttempt,
      totalQuestions,
      correctAnswers,
      accuracy: Math.round(accuracy * 100) / 100,
      sectionScores,
      levelEvaluation,
    } as AssessmentAttemptWithStats
  }

  private async calculateSectionScores(attemptId: number, assessmentLevel: JLPTLevel): Promise<SectionScore[]> {
    // Get all answers for this attempt
    const answers = await this.assessmentAttemptRepo.getAttemptAnswers(attemptId)

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
    const groupingKey = determineSectionGrouping(assessmentLevel)
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
        const criteria = JLPT_SCORING_CRITERIA[assessmentLevel]
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

  async getAssessmentStatistics(assessmentId: number) {
    return await this.assessmentAttemptRepo.getAssessmentStatistics(assessmentId)
  }

  async getLeaderboard(assessmentId: number, limit: number = 10) {
    return await this.assessmentAttemptRepo.getLeaderboard(assessmentId, limit)
  }

  async getUserBestAttempt(userId: number, assessmentId: number): Promise<AssessmentAttempt | null> {
    return await this.assessmentAttemptRepo.getUserBestAttempt(userId, assessmentId)
  }

  async getUserAttemptCount(userId: number, assessmentId: number): Promise<number> {
    return await this.assessmentAttemptRepo.getUserAttemptCount(userId, assessmentId)
  }

  async canStartAssessment(
    userId: number,
    assessmentId: number,
  ): Promise<{
    canStart: boolean
    reason?: string
    existingAttempt?: AssessmentAttempt
  }> {
    if (!(await this.assessmentAttemptRepo.assessmentExists(assessmentId))) {
      return { canStart: false, reason: ASSESSMENT_ATTEMPT_ERRORS.ASSESSMENT_NOT_FOUND }
    }

    const hasStarted = await this.assessmentAttemptRepo.userHasStartedAssessment(userId, assessmentId)
    if (hasStarted) {
      const existingAttempt = await this.assessmentAttemptRepo.findMany({
        userId,
        assessmentId,
        page: 1,
        limit: 1,
        sortBy: 'startedAt',
        sortOrder: 'desc',
        includeAnswers: false,
        includeUser: false,
        includeAssessment: false,
      })

      return {
        canStart: false,
        reason: ASSESSMENT_ATTEMPT_ERRORS.ALREADY_STARTED,
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
    const answers = await this.assessmentAttemptRepo.getAttemptAnswers(attemptId)
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
    recentAttempts: AssessmentAttempt[]
    averageScore: number
    strongAreas: string[]
    weakAreas: string[]
  }> {
    const levels: JLPTLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']
    const targetIndex = levels.indexOf(targetLevel)
    const relevantLevels = levels.slice(targetIndex)

    const recentAttemptsResult = await this.assessmentAttemptRepo.findMany({
      userId,
      page: 1,
      limit: 10,
      sortBy: 'startedAt',
      sortOrder: 'desc',
      includeAnswers: false,
      includeUser: false,
      includeAssessment: true,
      level: targetLevel, // Just look at attempts for target level for now
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
