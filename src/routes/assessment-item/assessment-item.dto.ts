import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { z } from 'zod'
import {
  CreateAssessmentItemSchema,
  UpdateAssessmentItemSchema,
  AssessmentItemQuerySchema,
  BulkCreateAssessmentItemsSchema,
  BulkDeleteAssessmentItemsSchema,
  ReorderAssessmentItemsSchema,
  CopyAssessmentItemsSchema,
  MoveAssessmentItemsSchema,
} from './assessment-item.model'

// ===== Create AssessmentItem DTO =====
export class CreateAssessmentItemDto {
  @ApiProperty({
    example: 123,
    description: 'ID of the assessment section this item belongs to',
  })
  sectionId!: number

  @ApiPropertyOptional({
    example: 456,
    description: 'ID of the question for this assessment item (either questionId or questionGroupId is required)',
  })
  questionId?: number

  @ApiPropertyOptional({
    example: 789,
    description: 'ID of the question group for this assessment item (either questionId or questionGroupId is required)',
  })
  questionGroupId?: number

  @ApiPropertyOptional({
    example: 1,
    default: 0,
    description: 'Order of the item within the section (auto-assigned if not provided)',
  })
  order?: number

  @ApiPropertyOptional({
    example: 1.0,
    description: 'Score assigned to this specific item (optional)',
  })
  score?: number
}

// ===== Update AssessmentItem DTO =====
export class UpdateAssessmentItemDto {
  @ApiPropertyOptional({
    example: 789,
    description: 'New question ID for this assessment item',
  })
  questionId?: number

  @ApiPropertyOptional({
    example: 321,
    description: 'New question group ID for this assessment item',
  })
  questionGroupId?: number

  @ApiPropertyOptional({
    example: 2,
    description: 'New order of the item within the section',
  })
  order?: number

  @ApiPropertyOptional({
    example: 2.0,
    description: 'New score for this assessment item',
  })
  score?: number
}

// ===== Query AssessmentItems DTO =====
export class AssessmentItemQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  page?: number = 1

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  limit?: number = 20

  @ApiPropertyOptional({
    example: 123,
    description: 'Filter by section ID',
  })
  sectionId?: number

  @ApiPropertyOptional({
    example: 456,
    description: 'Filter by question ID',
  })
  questionId?: number

  @ApiPropertyOptional({
    example: 789,
    description: 'Filter by question group ID',
  })
  questionGroupId?: number

  @ApiPropertyOptional({
    example: 0,
    description: 'Filter by minimum order',
  })
  minOrder?: number

  @ApiPropertyOptional({
    example: 10,
    description: 'Filter by maximum order',
  })
  maxOrder?: number

  @ApiPropertyOptional({
    example: true,
    default: false,
    description: 'Include question details in response',
  })
  includeQuestion?: boolean

  @ApiPropertyOptional({
    example: true,
    default: false,
    description: 'Include section details in response',
  })
  includeSection?: boolean

  @ApiPropertyOptional({
    example: true,
    default: false,
    description: 'Include question group details in response',
  })
  includeQuestionGroup?: boolean

  @ApiPropertyOptional({
    example: 'order',
    enum: ['id', 'order', 'sectionId', 'questionId', 'questionGroupId'],
    default: 'order',
    description: 'Sort by field',
  })
  sortBy?: string = 'order'

  @ApiPropertyOptional({
    example: 'asc',
    enum: ['asc', 'desc'],
    default: 'asc',
    description: 'Sort order',
  })
  sortOrder?: string = 'asc'
}

// ===== Reorder AssessmentItems DTO =====
export class ReorderAssessmentItemsDto {
  @ApiProperty({
    type: [Object],
    example: [
      { id: 1, order: 0 },
      { id: 2, order: 1 },
    ],
    description: 'Array of item ID and new order pairs (max 100)',
  })
  items!: Array<{
    id: number
    order: number
  }>
}

// ===== Bulk Create AssessmentItems DTO =====
export class BulkCreateAssessmentItemsDto {
  @ApiProperty({
    type: [CreateAssessmentItemDto],
    example: [
      { sectionId: 123, questionId: 456, order: 0 },
      { sectionId: 123, questionId: 789, order: 1 },
    ],
    description: 'Array of assessment items to create (max 100)',
  })
  items!: CreateAssessmentItemDto[]
}

// ===== Bulk Delete AssessmentItems DTO =====
export class BulkDeleteAssessmentItemsDto {
  @ApiProperty({
    type: [Number],
    example: [1, 2, 3],
    description: 'Array of assessment item IDs to delete (max 100)',
  })
  ids!: number[]
}

// ===== Copy AssessmentItems DTO =====
export class CopyAssessmentItemsDto {
  @ApiProperty({
    example: 789,
    description: 'Target section ID to copy items to',
  })
  targetSectionId!: number

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Whether to maintain original order in target section',
  })
  maintainOrder?: boolean
}

