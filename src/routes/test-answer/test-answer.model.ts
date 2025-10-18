import { z } from 'zod'
import { TestAnswer } from '@prisma/client'

// ===== Base TestAnswer Types =====
export type { TestAnswer } from '@prisma/client'

export interface TestAnswerWithDetails extends TestAnswer {
  attempt: {
    id: number
    userId: number
    testId: number
    startedAt: Date
  }
  question: {
    id: number
    type: string
    stem: string
    level: string
    difficulty: string
  }
  selectedOption?: {
    id: number
    content: string
    isCorrect: boolean
  }
}

export interface TestAnswerWithQuestion extends TestAnswer {
  question: {
    id: number
    type: string
    stem: string
    passage?: string
    explanation?: string
    level: string
    difficulty: string
    options: Array<{
      id: number
      content: string
      isCorrect: boolean
      order: number
    }>
  }
}

export interface TestAnswerAnalytics {
  questionId: number
  totalAttempts: number
  correctAttempts: number
  averageTimeSpent: number
  difficultyRating: number
  successRate: number
  commonWrongAnswers: Array<{
    optionId: number
    content: string
    count: number
    percentage: number
  }>
}

export interface AnswerStatistics {
  totalAnswers: number
  correctAnswers: number
  incorrectAnswers: number
  skippedAnswers: number
  averageTimePerQuestion: number
  accuracyRate: number
  byQuestionType: Record<
    string,
    {
      total: number
      correct: number
      averageTime: number
      accuracy: number
    }
  >
  byDifficulty: Record<
    string,
    {
      total: number
      correct: number
      averageTime: number
      accuracy: number
    }
  >
}

// ===== Zod Validation Schemas =====

// Create TestAnswer Schema
export const CreateTestAnswerSchema = z.object({
  attemptId: z.number().positive(),
  questionId: z.number().positive(),
  selectedOptionId: z.number().positive().optional(),
  timeSpentSec: z.number().min(0).optional(),
  explanation: z.string().max(1000).optional(),
})

export type CreateTestAnswerInput = z.infer<typeof CreateTestAnswerSchema>

// Update TestAnswer Schema
export const UpdateTestAnswerSchema = z.object({
  selectedOptionId: z.number().positive().optional(),
  timeSpentSec: z.number().min(0).optional(),
  isCorrect: z.boolean().optional(),
  explanation: z.string().max(1000).optional(),
})

export type UpdateTestAnswerInput = z.infer<typeof UpdateTestAnswerSchema>

// Bulk Create TestAnswers Schema
export const BulkCreateTestAnswersSchema = z.object({
  attemptId: z.number().positive(),
  answers: z
    .array(
      z.object({
        questionId: z.number().positive(),
        selectedOptionId: z.number().positive().optional(),
        timeSpentSec: z.number().min(0).optional(),
        explanation: z.string().max(1000).optional(),
      }),
    )
    .min(1)
    .max(100),
})

export type BulkCreateTestAnswersInput = z.infer<typeof BulkCreateTestAnswersSchema>

// Bulk Update TestAnswers Schema
export const BulkUpdateTestAnswersSchema = z.object({
  answers: z
    .array(
      z.object({
        id: z.number().positive(),
        selectedOptionId: z.number().positive().optional(),
        timeSpentSec: z.number().min(0).optional(),
        explanation: z.string().max(1000).optional(),
      }),
    )
    .min(1)
    .max(100),
})

export type BulkUpdateTestAnswersInput = z.infer<typeof BulkUpdateTestAnswersSchema>

