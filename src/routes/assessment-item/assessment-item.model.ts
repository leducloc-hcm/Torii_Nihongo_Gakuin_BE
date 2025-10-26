import { z } from 'zod'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

// ===== Zod Schemas =====
export const CreateAssessmentItemSchema = z.object({
  sectionId: z.number().int().positive(),
  name: z.string().optional(),
  order: z.number().int().min(0).default(0),
  scorePerQuestion: z.number().min(0).optional(),
  questionIds: z.array(z.number().int().positive()).optional(),
  questionGroupIds: z.array(z.number().int().positive()).optional(),
})

export const UpdateAssessmentItemSchema = z.object({
  name: z.string().optional(),
  order: z.number().int().min(0).optional(),
  scorePerQuestion: z.number().min(0).optional(),
  // Update questions
  questionIds: z.array(z.number().int().positive()).optional(),
  // Update question groups
  questionGroupIds: z.array(z.number().int().positive()).optional(),
})

export const AssessmentItemQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sectionId: z.number().int().positive().optional(),
  sortBy: z.enum(['id', 'order', 'name', 'createdAt']).default('order'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})

// ===== Response Models =====
export class QuestionResponse {
  @ApiProperty({ example: 1 })
  id!: number

  @ApiProperty({ example: 'What is the capital of Japan?' })
  stem!: string

  @ApiProperty({ example: 'MULTIPLE_CHOICE' })
  type!: string

  @ApiProperty({ example: 'MEDIUM' })
  difficulty!: string

  @ApiProperty({ example: 'N3' })
  level!: string
}

export class QuestionGroupResponse {
  @ApiProperty({ example: 1 })
  id!: number

  @ApiProperty({ example: 'Reading Comprehension Set 1' })
  title!: string

  @ApiProperty({ example: 'READING' })
  type!: string
}

export class AssessmentItemResponse {
  @ApiProperty({ example: 1 })
  id!: number

  @ApiProperty({ example: 1 })
  sectionId!: number

  @ApiPropertyOptional({ example: 'Reading Comprehension' })
  name?: string | null

  @ApiProperty({ example: 0 })
  order!: number

  @ApiPropertyOptional({ example: 1.0 })
  scorePerQuestion?: number | null

  @ApiPropertyOptional({ type: [QuestionResponse] })
  questions?: QuestionResponse[]

  @ApiPropertyOptional({ type: [QuestionGroupResponse] })
  questionGroups?: QuestionGroupResponse[]
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
}

export class AssessmentItemListResponse {
  @ApiProperty({ type: [AssessmentItemResponse] })
  data!: AssessmentItemResponse[]

  @ApiProperty({ type: () => PaginationResponse })
  pagination!: PaginationResponse
}
