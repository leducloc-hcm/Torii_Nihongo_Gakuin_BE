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

  /**
   * Get attempt with full details including questions, selected answers, and correct answers
   */
  async getAttemptWithDetails(id: number) {
    const attempt = await this.assessmentAttemptRepo.findById(id, {
      user: true,
      assessment: true,
      answers: false, // Will get answers separately with full details
    })

    if (!attempt) {
      throw new NotFoundException(ASSESSMENT_ATTEMPT_ERRORS.NOT_FOUND)
    }

    // Get answers with full question and option details
    const answersWithDetails = await this.assessmentAttemptRepo.getAttemptAnswersWithQuestions(id)

    return {
      ...attempt,
      answers: answersWithDetails,
    }
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
    // Validate input data
    if (!data) {
      throw new BadRequestException('Request body is required')
    }

    // Validate attempt exists
    if (!(await this.assessmentAttemptRepo.exists(attemptId))) {
      throw new NotFoundException(ASSESSMENT_ATTEMPT_ERRORS.NOT_FOUND)
    }

    // Check if already submitted
    if (await this.assessmentAttemptRepo.isSubmitted(attemptId)) {
      throw new ConflictException(ASSESSMENT_ATTEMPT_ERRORS.ALREADY_SUBMITTED)
    }

    // Validate answers format
    if (!data.answers || !Array.isArray(data.answers) || data.answers.length === 0) {
      throw new BadRequestException('At least one answer is required and answers must be an array')
    }

    return this.assessmentAttemptRepo.submitAttempt(attemptId, data)
  }

  // ===== Grading and Scoring =====

  async gradeAttempt(attemptId: number): Promise<AssessmentAttemptWithStats> {
    const attempt = await this.assessmentAttemptRepo.findById(attemptId, {
      assessment: true,
      assessmentWithScoreProfile: true,
    })
    if (!attempt) {
      throw new NotFoundException(ASSESSMENT_ATTEMPT_ERRORS.NOT_FOUND)
    }

    if (!(await this.assessmentAttemptRepo.isSubmitted(attemptId))) {
      throw new BadRequestException(ASSESSMENT_ATTEMPT_ERRORS.SUBMISSION_REQUIRED)
    }

    const assessmentType = attempt.assessment.type
    const scoreProfile = attempt.assessment.scoreProfile

    if (!scoreProfile) {
      throw new BadRequestException('Assessment must have a score profile configured')
    }

    let finalScore: number
    let levelEvaluation: any
    let sectionScores: SectionScore[] = []
    let totalQuestions = 0
    let correctAnswers = 0

    if (assessmentType === 'TEST') {
      const testResult = await this.calculateTestScore(attemptId)
      finalScore = testResult.totalScore
      totalQuestions = testResult.totalQuestions
      correctAnswers = testResult.correctAnswers

      const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0
      levelEvaluation = {
        currentLevel: attempt.assessment.level,
        totalScore: finalScore,
        totalPassed: scoreProfile.minTotalPass ? finalScore >= scoreProfile.minTotalPass : true,
        sectionsPassed: true,
        suggestedLevel: null,
        recommendation: `Test completed with score: ${finalScore}/${scoreProfile.maxTotal || 100}`,
      }
    } else {
      // EXAM scoring: bucket-based JLPT with ScoreProfile
      const examResult = await this.calculateExamScore(attemptId, scoreProfile, attempt.assessment.level)
      finalScore = examResult.totalScore
      sectionScores = examResult.sectionScores
      totalQuestions = sectionScores.reduce((sum, section) => sum + section.totalQuestions, 0)
      correctAnswers = sectionScores.reduce((sum, section) => sum + section.correctAnswers, 0)

      // Use comprehensive JLPT evaluation
      levelEvaluation = this.evaluateExamLevel(sectionScores, scoreProfile, attempt.assessment.level)
    }

    // Update attempt with score and level suggestion
    const gradedAttempt = await this.assessmentAttemptRepo.gradeAttempt(
      attemptId,
      finalScore,
      levelEvaluation.suggestedLevel,
    )

    // Calculate accuracy
    const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0

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

  // ===== New Scoring Methods =====

  /**
   * Calculate TEST score: simple sum using scorePerQuestion
   */
  private async calculateTestScore(attemptId: number): Promise<{
    totalScore: number
    totalQuestions: number
    correctAnswers: number
  }> {
    const answersWithScores = await this.assessmentAttemptRepo.getAttemptAnswersWithScores(attemptId)

    let totalScore = 0
    let totalQuestions = 0
    let correctAnswers = 0

    for (const answer of answersWithScores) {
      totalQuestions++
      if (answer.isCorrect) {
        correctAnswers++
        totalScore += answer.scorePerQuestion || 1 // Default to 1 if not set
      }
    }

    return {
      totalScore,
      totalQuestions,
      correctAnswers,
    }
  }

  /**
   * Calculate EXAM score: using ScoreProfile sections
   */
  private async calculateExamScore(
    attemptId: number,
    scoreProfile: any,
    assessmentLevel: JLPTLevel,
  ): Promise<{
    totalScore: number
    sectionScores: SectionScore[]
  }> {
    const answersWithScores = await this.assessmentAttemptRepo.getAttemptAnswersWithScores(attemptId)

    // Get score profile sections
    const sections = scoreProfile.sections || []
    if (sections.length === 0) {
      throw new Error('Score profile has no sections defined')
    }

    // Group answers by section type
    const answersBySection = new Map<string, { correct: number; total: number }>()

    for (const answer of answersWithScores) {
      const sectionType = answer.question.type
      const current = answersBySection.get(sectionType) || { correct: 0, total: 0 }

      current.total++
      if (answer.isCorrect) {
        current.correct++
      }

      answersBySection.set(sectionType, current)
    }

    // Calculate score for each section
    const sectionScores: SectionScore[] = []
    let totalScore = 0

    for (const section of sections) {
      const stats = answersBySection.get(section.type) || { correct: 0, total: 0 }

      // Calculate earned score (weighted if weight is provided)
      const rawScore = stats.total > 0 ? stats.correct / stats.total : 0
      const scaledScore = rawScore * section.maxScore
      const earnedScore = section.weight ? scaledScore * section.weight : scaledScore

      // Check if section passed
      const passed = section.minPass ? earnedScore >= section.minPass : true

      sectionScores.push({
        sectionType: section.type,
        correctAnswers: stats.correct,
        totalQuestions: stats.total,
        rawScore,
        scaledScore: Math.round(earnedScore * 100) / 100,
        passed,
      })

      totalScore += earnedScore
    }

    return {
      totalScore: Math.round(totalScore * 100) / 100,
      sectionScores,
    }
  }

  /**
   * Evaluate EXAM level with ScoreProfile criteria
   */
  private evaluateExamLevel(sectionScores: SectionScore[], scoreProfile: any, currentLevel: JLPTLevel): any {
    const totalScore = sectionScores.reduce((sum, section) => sum + section.scaledScore, 0)
    const maxTotal = scoreProfile.maxTotal || 180
    const minTotalPass = scoreProfile.minTotalPass || 100

    // Check if total score meets minimum requirement
    const totalPassed = totalScore >= minTotalPass

    // Check if each section meets minimum requirement
    const sectionsPassed = sectionScores.every((section) => section.passed)

    const passed = totalPassed && sectionsPassed

    // Suggest appropriate level
    let suggestedLevel: JLPTLevel | null = null
    let recommendation = ''

    if (passed) {
      // Excellent performance (>= 85%) - suggest higher level
      const scorePercentage = totalScore / maxTotal
      if (scorePercentage >= 0.85) {
        const levels: JLPTLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']
        const currentIndex = levels.indexOf(currentLevel)
        if (currentIndex > 0) {
          suggestedLevel = levels[currentIndex - 1]
          recommendation = `Xuất sắc! Bạn đã đạt ${Math.round(scorePercentage * 100)}% điểm ${currentLevel}. Bạn sẵn sàng thử thách ${suggestedLevel}.`
        } else {
          recommendation = `Hoàn hảo! Bạn đã thành thạo ${currentLevel}, cấp độ JLPT cao nhất.`
        }
      } else {
        // Passed but not excellent - stay at current level
        recommendation = `Chúc mừng! Bạn đã vượt qua ${currentLevel}. Tiếp tục luyện tập để nâng cao trước khi thử cấp độ cao hơn.`
      }
    } else {
      // Failed - analyze what went wrong
      if (!totalPassed && !sectionsPassed) {
        recommendation = `Cần cải thiện tất cả các mảng. Tổng điểm (${Math.round(totalScore)}/${maxTotal}) và điểm từng phần đều cần nâng cao.`
      } else if (!totalPassed) {
        recommendation = `Cần cải thiện kết quả tổng thể. Điểm hiện tại: ${Math.round(totalScore)}/${maxTotal} (tối thiểu: ${minTotalPass}).`
      } else if (!sectionsPassed) {
        const failedSections = sectionScores
          .filter((s) => !s.passed)
          .map((s) => s.sectionType)
          .join(', ')
        recommendation = `Tổng điểm đạt yêu cầu, nhưng các phần sau cần cải thiện: ${failedSections}.`
      }

      // Suggest appropriate level based on performance
      const scorePercentage = totalScore / maxTotal
      if (scorePercentage < 0.4 && currentLevel !== 'N5') {
        const levels: JLPTLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']
        const currentIndex = levels.indexOf(currentLevel)
        suggestedLevel = levels[currentIndex + 1]
        recommendation += ` Nên bắt đầu với ${suggestedLevel} để xây dựng nền tảng vững chắc hơn.`
      } else {
        suggestedLevel = currentLevel
        recommendation += ` Tiếp tục luyện tập với tài liệu cấp độ ${currentLevel}.`
      }
    }

    return {
      currentLevel,
      totalScore: Math.round(totalScore * 100) / 100,
      totalPassed,
      sectionsPassed,
      suggestedLevel,
      recommendation,
    }
  }

  // ===== Statistics and Analytics =====

  async getAssessmentStatistics(assessmentId: number) {
    return await this.assessmentAttemptRepo.getAssessmentStatistics(assessmentId)
  }

  async getLeaderboard(assessmentId: number, limit: number = 10) {
    return await this.assessmentAttemptRepo.getLeaderboard(assessmentId, limit)
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
    attemptCount?: number
    lastAttempt?: AssessmentAttempt
  }> {
    if (!(await this.assessmentAttemptRepo.assessmentExists(assessmentId))) {
      return { canStart: false, reason: ASSESSMENT_ATTEMPT_ERRORS.ASSESSMENT_NOT_FOUND }
    }

    if (!(await this.assessmentAttemptRepo.userExists(userId))) {
      return { canStart: false, reason: ASSESSMENT_ATTEMPT_ERRORS.USER_NOT_FOUND }
    }

    // Get user's attempt history for this assessment
    const attemptCount = await this.assessmentAttemptRepo.getUserAttemptCount(userId, assessmentId)
    const lastAttempt = await this.assessmentAttemptRepo.getUserLatestAttempt(userId, assessmentId)

    // Always allow starting new attempts (no limit)
    return {
      canStart: true,
      attemptCount,
      lastAttempt: lastAttempt || undefined,
    }
  }

  // ===== New Methods for Multiple Attempts =====

  async getUserAttempts(userId: number, assessmentId: number): Promise<AssessmentAttempt[]> {
    const result = await this.assessmentAttemptRepo.findMany({
      userId,
      assessmentId,
      page: 1,
      limit: 100, // Get all attempts
      sortBy: 'startedAt',
      sortOrder: 'desc',
      includeAnswers: false,
      includeUser: false,
      includeAssessment: false,
    })
    return result.attempts
  }

  async getUserBestAttempt(userId: number, assessmentId: number): Promise<AssessmentAttempt | null> {
    return await this.assessmentAttemptRepo.getUserBestAttempt(userId, assessmentId)
  }

  async getUserLatestAttempt(userId: number, assessmentId: number): Promise<AssessmentAttempt | null> {
    return await this.assessmentAttemptRepo.getUserLatestAttempt(userId, assessmentId)
  }

  async getUserAttemptStats(
    userId: number,
    assessmentId: number,
  ): Promise<{
    totalAttempts: number
    bestScore: number | null
    latestScore: number | null
    averageScore: number | null
    improvementRate: number | null
  }> {
    const attempts = await this.getUserAttempts(userId, assessmentId)

    if (attempts.length === 0) {
      return {
        totalAttempts: 0,
        bestScore: null,
        latestScore: null,
        averageScore: null,
        improvementRate: null,
      }
    }

    const completedAttempts = attempts.filter((a) => a.score !== null)
    const scores = completedAttempts.map((a) => a.score!).filter((s) => s !== null)

    const bestScore = scores.length > 0 ? Math.max(...scores) : null
    const latestScore = attempts[0]?.score || null
    const averageScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null

    // Calculate improvement rate (latest vs first)
    let improvementRate: number | null = null
    if (scores.length >= 2) {
      const firstScore = scores[scores.length - 1]
      const currentScore = scores[0]
      improvementRate = ((currentScore - firstScore) / firstScore) * 100
    }

    return {
      totalAttempts: attempts.length,
      bestScore,
      latestScore,
      averageScore,
      improvementRate,
    }
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
