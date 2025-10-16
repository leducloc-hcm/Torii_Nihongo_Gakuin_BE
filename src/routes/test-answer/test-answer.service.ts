// ===== TestAnswer Service =====
// Business logic for TestAnswer management
// Handles answer operations, grading, analytics, and insights

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { TestAnswerRepository } from './test-answer.repo'
import {
  TestAnswer,
  TestAnswerWithDetails,
  TestAnswerWithQuestion,
  CreateTestAnswerInput,
  UpdateTestAnswerInput,
  BulkCreateTestAnswersInput,
  BulkUpdateTestAnswersInput,
  QueryTestAnswersInput,
  AnalyticsQueryInput,
  TestAnswerAnalytics,
  AnswerStatistics,
  getAnswerInsights,
  calculateAccuracy,
  calculateAverageTime,
  categorizeAnswerTime,
} from './test-answer.model'

@Injectable()
export class TestAnswerService {
  constructor(private readonly testAnswerRepo: TestAnswerRepository) {}

  // ===== Basic CRUD Operations =====

  async createAnswer(data: CreateTestAnswerInput): Promise<TestAnswer> {
    // Validate that the attempt and question exist (would need additional checks)
    return this.testAnswerRepo.create(data)
  }

  async getAnswerById(id: number, includeDetails = false): Promise<TestAnswer | TestAnswerWithDetails> {
    if (includeDetails) {
      const answer = await this.testAnswerRepo.findByIdWithDetails(id)
      if (!answer) {
        throw new NotFoundException(`TestAnswer with ID ${id} not found`)
      }
      return answer
    }

    const answer = await this.testAnswerRepo.findById(id)
    if (!answer) {
      throw new NotFoundException(`TestAnswer with ID ${id} not found`)
    }
    return answer
  }

  async updateAnswer(id: number, data: UpdateTestAnswerInput): Promise<TestAnswer> {
    // Check if answer exists
    const existing = await this.testAnswerRepo.findById(id)
    if (!existing) {
      throw new NotFoundException(`TestAnswer with ID ${id} not found`)
    }

    return this.testAnswerRepo.update(id, data)
  }

  async deleteAnswer(id: number): Promise<TestAnswer> {
    const existing = await this.testAnswerRepo.findById(id)
    if (!existing) {
      throw new NotFoundException(`TestAnswer with ID ${id} not found`)
    }

    return this.testAnswerRepo.delete(id)
  }

  // ===== Bulk Operations =====

  async bulkCreateAnswers(data: BulkCreateTestAnswersInput): Promise<{
    count: number
    answers: TestAnswer[]
    graded: number
  }> {
    // Validate input
    if (data.answers.length === 0) {
      throw new BadRequestException('No answers provided')
    }

    if (data.answers.length > 100) {
      throw new BadRequestException('Cannot create more than 100 answers at once')
    }

    // Create answers
    const result = await this.testAnswerRepo.bulkCreate(data)

    // Auto-grade the created answers
    const gradeResult = await this.testAnswerRepo.gradeAnswersByAttempt(data.attemptId)

    return {
      count: result.count,
      answers: result.answers,
      graded: gradeResult.count,
    }
  }

  async bulkUpdateAnswers(data: BulkUpdateTestAnswersInput): Promise<{ count: number }> {
    if (data.answers.length === 0) {
      throw new BadRequestException('No answers provided')
    }

    if (data.answers.length > 100) {
      throw new BadRequestException('Cannot update more than 100 answers at once')
    }

    return this.testAnswerRepo.bulkUpdate(data)
  }

  async bulkDeleteAnswers(ids: number[]): Promise<{ count: number }> {
    if (ids.length === 0) {
      throw new BadRequestException('No answer IDs provided')
    }

    if (ids.length > 100) {
      throw new BadRequestException('Cannot delete more than 100 answers at once')
    }

    return this.testAnswerRepo.bulkDelete(ids)
  }

  // ===== Query Operations =====

  async getAnswers(query: QueryTestAnswersInput): Promise<{
    answers: TestAnswerWithDetails[]
    total: number
    page: number
    limit: number
    totalPages: number
  }> {
    const { answers, total } = await this.testAnswerRepo.findMany(query)
    const page = query.page || 1
    const limit = query.limit || 20
    const totalPages = Math.ceil(total / limit)

    return {
      answers,
      total,
      page,
      limit,
      totalPages,
    }
  }

  async getAnswersByAttempt(attemptId: number): Promise<TestAnswerWithQuestion[]> {
    return this.testAnswerRepo.getAnswersByAttempt(attemptId)
  }

  // ===== Grading Operations =====

  async gradeAnswer(id: number): Promise<TestAnswer> {
    const existing = await this.testAnswerRepo.findById(id)
    if (!existing) {
      throw new NotFoundException(`TestAnswer with ID ${id} not found`)
    }

    return this.testAnswerRepo.gradeAnswer(id)
  }

