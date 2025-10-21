import { z } from 'zod'
import { AssessmentAnswer, AssessmentAttempt, Question, Option } from '@prisma/client'
import { JLPTLevel } from '@prisma/client'

// ===== Base AssessmentAnswer Types =====
export type AssessmentAnswerBase = AssessmentAnswer

export interface AssessmentAnswerWithDetails extends AssessmentAnswer {
  attempt: {
    id: number
    userId: number
    assessmentId: number
    startedAt: Date
  }
  question: {
    id: number
    type: string
    stem: string
    level: JLPTLevel
    difficulty: string
  }
  selectedOption?: {
    id: number
    content: string
    isCorrect: boolean
  }
}

export interface AssessmentAnswerWithQuestion extends AssessmentAnswer {
  question: {
    id: number
    type: string
    stem: string
    passage?: string
    explanation?: string
    level: JLPTLevel
    difficulty: string
    options: Array<{
      id: number
      content: string
      isCorrect: boolean
      order: number
    }>
  }
}

export interface AssessmentAnswerAnalytics {
  questionId: number
  totalAttempts: number
  correctAttempts: number
  averageTimeSpent: number
  difficultyRating: number
  accuracyRate: number
  commonMistakes: Array<{
    optionId: number
    optionContent: string
    frequency: number
  }>
}

export interface AssessmentAnswerSummary {
  attemptId: number
  totalQuestions: number
  answeredQuestions: number
  correctAnswers: number
  wrongAnswers: number
  skippedQuestions: number
  averageTimePerQuestion: number
  totalTimeSpent: number
  accuracy: number
}

export interface QuestionPerformance {
  questionId: number
  questionType: string
  level: JLPTLevel
  isCorrect: boolean | null
  timeSpent: number | null
  userAnswer: string | null
  correctAnswer: string
  explanation?: string
}

// ===== Validation Schemas =====
export const CreateAssessmentAnswerSchema = z.object({
  attemptId: z.number().int().positive(),
  questionId: z.number().int().positive(),
  selectedOptionId: z.number().int().positive().nullable(),
  timeSpentSec: z.number().int().min(0).nullable().optional(),
})

export const UpdateAssessmentAnswerSchema = z.object({
  selectedOptionId: z.number().int().positive().nullable().optional(),
  timeSpentSec: z.number().int().min(0).nullable().optional(),
  isCorrect: z.boolean().nullable().optional(),
  explanation: z.string().nullable().optional(),
})

export const AssessmentAnswerQuerySchema = z.object({
  attemptId: z.number().int().positive().optional(),
  questionId: z.number().int().positive().optional(),
  userId: z.number().int().positive().optional(),
  assessmentId: z.number().int().positive().optional(),
  isCorrect: z.boolean().nullable().optional(),
  level: z.enum(['N1', 'N2', 'N3', 'N4', 'N5']).optional(),
  questionType: z.string().optional(),
  includeQuestion: z.boolean().default(false),
  includeAttempt: z.boolean().default(false),
  includeSelectedOption: z.boolean().default(false),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['id', 'timeSpentSec', 'isCorrect']).default('id'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})

export const BulkCreateAssessmentAnswersSchema = z.object({
  answers: z.array(CreateAssessmentAnswerSchema),
})

export const GradeAssessmentAnswersSchema = z.object({
  attemptId: z.number().int().positive(),
  autoGrade: z.boolean().default(true),
})

