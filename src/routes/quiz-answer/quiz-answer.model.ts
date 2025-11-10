import { z } from 'zod'
import { QuizAnswer, QuizAttempt, Question, Option } from '@prisma/client'

// ===== Base Types from Prisma =====
export type QuizAnswerBase = QuizAnswer

// Complex relation types
export type QuizAnswerWithRelations = QuizAnswer & {
  attempt: QuizAttempt
  question: Question
  selectedOption?: Option | null
}

export type QuizAnswerBasic = QuizAnswer & {
  question: Pick<Question, 'id' | 'stem' | 'type'>
  selectedOption?: Pick<Option, 'id' | 'content' | 'isCorrect'> | null
}

// ===== Zod Schemas =====
export const CreateQuizAnswerSchema = z.object({
  attemptId: z.number().int().positive(),
  questionId: z.number().int().positive(),
  selectedOptionId: z.number().int().positive().optional(),
  explanation: z.string().optional(),
})

export const UpdateQuizAnswerSchema = z.object({
  selectedOptionId: z.number().int().positive().optional().nullable(),
  explanation: z.string().optional().nullable(),
})

export const QuizAnswerQuerySchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  attemptId: z.number().int().positive().optional(),
  questionId: z.number().int().positive().optional(),
  isCorrect: z.boolean().optional(),
  sortBy: z.enum(['id', 'attemptId', 'questionId']).default('id'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})

// ===== Input/Output Types =====
export type CreateQuizAnswerInput = z.infer<typeof CreateQuizAnswerSchema>
export type UpdateQuizAnswerInput = z.infer<typeof UpdateQuizAnswerSchema>
export type QuizAnswerQuery = z.infer<typeof QuizAnswerQuerySchema>

// ===== Constants =====
export const QUIZ_ANSWER_ERRORS = {
  NOT_FOUND: 'Quiz answer not found',
  ATTEMPT_NOT_FOUND: 'Quiz attempt not found',
  QUESTION_NOT_FOUND: 'Question not found',
  OPTION_NOT_FOUND: 'Option not found',
  ATTEMPT_SUBMITTED: 'Cannot modify answer after attempt is submitted',
  DUPLICATE_ANSWER: 'Answer already exists for this question in this attempt',
  PERMISSION_DENIED: 'Permission denied',
} as const