// ===== Move AssessmentItems DTO =====
export class MoveAssessmentItemsDto {
  @ApiProperty({
    example: 789,
    description: 'Target section ID to move items to',
  })
  targetSectionId!: number

  @ApiPropertyOptional({
    example: 0,
    description: 'New order for moved items in target section',
  })
  newOrder?: number
}

// ===== Statistics Response DTO =====
export class AssessmentItemStatsDto {
  @ApiProperty({ example: 15, description: 'Total number of items in section' })
  totalItems!: number

  @ApiProperty({
    example: { VOCAB: 10, GRAMMAR: 5 },
    description: 'Number of items by question type',
  })
  itemsByType!: Record<string, number>

  @ApiProperty({ example: 15.0, description: 'Total score for all items' })
  totalScore!: number

  @ApiPropertyOptional({ example: 1.0, description: 'Average score per item' })
  avgScore?: number

  @ApiPropertyOptional({ example: 25, description: 'Estimated completion time in minutes' })
  estimatedDurationMinutes?: number
}

// ===== Response DTOs =====
export class AssessmentItemResponseDto {
  @ApiProperty({ example: 1, description: 'Assessment item ID' })
  id!: number

  @ApiProperty({ example: 123, description: 'Section ID' })
  sectionId!: number

  @ApiProperty({ example: 456, description: 'Question ID' })
  questionId!: number | null

  @ApiProperty({ example: 789, description: 'Question group ID' })
  questionGroupId!: number | null

  @ApiProperty({ example: 0, description: 'Order within section' })
  order!: number

  @ApiPropertyOptional({ example: 1.0, description: 'Score for this item' })
  score?: number | null

  @ApiPropertyOptional({
    description: 'Question details (when includeQuestion=true)',
    example: {
      id: 456,
      stem: 'What is the meaning of "こんにちは"?',
      type: 'VOCAB',
    },
  })
  question?: {
    id: number
    stem: string
    type: string
    difficulty?: string
    level?: string
  } | null

  @ApiPropertyOptional({
    description: 'Question group details (when includeQuestionGroup=true)',
    example: {
      id: 789,
      title: 'Reading Comprehension Group',
      type: 'READING',
    },
  })
  questionGroup?: {
    id: number
    title?: string
    type: string
  } | null

  @ApiPropertyOptional({
    description: 'Section details (when includeSection=true)',
    example: {
      id: 123,
      title: 'Vocabulary Section',
      assessmentId: 456,
      type: 'VOCAB',
    },
  })
  section?: {
    id: number
    title: string
    assessmentId: number
    type: string
  }
}

export class AssessmentItemListResponseDto {
  @ApiProperty({ type: [AssessmentItemResponseDto] })
  data!: AssessmentItemResponseDto[]

  @ApiProperty({
    example: {
      total: 100,
      page: 1,
      limit: 20,
      totalPages: 5,
    },
    description: 'Pagination information',
  })
  pagination!: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

// ===== Create Items for Section DTO =====
export class CreateItemsForSectionDto {
  @ApiPropertyOptional({
    type: [Number],
    example: [1, 2, 3, 4, 5],
    description: 'Array of question IDs to add to the section (max 50)',
  })
  questionIds?: number[]

  @ApiPropertyOptional({
    type: [Number],
    example: [10, 11, 12],
    description: 'Array of question group IDs to add to the section (max 20)',
  })
  questionGroupIds?: number[]

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Whether to maintain question order as provided',
  })
  maintainOrder?: boolean
}

// ===== Create Items from Question Group DTO =====
export class CreateItemsFromQuestionGroupDto {
  @ApiProperty({
    example: 123,
    description: 'Section ID to add the question group to',
  })
  sectionId!: number

  @ApiProperty({
    example: 456,
    description: 'Question group ID to add to the section',
  })
  questionGroupId!: number

  @ApiPropertyOptional({
    example: true,
    default: false,
    description: 'Whether to add individual questions from the group or the group itself',
  })
  addIndividualQuestions?: boolean

  @ApiPropertyOptional({
    example: 1,
    description: 'Order of the item within the section (auto-assigned if not provided)',
  })
  order?: number
}

// ===== Bulk Create Items from Question Groups DTO =====
export class BulkCreateItemsFromQuestionGroupsDto {
  @ApiProperty({
    type: [CreateItemsFromQuestionGroupDto],
    example: [
      { sectionId: 123, questionGroupId: 456, addIndividualQuestions: false },
      { sectionId: 123, questionGroupId: 789, addIndividualQuestions: true },
    ],
    description: 'Array of question group items to create (max 20)',
  })
  items!: CreateItemsFromQuestionGroupDto[]
}
