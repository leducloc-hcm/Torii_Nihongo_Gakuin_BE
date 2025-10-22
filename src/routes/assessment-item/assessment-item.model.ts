import { z } from 'zod'
import { AssessmentItem, AssessmentSection, Question, QuestionGroup, AssessmentType } from '@prisma/client'

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

// ===== Assessment Type Schema =====
export const AssessmentTypeSchema = z.enum(['TEST', 'EXAM'])

// ===== Zod Schemas =====
export const CreateAssessmentItemSchema = z
  .object({
    sectionId: z.number().int().positive(),
    questionId: z.number().int().positive().optional(),
    questionGroupId: z.number().int().positive().optional(),
    order: z.number().int().min(0).default(0),
    name: z.string().optional(),
    timeLimitSec: z.number().int().min(0).optional(),
    scorePerQuestion: z.number().min(0).optional(),
    assessmentType: AssessmentTypeSchema.optional(),
  })
  .refine((data) => data.questionId !== undefined || data.questionGroupId !== undefined, {
    message: 'Either questionId or questionGroupId must be provided',
  })
  .refine((data) => !(data.questionId !== undefined && data.questionGroupId !== undefined), {
    message: 'Cannot provide both questionId and questionGroupId',
  })
  .transform((data) => {
    // For TEST type: default scorePerQuestion to 1 if not provided
    if (data.assessmentType === 'TEST' && data.scorePerQuestion === undefined) {
      data.scorePerQuestion = 1
    }
    return data
  })

export const UpdateAssessmentItemSchema = z
  .object({
    questionId: z.number().int().positive().optional(),
    questionGroupId: z.number().int().positive().optional(),
    order: z.number().int().min(0).optional(),
    name: z.string().optional(),
    timeLimitSec: z.number().int().min(0).optional(),
    scorePerQuestion: z.number().min(0).optional(),
    assessmentType: AssessmentTypeSchema.optional(),
  })
  .refine((data) => !(data.questionId !== undefined && data.questionGroupId !== undefined), {
    message: 'Cannot provide both questionId and questionGroupId',
  })

