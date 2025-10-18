import { z } from 'zod'
import { TestItemType } from 'src/shared/types/question.types'

export type TestItem = TestItemType
export interface TestItemWithDetails extends TestItem {
  section?: {
    id: number
    title: string
    testId: number
  }
  question?: {
    id: number
    stem: string
    type: string
    difficulty: string
    level: string
  }
}

// ===== Zod Schemas =====
export const CreateTestItemSchema = z.object({
  sectionId: z.number().int().positive(),
  questionId: z.number().int().positive(),
  order: z.number().int().min(0).optional(),
})

export const UpdateTestItemSchema = z.object({
  questionId: z.number().int().positive().optional(),
  order: z.number().int().min(0).optional(),
})

export const TestItemQuerySchema = z.object({
  sectionId: z.number().int().positive().optional(),
  questionId: z.number().int().positive().optional(),
  minOrder: z.number().int().min(0).optional(),
  maxOrder: z.number().int().min(0).optional(),
  includeQuestion: z.boolean().optional(),
  includeSection: z.boolean().optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  sortBy: z.enum(['id', 'order', 'questionId']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

export const ReorderTestItemsSchema = z.object({
  updates: z
    .array(
      z.object({
        id: z.number().int().positive(),
        newOrder: z.number().int().min(0),
      }),
    )
    .min(1)
    .max(100),
})

export const BulkCreateTestItemsSchema = z.object({
  items: z.array(CreateTestItemSchema).min(1).max(100),
})

export const BulkDeleteTestItemsSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(100),
})

export const CopyTestItemsSchema = z.object({
  targetSectionId: z.number().int().positive(),
  maintainOrder: z.boolean().optional(),
})

export const MoveTestItemsSchema = z.object({
  targetSectionId: z.number().int().positive(),
  newOrder: z.number().int().min(0).optional(),
})

// ===== Type Exports =====
export type CreateTestItemInput = z.infer<typeof CreateTestItemSchema>
export type UpdateTestItemInput = z.infer<typeof UpdateTestItemSchema>
export type TestItemQueryInput = z.infer<typeof TestItemQuerySchema>
export type ReorderTestItemsInput = z.infer<typeof ReorderTestItemsSchema>
export type BulkCreateTestItemsInput = z.infer<typeof BulkCreateTestItemsSchema>
export type BulkDeleteTestItemsInput = z.infer<typeof BulkDeleteTestItemsSchema>
export type CopyTestItemsInput = z.infer<typeof CopyTestItemsSchema>
export type MoveTestItemsInput = z.infer<typeof MoveTestItemsSchema>

// ===== Constants =====
export const TEST_ITEM_CONSTRAINTS = {
  MAX_ORDER: 999999,
  MAX_BULK_CREATE: 100,
  MAX_BULK_DELETE: 100,
  MAX_BULK_REORDER: 100,
} as const

// ===== Error Messages =====
export const TEST_ITEM_ERRORS = {
  NOT_FOUND: 'Test item not found',
  SECTION_NOT_FOUND: 'Test section not found',
  QUESTION_NOT_FOUND: 'Question not found',
  DUPLICATE_QUESTION: 'Question already exists in this section',
  INVALID_ORDER: 'Invalid order value',
  BULK_LIMIT_EXCEEDED: 'Bulk operation limit exceeded',
  CANNOT_MOVE_SAME_SECTION: 'Cannot move items to the same section',
  ORDER_CONFLICT: 'Order conflict detected',
} as const
