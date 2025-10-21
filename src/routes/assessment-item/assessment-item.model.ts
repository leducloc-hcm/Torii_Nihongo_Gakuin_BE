import { z } from 'zod'
import { AssessmentItem, AssessmentSection, Question, QuestionGroup } from '@prisma/client'

export type AssessmentItemBase = AssessmentItem

export type AssessmentItemWithDetails = AssessmentItem & {
  section?: Pick<AssessmentSection, 'id' | 'title' | 'assessmentId' | 'type'>
  question?: Pick<Question, 'id' | 'stem' | 'type' | 'difficulty' | 'level'> | null
  questionGroup?: Pick<QuestionGroup, 'id' | 'title' | 'type'> | null
}

export type AssessmentItemWithRelations = AssessmentItem & {
  section: AssessmentSection
  question?: Question | null
  questionGroup?: QuestionGroup | null
}

// ===== Zod Schemas =====
export const CreateAssessmentItemSchema = z
  .object({
    sectionId: z.number().int().positive(),
    questionId: z.number().int().positive().optional(),
    questionGroupId: z.number().int().positive().optional(),
    order: z.number().int().min(0).default(0),
    score: z.number().min(0).optional(),
  })
  .refine((data) => data.questionId !== undefined || data.questionGroupId !== undefined, {
    message: 'Either questionId or questionGroupId must be provided',
  })
  .refine((data) => !(data.questionId !== undefined && data.questionGroupId !== undefined), {
    message: 'Cannot provide both questionId and questionGroupId',
  })

export const UpdateAssessmentItemSchema = z
  .object({
    questionId: z.number().int().positive().optional(),
    questionGroupId: z.number().int().positive().optional(),
    order: z.number().int().min(0).optional(),
    score: z.number().min(0).optional(),
  })
  .refine((data) => !(data.questionId !== undefined && data.questionGroupId !== undefined), {
    message: 'Cannot provide both questionId and questionGroupId',
  })

export const AssessmentItemQuerySchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sectionId: z.number().int().positive().optional(),
  questionId: z.number().int().positive().optional(),
  questionGroupId: z.number().int().positive().optional(),
  minOrder: z.number().int().min(0).optional(),
  maxOrder: z.number().int().min(0).optional(),
  includeQuestion: z.boolean().default(false),
  includeSection: z.boolean().default(false),
  includeQuestionGroup: z.boolean().default(false),
  sortBy: z.enum(['id', 'order', 'sectionId', 'questionId', 'questionGroupId']).default('order'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})

export const ReorderAssessmentItemsSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.number().int().positive(),
        order: z.number().int().min(0),
      }),
    )
    .min(1)
    .max(100),
})

export const BulkCreateAssessmentItemsSchema = z.object({
  items: z.array(CreateAssessmentItemSchema).min(1).max(100),
})

export const BulkDeleteAssessmentItemsSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(100),
})

export const CopyAssessmentItemsSchema = z.object({
  targetSectionId: z.number().int().positive(),
  maintainOrder: z.boolean().default(true),
})

export const MoveAssessmentItemsSchema = z.object({
  targetSectionId: z.number().int().positive(),
  newOrder: z.number().int().min(0).optional(),
})

// ===== Type Exports =====
export type CreateAssessmentItemInput = z.infer<typeof CreateAssessmentItemSchema>
export type UpdateAssessmentItemInput = z.infer<typeof UpdateAssessmentItemSchema>
export type AssessmentItemQuery = z.infer<typeof AssessmentItemQuerySchema>
export type ReorderAssessmentItemsInput = z.infer<typeof ReorderAssessmentItemsSchema>
export type BulkCreateAssessmentItemsInput = z.infer<typeof BulkCreateAssessmentItemsSchema>
export type BulkDeleteAssessmentItemsInput = z.infer<typeof BulkDeleteAssessmentItemsSchema>
export type CopyAssessmentItemsInput = z.infer<typeof CopyAssessmentItemsSchema>
export type MoveAssessmentItemsInput = z.infer<typeof MoveAssessmentItemsSchema>

// ===== Constants =====
export const ASSESSMENT_ITEM_CONSTRAINTS = {
  MAX_ORDER: 999999,
  MAX_BULK_CREATE: 100,
  MAX_BULK_DELETE: 100,
  MAX_BULK_REORDER: 100,
} as const

// ===== Error Messages =====
export const ASSESSMENT_ITEM_ERRORS = {
  NOT_FOUND: 'Assessment item not found',
  SECTION_NOT_FOUND: 'Assessment section not found',
  QUESTION_NOT_FOUND: 'Question not found',
  QUESTION_GROUP_NOT_FOUND: 'Question group not found',
  DUPLICATE_QUESTION: 'Question already exists in this section',
  INVALID_ORDER: 'Invalid order value',
  BULK_LIMIT_EXCEEDED: 'Bulk operation limit exceeded',
  CANNOT_MOVE_SAME_SECTION: 'Cannot move items to the same section',
  ORDER_CONFLICT: 'Order conflict detected',
} as const

// ===== Statistics Schema =====
export const AssessmentItemStatsSchema = z.object({
  totalItems: z.number().int().min(0),
  itemsByType: z.record(z.string(), z.number().int().min(0)),
  totalScore: z.number().min(0),
  avgScore: z.number().min(0).optional(),
  estimatedDurationMinutes: z.number().optional(),
})

export type AssessmentItemStats = z.infer<typeof AssessmentItemStatsSchema>
