import { z } from 'zod'
import { TestSectionType } from '../../shared/types/question.types'

// ===== Base Types =====
export type TestSection = TestSectionType
// Complex relation types - using any for simplicity
export type TestSectionWithItems = any
export type TestSectionWithTest = any
export type TestSectionBasic = any

// ===== Zod Schemas =====
export const QuestionTypeSchema = z.enum(['VOCAB', 'KANJI', 'GRAMMAR', 'SYNONYM', 'ORDER', 'READING', 'LISTENING'])

export const TestSectionBaseSchema = z.object({
  id: z.number().int().positive(),
  testId: z.number().int().positive(),
  title: z.string().min(1).max(255),
  type: QuestionTypeSchema,
  order: z.number().int().min(0),
})

export const CreateTestSectionSchema = z.object({
  testId: z.number().int().positive(),
  title: z.string().min(1).max(255),
  type: QuestionTypeSchema,
  order: z.number().int().min(0).default(0),
})

export const UpdateTestSectionSchema = CreateTestSectionSchema.partial().omit({ testId: true })

export const TestSectionQuerySchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  type: QuestionTypeSchema.optional(),
  testId: z.number().int().positive().optional(),
  sortBy: z.enum(['order', 'title', 'type']).default('order'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})

// ===== Type Exports =====
export type CreateTestSectionInput = z.infer<typeof CreateTestSectionSchema>
export type UpdateTestSectionInput = z.infer<typeof UpdateTestSectionSchema>
export type TestSectionQuery = z.infer<typeof TestSectionQuerySchema>
export type QuestionType = z.infer<typeof QuestionTypeSchema>

export const BulkCreateTestSectionsSchema = z.object({
  sections: z.array(CreateTestSectionSchema).min(1).max(50),
})

export const ReorderTestSectionsSchema = z.object({
  sections: z
    .array(
      z.object({
        id: z.number().int().positive(),
        order: z.number().int().min(0),
      }),
    )
    .min(1)
    .max(100),
})

export const BulkDeleteTestSectionsSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(100),
})

export type BulkCreateTestSectionsInput = z.infer<typeof BulkCreateTestSectionsSchema>
export type ReorderTestSectionsInput = z.infer<typeof ReorderTestSectionsSchema>
export type BulkDeleteTestSectionsInput = z.infer<typeof BulkDeleteTestSectionsSchema>

// ===== Section Statistics =====
export const TestSectionStatsSchema = z.object({
  totalItems: z.number().int().min(0),
  itemsByType: z.record(z.string(), z.number().int().min(0)),
  avgDifficulty: z.number().optional(),
  estimatedDurationMinutes: z.number().optional(),
})

export type TestSectionStats = z.infer<typeof TestSectionStatsSchema>
