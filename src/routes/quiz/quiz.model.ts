import { z } from 'zod'
import { Quiz, QuizAttempt, User, Lesson } from '@prisma/client'

export type QuizBase = Quiz

export type QuizWithRelations = Quiz & {
  author: Pick<User, 'id' | 'name' | 'email'>
  lesson?: Lesson | null
  attempts: (QuizAttempt & {
    user: Pick<User, 'id' | 'name' | 'email'>
  })[]
}

export type QuizBasic = Quiz & {
  author: Pick<User, 'id' | 'name' | 'email'>
  lesson?: Pick<Lesson, 'id' | 'title'> | null
  _count: {
    attempts: number
  }
}

export interface QuizStats {
  totalAttempts: number
  completedAttempts: number
  averageScore: number
  highestScore: number
  lowestScore: number
  passRate: number
  completionRate: number
}

export const CreateQuizSchema = z.object({
  title: z.string().min(1).max(255),
  lessonId: z.number().int().positive().optional(),
})

export const UpdateQuizSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  lessonId: z.number().int().positive().optional().nullable(),
})

export const QuizQuerySchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  lessonId: z.number().int().positive().optional(),
  createdBy: z.number().int().positive().optional(),
  includeAttempts: z.boolean().default(false),
  sortBy: z.enum(['id', 'title', 'createdAt', 'createdBy']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export type CreateQuizInput = z.infer<typeof CreateQuizSchema>
export type UpdateQuizInput = z.infer<typeof UpdateQuizSchema>
export type QuizQuery = z.infer<typeof QuizQuerySchema>

export const QUIZ_CONSTRAINTS = {
  MAX_TITLE_LENGTH: 255,
  DEFAULT_PASS_THRESHOLD: 0.7, // 70% to pass
} as const

export const QUIZ_ERRORS = {
  NOT_FOUND: 'Quiz not found',
  ATTEMPT_NOT_FOUND: 'Quiz attempt not found',
  LESSON_NOT_FOUND: 'Lesson not found',
  USER_NOT_FOUND: 'User not found',
  PERMISSION_DENIED: 'Permission denied',
} as const
