import { z } from 'zod'
import { QuizItem, Question, QuestionGroup, Option } from '@prisma/client'

// ===== Base Types from Prisma =====
export type QuizItemBase = QuizItem

// Complex relation types
export type QuizItemWithRelations = QuizItem & {
  question: Question & {
    option: Option[]
  }
  questionGroup?: QuestionGroup | null
}

// ===== Zod Schemas =====
export const CreateQuizItemSchema = z.object({
  quizId: z.number().int().positive(),
  questionId: z.number().int().positive(),
  questionGroupId: z.number().int().positive().optional(),
  order: z.number().int().min(0).default(0),
})

export const UpdateQuizItemSchema = z.object({
  order: z.number().int().min(0).optional(),
  questionGroupId: z.number().int().positive().optional().nullable(),
})

export const QuizItemQuerySchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  quizId: z.number().int().positive().optional(),
  questionId: z.number().int().positive().optional(),
  sortBy: z.enum(['id', 'order']).default('order'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})

export const BulkAddQuestionsSchema = z.object({
  questionIds: z.array(z.number().int().positive()).min(1).max(50),
})

export const ReorderQuizItemsSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.number().int().positive(),
        order: z.number().int().min(0),
      }),
    )
    .min(1),
})

// ===== Input/Output Types =====
export type CreateQuizItemInput = z.infer<typeof CreateQuizItemSchema>
export type UpdateQuizItemInput = z.infer<typeof UpdateQuizItemSchema>
export type QuizItemQuery = z.infer<typeof QuizItemQuerySchema>
export type BulkAddQuestionsInput = z.infer<typeof BulkAddQuestionsSchema>
export type ReorderQuizItemsInput = z.infer<typeof ReorderQuizItemsSchema>

// ===== Constants =====
export const QUIZ_ITEM_ERRORS = {
  NOT_FOUND: 'Quiz item not found',
  QUIZ_NOT_FOUND: 'Quiz not found',
  QUESTION_NOT_FOUND: 'Question not found',
  QUESTION_GROUP_NOT_FOUND: 'Question group not found',
  DUPLICATE_QUESTION: 'Question already exists in this quiz',
  PERMISSION_DENIED: 'Permission denied',
} as const