  async gradeAttemptAnswers(attemptId: number): Promise<{
    count: number
    correctCount: number
    accuracy: number
    summary: {
      total: number
      answered: number
      correct: number
      skipped: number
    }
  }> {
    // Grade all answers for the attempt
    const gradeResult = await this.testAnswerRepo.gradeAnswersByAttempt(attemptId)

    // Get summary statistics
    const summary = await this.testAnswerRepo.getAttemptAnswerCount(attemptId)

    const accuracy = calculateAccuracy(summary.correct, summary.answered)

    return {
      count: gradeResult.count,
      correctCount: summary.correct,
      accuracy,
      summary,
    }
  }

  // ===== Analytics Operations =====

  async getQuestionAnalytics(query: AnalyticsQueryInput): Promise<TestAnswerAnalytics[]> {
    return this.testAnswerRepo.getQuestionAnalytics(query)
  }

  async getAnswerStatistics(query: AnalyticsQueryInput): Promise<AnswerStatistics> {
    return this.testAnswerRepo.getAnswerStatistics(query)
  }

  async getAnswerInsights(attemptId: number): Promise<{
    patterns: string[]
    recommendations: string[]
    weakAreas: string[]
    strengths: string[]
    timeAnalysis: {
      averageTime: number
      fastAnswers: number
      slowAnswers: number
      skippedAnswers: number
    }
    accuracyAnalysis: {
      overall: number
      byQuestionType: Record<string, number>
      byDifficulty: Record<string, number>
    }
  }> {
    const answers = await this.testAnswerRepo.getAnswersByAttempt(attemptId)

    if (answers.length === 0) {
      return {
        patterns: ['No answers found for this attempt'],
        recommendations: ['Complete the test to get insights'],
        weakAreas: [],
        strengths: [],
        timeAnalysis: {
          averageTime: 0,
          fastAnswers: 0,
          slowAnswers: 0,
          skippedAnswers: 0,
        },
        accuracyAnalysis: {
          overall: 0,
          byQuestionType: {},
          byDifficulty: {},
        },
      }
    }

    // Get basic insights from the model helper
    const basicInsights = getAnswerInsights(answers)

    // Time analysis
    const answersWithTime = answers.filter((a) => a.timeSpentSec !== null)
    const totalTime = answersWithTime.reduce((sum, a) => sum + (a.timeSpentSec || 0), 0)
    const averageTime = calculateAverageTime(totalTime, answersWithTime.length)

    const timeCategories = answers.reduce(
      (acc, answer) => {
        const category = categorizeAnswerTime(answer.timeSpentSec)
        acc[category] = (acc[category] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    // Accuracy analysis
    const correctAnswers = answers.filter((a) => a.isCorrect === true).length
    const totalAnswered = answers.filter((a) => a.selectedOptionId !== null).length
    const overall = calculateAccuracy(correctAnswers, totalAnswered)

    // Accuracy by question type
    const byQuestionType = answers.reduce(
      (acc, answer) => {
        const type = answer.question.type
        if (!acc[type]) {
          acc[type] = { correct: 0, total: 0 }
        }
        if (answer.selectedOptionId !== null) {
          acc[type].total++
          if (answer.isCorrect) acc[type].correct++
        }
        return acc
      },
      {} as Record<string, { correct: number; total: number }>,
    )

    const accuracyByType = Object.entries(byQuestionType).reduce(
      (acc, [type, stats]) => {
        acc[type] = calculateAccuracy(stats.correct, stats.total)
        return acc
      },
      {} as Record<string, number>,
    )

    // Accuracy by difficulty
    const byDifficulty = answers.reduce(
      (acc, answer) => {
        const difficulty = answer.question.difficulty
        if (!acc[difficulty]) {
          acc[difficulty] = { correct: 0, total: 0 }
        }
        if (answer.selectedOptionId !== null) {
          acc[difficulty].total++
          if (answer.isCorrect) acc[difficulty].correct++
        }
        return acc
      },
      {} as Record<string, { correct: number; total: number }>,
    )

    const accuracyByDifficulty = Object.entries(byDifficulty).reduce(
      (acc, [difficulty, stats]) => {
        acc[difficulty] = calculateAccuracy(stats.correct, stats.total)
        return acc
      },
      {} as Record<string, number>,
    )

    return {
      patterns: basicInsights.patterns,
      recommendations: basicInsights.recommendations,
      weakAreas: basicInsights.weakAreas,
      strengths: basicInsights.strengths,
      timeAnalysis: {
        averageTime,
        fastAnswers: timeCategories.fast || 0,
        slowAnswers: timeCategories.slow || 0,
        skippedAnswers: timeCategories.skipped || 0,
      },
      accuracyAnalysis: {
        overall,
        byQuestionType: accuracyByType,
        byDifficulty: accuracyByDifficulty,
      },
    }
  }

  // ===== Comparison and Progress Tracking =====

  async compareUserPerformance(
    userId: number,
    compareWithUserId: number,
    testId?: number,
  ): Promise<{
    userA: { userId: number; accuracy: number; averageTime: number; totalAnswers: number }
    userB: { userId: number; accuracy: number; averageTime: number; totalAnswers: number }
    comparison: {
      accuracyDifference: number
      timeDifference: number
      betterAt: string[]
      suggestions: string[]
    }
  }> {
    const query1: AnalyticsQueryInput = { userId }
    const query2: AnalyticsQueryInput = { userId: compareWithUserId }

    if (testId) {
      query1.testId = testId
      query2.testId = testId
    }

    const [stats1, stats2] = await Promise.all([this.getAnswerStatistics(query1), this.getAnswerStatistics(query2)])

    const accuracyDiff = stats1.accuracyRate - stats2.accuracyRate
    const timeDiff = stats1.averageTimePerQuestion - stats2.averageTimePerQuestion

    const betterAt: string[] = []
    const suggestions: string[] = []

    if (accuracyDiff > 5) {
      betterAt.push('Overall accuracy')
    } else if (accuracyDiff < -5) {
      suggestions.push('Focus on improving accuracy')
    }

    if (timeDiff < -10) {
      betterAt.push('Answer speed')
    } else if (timeDiff > 30) {
      suggestions.push('Practice to improve answer speed')
    }

    return {
      userA: {
        userId,
        accuracy: stats1.accuracyRate,
        averageTime: stats1.averageTimePerQuestion,
        totalAnswers: stats1.totalAnswers,
      },
      userB: {
        userId: compareWithUserId,
        accuracy: stats2.accuracyRate,
        averageTime: stats2.averageTimePerQuestion,
        totalAnswers: stats2.totalAnswers,
      },
      comparison: {
        accuracyDifference: accuracyDiff,
        timeDifference: timeDiff,
        betterAt,
        suggestions,
      },
    }
  }

  async getUserProgressOverTime(
    userId: number,
    days = 30,
  ): Promise<{
    dailyStats: Array<{
      date: string
      totalAnswers: number
      correctAnswers: number
      accuracy: number
      averageTime: number
    }>
    trend: {
      accuracyTrend: 'improving' | 'declining' | 'stable'
      speedTrend: 'improving' | 'declining' | 'stable'
      recommendations: string[]
    }
  }> {
    // This would require more complex date-based queries
    // For now, return a placeholder implementation

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get overall stats for the period
    const stats = await this.getAnswerStatistics({
      userId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    })

    // Placeholder daily stats (would need actual daily aggregation)
    const dailyStats: Array<{
      date: string
      totalAnswers: number
      correctAnswers: number
      accuracy: number
      averageTime: number
    }> = []

    for (let i = 0; i < days; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)

      dailyStats.push({
        date: date.toISOString().split('T')[0],
        totalAnswers: Math.floor(Math.random() * 20),
        correctAnswers: Math.floor(Math.random() * 15),
        accuracy: 70 + Math.random() * 20,
        averageTime: 30 + Math.random() * 30,
      })
    }

    // Simple trend analysis (would be more sophisticated with real data)
    const recentAccuracy = dailyStats.slice(0, 7).reduce((sum, day) => sum + day.accuracy, 0) / 7
    const olderAccuracy = dailyStats.slice(-7).reduce((sum, day) => sum + day.accuracy, 0) / 7

    let accuracyTrend: 'improving' | 'declining' | 'stable' = 'stable'
    if (recentAccuracy > olderAccuracy + 2) accuracyTrend = 'improving'
    else if (recentAccuracy < olderAccuracy - 2) accuracyTrend = 'declining'

    const recentTime = dailyStats.slice(0, 7).reduce((sum, day) => sum + day.averageTime, 0) / 7
    const olderTime = dailyStats.slice(-7).reduce((sum, day) => sum + day.averageTime, 0) / 7

    let speedTrend: 'improving' | 'declining' | 'stable' = 'stable'
    if (recentTime < olderTime - 5) speedTrend = 'improving'
    else if (recentTime > olderTime + 5) speedTrend = 'declining'

    const recommendations: string[] = []
    if (accuracyTrend === 'declining') {
      recommendations.push('Focus on accuracy over speed')
    }
    if (speedTrend === 'declining') {
      recommendations.push('Practice to improve response time')
    }
    if (accuracyTrend === 'improving' && speedTrend === 'improving') {
      recommendations.push('Great progress! Keep up the consistent practice')
    }

    return {
      dailyStats: dailyStats.reverse(), // Return in chronological order
      trend: {
        accuracyTrend,
        speedTrend,
        recommendations,
      },
    }
  }
}
