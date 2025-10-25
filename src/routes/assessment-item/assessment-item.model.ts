import { z } from 'zod'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { AssessmentItem, AssessmentSection, Question, QuestionGroup } from '@prisma/client'

// ===== Types =====
export type AssessmentItemBase = AssessmentItem

export type AssessmentItemWithDetails = AssessmentItem & {
  section?: Pick<AssessmentSection, 'id' | 'title' | 'assessmentId' | 'type'>
  question?: Pick<Question, 'id' | 'stem' | 'type' | 'difficulty' | 'level'> | null
  questionGroup?: Pick<QuestionGroup, 'id' | 'title' | 'type'> | null
}

export type AssessmentItemBasic = AssessmentItem

// ===== Swagger Response Models =====
export class QuestionResponse {
  @ApiProperty({ example: 1 })
  id!: number

  @ApiProperty({ example: 'What is the capital of Japan?' })
  stem!: string

  @ApiProperty({ example: 'MULTIPLE_CHOICE' })
  type!: string

  @ApiPropertyOptional({ example: 'MEDIUM' })
  difficulty?: string

  @ApiPropertyOptional({ example: 'N3' })
  level?: string
}

export class QuestionGroupResponse {
  @ApiProperty({ example: 1 })
  id!: number

  @ApiProperty({ example: 'Reading Comprehension Set 1' })
  title!: string

  @ApiProperty({ example: 'READING' })
  type!: string
}

export class SectionResponse {
  @ApiProperty({ example: 1 })
  id!: number

  @ApiProperty({ example: 'Grammar Section' })
  title!: string

  @ApiProperty({ example: 1 })
  assessmentId!: number

  @ApiProperty({ example: 'GRAMMAR' })
  type!: string
}

export class AssessmentItemResponse {
  @ApiProperty({ example: 1 })
  id!: number

  @ApiProperty({ example: 1 })
  sectionId!: number

  @ApiPropertyOptional({ example: 1 })
  questionId?: number | null

  @ApiPropertyOptional({ example: 1 })
  questionGroupId?: number | null

  @ApiProperty({ example: 0 })
  order!: number

  @ApiPropertyOptional({ example: 'Reading Comprehension' })
  name?: string | null

  @ApiPropertyOptional({ example: 300 })
  timeLimitSec?: number | null

  @ApiPropertyOptional({ example: 1.0 })
  scorePerQuestion?: number | null

  @ApiProperty()
  createdAt!: Date

  @ApiProperty()
  updatedAt!: Date

  @ApiPropertyOptional({ type: () => QuestionResponse })
  question?: QuestionResponse | null

  @ApiPropertyOptional({ type: () => QuestionGroupResponse })
  questionGroup?: QuestionGroupResponse | null

  @ApiPropertyOptional({ type: () => SectionResponse })
  section?: SectionResponse
}

export class PaginationResponse {
  @ApiProperty({ example: 100 })
  total!: number

  @ApiProperty({ example: 1 })
  page!: number

  @ApiProperty({ example: 20 })
  limit!: number

  @ApiProperty({ example: 5 })
  totalPages!: number

  @ApiProperty({ example: true })
  hasNext!: boolean

  @ApiProperty({ example: false })
  hasPrev!: boolean
}

export class AssessmentItemListResponse {
  @ApiProperty({ type: [AssessmentItemResponse] })
  data!: AssessmentItemResponse[]

  @ApiProperty({ type: () => PaginationResponse })
  pagination!: PaginationResponse
}

// ===== Zod Schemas =====
export const AssessmentTypeSchema = z.enum(['TEST', 'EXAM'])

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
  .refine(
    (data) => {
      if (data.questionId !== undefined && data.questionGroupId !== undefined) {
        return false
      }
      return true
    },
    { message: 'Cannot provide both questionId and questionGroupId' }
  )

export const AssessmentItemQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sectionId: z.number().int().positive().optional(),
  questionId: z.number().int().positive().optional(),
  questionGroupId: z.number().int().positive().optional(),
  minOrder: z.number().int().min(0).optional(),
  maxOrder: z.number().int().min(0).optional(),
  includeQuestion: z.boolean().default(false),
  includeSection: z.boolean().default(false),
  includeQuestionGroup: z.boolean().default(false),
  sortBy: z.string().default('order'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})