// Query TestAnswers Schema
export const QueryTestAnswersSchema = z.object({
  attemptId: z.number().positive().optional(),
  questionId: z.number().positive().optional(),
  userId: z.number().positive().optional(),
  testId: z.number().positive().optional(),
  isCorrect: z.boolean().optional(),
  hasAnswer: z.boolean().optional(), // whether selectedOptionId is not null
  minTimeSpent: z.number().min(0).optional(),
  maxTimeSpent: z.number().min(0).optional(),
  questionType: z.enum(['VOCAB', 'KANJI', 'GRAMMAR', 'SYNONYM', 'ORDER', 'READING', 'LISTENING']).optional(),
  level: z.enum(['N5', 'N4', 'N3', 'N2', 'N1']).optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  includeQuestion: z.boolean().optional(),
  includeAttempt: z.boolean().optional(),
  includeSelectedOption: z.boolean().optional(),
  page: z.number().positive().optional(),
  limit: z.number().positive().max(100).optional(),
  sortBy: z.enum(['id', 'questionId', 'timeSpentSec', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

export type QueryTestAnswersInput = z.infer<typeof QueryTestAnswersSchema>

// Analytics Query Schema
export const AnalyticsQuerySchema = z.object({
  questionIds: z.array(z.number().positive()).optional(),
  testId: z.number().positive().optional(),
  userId: z.number().positive().optional(),
  level: z.enum(['N5', 'N4', 'N3', 'N2', 'N1']).optional(),
  questionType: z.enum(['VOCAB', 'KANJI', 'GRAMMAR', 'SYNONYM', 'ORDER', 'READING', 'LISTENING']).optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  minAttempts: z.number().positive().optional(),
})

export type AnalyticsQueryInput = z.infer<typeof AnalyticsQuerySchema>

// ===== Helper Functions =====

export function calculateAccuracy(correct: number, total: number): number {
  if (total === 0) return 0
  return Math.round((correct / total) * 100 * 100) / 100
}

export function calculateAverageTime(totalTime: number, count: number): number {
  if (count === 0) return 0
  return Math.round((totalTime / count) * 100) / 100
}

export function categorizeAnswerTime(timeSpentSec: number | null): 'fast' | 'normal' | 'slow' | 'skipped' {
  if (timeSpentSec === null) return 'skipped'
  if (timeSpentSec < 30) return 'fast'
  if (timeSpentSec < 120) return 'normal'
  return 'slow'
}

export function getAnswerInsights(answers: TestAnswerWithQuestion[]): {
  patterns: string[]
  recommendations: string[]
  weakAreas: string[]
  strengths: string[]
} {
  const patterns: string[] = []
  const recommendations: string[] = []
  const weakAreas: string[] = []
  const strengths: string[] = []

  // Analyze answer patterns
  const correctCount = answers.filter((a) => a.isCorrect === true).length
  const totalCount = answers.length
  const accuracy = calculateAccuracy(correctCount, totalCount)

  if (accuracy >= 80) {
    strengths.push('High overall accuracy')
    patterns.push('Consistent correct answers')
  } else if (accuracy < 50) {
    weakAreas.push('Low overall accuracy')
    recommendations.push('Review fundamental concepts')
  }

  // Analyze time patterns
  const answersWithTime = answers.filter((a) => a.timeSpentSec !== null)
  if (answersWithTime.length > 0) {
    const avgTime = answersWithTime.reduce((sum, a) => sum + (a.timeSpentSec || 0), 0) / answersWithTime.length

    if (avgTime < 30) {
      patterns.push('Very fast answering')
      recommendations.push('Consider taking more time to read questions carefully')
    } else if (avgTime > 180) {
      patterns.push('Slow answering pace')
      recommendations.push('Practice to improve speed and confidence')
    }
  }

  // Analyze question types
  const byType = answers.reduce(
    (acc, answer) => {
      const type = answer.question.type
      if (!acc[type]) {
        acc[type] = { correct: 0, total: 0 }
      }
      acc[type].total++
      if (answer.isCorrect) acc[type].correct++
      return acc
    },
    {} as Record<string, { correct: number; total: number }>,
  )

  Object.entries(byType).forEach(([type, stats]) => {
    const typeAccuracy = calculateAccuracy(stats.correct, stats.total)
    if (typeAccuracy >= 90) {
      strengths.push(`Excellent performance in ${type} questions`)
    } else if (typeAccuracy < 60) {
      weakAreas.push(`Poor performance in ${type} questions`)
      recommendations.push(`Focus on practicing ${type} questions`)
    }
  })

  return {
    patterns,
    recommendations,
    weakAreas,
    strengths,
  }
}
