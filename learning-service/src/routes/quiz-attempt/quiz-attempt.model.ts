import { z } from 'zod'
import { QuizAttempt, QuizAnswer, Quiz, User, Question, Option } from '@prisma/client'

// ===== Base Types from Prisma =====
export type QuizAttemptBase = QuizAttempt

// Complex relation types
export type QuizAttemptWithRelations = QuizAttempt & {
  quiz: Pick<Quiz, 'id' | 'title' | 'timeLimitSec'>
  user: Pick<User, 'id' | 'name' | 'email'>
  answers: (QuizAnswer & {
    question: Question
    selectedOption?: Option | null
  })[]
}

export type QuizAttemptBasic = QuizAttempt & {
  quiz: Pick<Quiz, 'id' | 'title'>
  user: Pick<User, 'id' | 'name' | 'email'>
  _count: {
    answers: number
  }
}

export type QuizAttemptStatistics = {
  totalQuestions: number
  answeredQuestions: number
  unansweredQuestions: number
  correctAnswers: number
  incorrectAnswers: number
  accuracyPercentage: number
}

export type QuizAttemptWithStatistics = QuizAttempt & {
  statistics: QuizAttemptStatistics
}

// ===== Zod Schemas =====
export const StartQuizAttemptSchema = z.object({
  quizId: z.number().int().positive(),
})

export const SubmitQuizAttemptSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.number().int().positive(),
        selectedOptionId: z.number().int().positive().optional(),
      }),
    )
    .min(1),
})

export const QuizAttemptQuerySchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  quizId: z.number().int().positive().optional(),
  userId: z.number().int().positive().optional(),
  completed: z.boolean().optional(),
  sortBy: z.enum(['id', 'startedAt', 'submittedAt']).default('startedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// ===== Input/Output Types =====
export type StartQuizAttemptInput = z.infer<typeof StartQuizAttemptSchema>
export type SubmitQuizAttemptInput = z.infer<typeof SubmitQuizAttemptSchema>
export type QuizAttemptQuery = z.infer<typeof QuizAttemptQuerySchema>

// ===== Constants =====
export const QUIZ_ATTEMPT_ERRORS = {
  NOT_FOUND: 'Quiz attempt not found',
  QUIZ_NOT_FOUND: 'Quiz not found',
  ALREADY_SUBMITTED: 'Quiz attempt already submitted',
  NOT_SUBMITTED: 'Quiz attempt not yet submitted',
  NO_QUESTIONS: 'Quiz has no questions',
  PERMISSION_DENIED: 'Permission denied',
} as const