// Schema for creating items with assessment type validation
export const CreateAssessmentItemWithTypeSchema = z
  .object({
    sectionId: z.number().int().positive(),
    questionId: z.number().int().positive().optional(),
    questionGroupId: z.number().int().positive().optional(),
    order: z.number().int().min(0).default(0),
    name: z.string().optional(),
    timeLimitSec: z.number().int().min(0).optional(),
    scorePerQuestion: z.number().min(0).optional(),
    assessmentType: AssessmentTypeSchema,
  })
  .refine((data) => data.questionId !== undefined || data.questionGroupId !== undefined, {
    message: 'Either questionId or questionGroupId must be provided',
  })
  .refine((data) => !(data.questionId !== undefined && data.questionGroupId !== undefined), {
    message: 'Cannot provide both questionId and questionGroupId',
  })
  .refine(
    (data) => {
      // For EXAM type: scorePerQuestion is required
      if (data.assessmentType === 'EXAM' && data.scorePerQuestion === undefined) {
        return false
      }
      return true
    },
    {
      message: 'scorePerQuestion is required for EXAM type assessments',
      path: ['scorePerQuestion'],
    },
  )
  .transform((data) => {
    // For TEST type: default scorePerQuestion to 1 if not provided
    if (data.assessmentType === 'TEST' && data.scorePerQuestion === undefined) {
      data.scorePerQuestion = 1
    }
    return data
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
export type CreateAssessmentItemWithTypeInput = z.infer<typeof CreateAssessmentItemWithTypeSchema>
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
  DEFAULT_TEST_SCORE_PER_QUESTION: 1,
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
  SCORE_REQUIRED_FOR_EXAM: 'scorePerQuestion is required for EXAM type assessments',
  NO_SCORING_FOR_TEST: 'TEST type assessments do not use numerical scoring',
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

// ===== Scoring Helper Functions =====
export interface AssessmentItemScoring {
  totalQuestions: number
  totalScore: number
  scorePerQuestion: number
  isTestType: boolean
  assessmentType: 'TEST' | 'EXAM'
}

export function calculateItemScore(
  assessmentType: 'TEST' | 'EXAM',
  scorePerQuestion: number = 1.0,
  questionCount: number = 1,
): AssessmentItemScoring {
  const isTestType = assessmentType === 'TEST'

  if (isTestType) {
    // For TEST type: scorePerQuestion defaults to 1 but can be customized
    // However, we don't calculate total scores for TEST type (only track correct/incorrect)
    return {
      totalQuestions: questionCount,
      totalScore: 0, // No total score calculation for TEST
      scorePerQuestion: scorePerQuestion || ASSESSMENT_ITEM_CONSTRAINTS.DEFAULT_TEST_SCORE_PER_QUESTION,
      isTestType: true,
      assessmentType: 'TEST',
    }
  }

  // For EXAM type: calculate score based on scorePerQuestion * questionCount
  // scorePerQuestion is required for EXAM type
  const finalScorePerQuestion = scorePerQuestion || 0
  return {
    totalQuestions: questionCount,
    totalScore: finalScorePerQuestion * questionCount,
    scorePerQuestion: finalScorePerQuestion,
    isTestType: false,
    assessmentType: 'EXAM',
  }
}

export function getQuestionCountFromItem(
  item: AssessmentItemWithDetails | AssessmentItemWithRelations,
  questionsInGroup?: number,
): number {
  if (item.questionId) {
    // Single question
    return 1
  } else if (item.questionGroupId) {
    // Question group - need to count questions in the group
    if (questionsInGroup !== undefined) {
      return questionsInGroup
    }
    // If we have the full relation data
    if ('questionGroup' in item && item.questionGroup && 'questions' in item.questionGroup) {
      return (item.questionGroup as any).questions?.length || 1
    }
    // Default to 1 if we can't determine the count
    return 1
  }
  return 1
}

export function calculateAssessmentItemTotalScore(
  item: AssessmentItemWithDetails,
  assessmentType: 'TEST' | 'EXAM',
  questionCountInGroup?: number,
): AssessmentItemScoring {
  const questionCount = getQuestionCountFromItem(item, questionCountInGroup)
  const scorePerQuestion = item.scorePerQuestion || (assessmentType === 'TEST' ? 1.0 : 0)

  return calculateItemScore(assessmentType, scorePerQuestion, questionCount)
}

/**
 * Validates scorePerQuestion based on assessment type
 * @param assessmentType - TEST or EXAM
 * @param scorePerQuestion - The score per question value
 * @returns validation result
 */
export function validateScorePerQuestion(
  assessmentType: 'TEST' | 'EXAM',
  scorePerQuestion?: number,
): { isValid: boolean; error?: string; defaultValue?: number } {
  if (assessmentType === 'TEST') {
    // For TEST: scorePerQuestion defaults to 1 but can be customized
    return {
      isValid: true,
      defaultValue: scorePerQuestion || ASSESSMENT_ITEM_CONSTRAINTS.DEFAULT_TEST_SCORE_PER_QUESTION,
    }
  }

  if (assessmentType === 'EXAM') {
    // For EXAM: scorePerQuestion is required
    if (scorePerQuestion === undefined || scorePerQuestion === null) {
      return {
        isValid: false,
        error: ASSESSMENT_ITEM_ERRORS.SCORE_REQUIRED_FOR_EXAM,
      }
    }
    return {
      isValid: true,
      defaultValue: scorePerQuestion,
    }
  }

  return { isValid: false, error: 'Invalid assessment type' }
}

/**
 * Gets the appropriate scorePerQuestion for an assessment item
 * @param assessmentType - TEST or EXAM
 * @param providedScore - The provided score per question
 * @returns the final score per question value
 */
export function getScorePerQuestion(assessmentType: 'TEST' | 'EXAM', providedScore?: number): number {
  if (assessmentType === 'TEST') {
    return providedScore || ASSESSMENT_ITEM_CONSTRAINTS.DEFAULT_TEST_SCORE_PER_QUESTION
  }

  if (assessmentType === 'EXAM') {
    if (providedScore === undefined || providedScore === null) {
      throw new Error(ASSESSMENT_ITEM_ERRORS.SCORE_REQUIRED_FOR_EXAM)
    }
    return providedScore
  }

  throw new Error('Invalid assessment type')
}