export const AssessmentAnswerStatsSchema = z.object({
  questionId: z.number().int().positive().optional(),
  assessmentId: z.number().int().positive().optional(),
  level: z.enum(['N1', 'N2', 'N3', 'N4', 'N5']).optional(),
  questionType: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

// ===== Input/Output Types =====
export type CreateAssessmentAnswerInput = z.infer<typeof CreateAssessmentAnswerSchema>
export type UpdateAssessmentAnswerInput = z.infer<typeof UpdateAssessmentAnswerSchema>
export type AssessmentAnswerQuery = z.infer<typeof AssessmentAnswerQuerySchema>
export type BulkCreateAssessmentAnswersInput = z.infer<typeof BulkCreateAssessmentAnswersSchema>
export type GradeAssessmentAnswersInput = z.infer<typeof GradeAssessmentAnswersSchema>
export type AssessmentAnswerStatsInput = z.infer<typeof AssessmentAnswerStatsSchema>

// ===== Error Constants =====
export const ASSESSMENT_ANSWER_ERRORS = {
  NOT_FOUND: 'Assessment answer not found',
  ATTEMPT_NOT_FOUND: 'Assessment attempt not found',
  QUESTION_NOT_FOUND: 'Question not found',
  OPTION_NOT_FOUND: 'Option not found',
  ALREADY_ANSWERED: 'Question already answered',
  ATTEMPT_SUBMITTED: 'Cannot modify answers for submitted attempt',
  INVALID_OPTION: 'Selected option does not belong to the question',
  GRADING_FAILED: 'Failed to grade assessment answers',
  BULK_CREATE_FAILED: 'Failed to create multiple answers',
  PERMISSION_DENIED: 'Permission denied to access this answer',
  INVALID_TIME: 'Time spent cannot be negative',
  ATTEMPT_NOT_SUBMITTED: 'Cannot grade answers for unsubmitted attempt',
} as const

// ===== Helper Functions =====
export function calculateAccuracy(answers: AssessmentAnswer[]): number {
  if (answers.length === 0) return 0
  const correctCount = answers.filter((answer) => answer.isCorrect === true).length
  return (correctCount / answers.length) * 100
}

export function calculateAverageTime(answers: AssessmentAnswer[]): number {
  const answersWithTime = answers.filter((answer) => answer.timeSpentSec !== null)
  if (answersWithTime.length === 0) return 0
  const totalTime = answersWithTime.reduce((sum, answer) => sum + (answer.timeSpentSec || 0), 0)
  return totalTime / answersWithTime.length
}

export function groupAnswersByType(
  answers: AssessmentAnswerWithQuestion[],
): Record<string, AssessmentAnswerWithQuestion[]> {
  return answers.reduce(
    (groups, answer) => {
      const type = answer.question.type
      if (!groups[type]) {
        groups[type] = []
      }
      groups[type].push(answer)
      return groups
    },
    {} as Record<string, AssessmentAnswerWithQuestion[]>,
  )
}

export function calculateQuestionDifficulty(analytics: AssessmentAnswerAnalytics): 'EASY' | 'MEDIUM' | 'HARD' {
  const accuracy = analytics.accuracyRate
  if (accuracy >= 80) return 'EASY'
  if (accuracy >= 50) return 'MEDIUM'
  return 'HARD'
}

export function generateAnswerExplanation(answer: AssessmentAnswerWithQuestion, isCorrect: boolean): string {
  const question = answer.question
  const correctOption = question.options.find((opt) => opt.isCorrect)

  if (isCorrect) {
    return `Correct! ${question.explanation || 'Well done.'}`
  } else {
    return `Incorrect. The correct answer is: ${correctOption?.content || 'N/A'}. ${question.explanation || ''}`
  }
}

// ===== Grading Functions =====
export function gradeAnswer(
  answer: AssessmentAnswer,
  question: { options: Array<{ id: number; isCorrect: boolean }> },
): boolean | null {
  if (!answer.selectedOptionId) return null

  const selectedOption = question.options.find((opt) => opt.id === answer.selectedOptionId)
  return selectedOption?.isCorrect || false
}

export function calculateAttemptScore(answers: AssessmentAnswer[]): {
  totalQuestions: number
  answeredQuestions: number
  correctAnswers: number
  score: number
  accuracy: number
} {
  const totalQuestions = answers.length
  const answeredQuestions = answers.filter((a) => a.selectedOptionId !== null).length
  const correctAnswers = answers.filter((a) => a.isCorrect === true).length

  const score = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0
  const accuracy = answeredQuestions > 0 ? (correctAnswers / answeredQuestions) * 100 : 0

  return {
    totalQuestions,
    answeredQuestions,
    correctAnswers,
    score: Math.round(score * 100) / 100,
    accuracy: Math.round(accuracy * 100) / 100,
  }
}

// ===== Analytics Functions =====
export function generateQuestionAnalytics(answers: AssessmentAnswerWithDetails[]): AssessmentAnswerAnalytics[] {
  const grouped = answers.reduce(
    (groups, answer) => {
      const questionId = answer.questionId
      if (!groups[questionId]) {
        groups[questionId] = []
      }
      groups[questionId].push(answer)
      return groups
    },
    {} as Record<number, AssessmentAnswerWithDetails[]>,
  )

  return Object.entries(grouped).map(([questionId, questionAnswers]) => {
    const totalAttempts = questionAnswers.length
    const correctAttempts = questionAnswers.filter((a) => a.isCorrect === true).length
    const answersWithTime = questionAnswers.filter((a) => a.timeSpentSec !== null)
    const averageTimeSpent =
      answersWithTime.length > 0
        ? answersWithTime.reduce((sum, a) => sum + (a.timeSpentSec || 0), 0) / answersWithTime.length
        : 0

    return {
      questionId: parseInt(questionId),
      totalAttempts,
      correctAttempts,
      averageTimeSpent: Math.round(averageTimeSpent),
      difficultyRating: Math.round((1 - correctAttempts / totalAttempts) * 5),
      accuracyRate: Math.round((correctAttempts / totalAttempts) * 100),
      commonMistakes: [], // Would need to be calculated with option data
    }
  })
}
