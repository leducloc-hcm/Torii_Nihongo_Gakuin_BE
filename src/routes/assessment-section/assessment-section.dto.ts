import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import {
  CreateAssessmentSectionSchema,
  UpdateAssessmentSectionSchema,
  AssessmentSectionQuerySchema,
  QuestionTypeSchema,
  BulkCreateAssessmentSectionsSchema,
  ReorderAssessmentSectionsSchema,
  BulkDeleteAssessmentSectionsSchema,
} from './assessment-section.model'

// ===== Create AssessmentSection DTO =====
export class CreateAssessmentSectionDto {
  @ApiProperty({ description: 'Assessment paper ID this section belongs to' })
  assessmentId!: number

  @ApiProperty({ example: 'Vocabulary Section', description: 'Section title' })
  title!: string

  @ApiProperty({ enum: ['VOCAB', 'KANJI', 'GRAMMAR', 'SYNONYM', 'ORDER', 'READING', 'LISTENING'], example: 'VOCAB' })
  type!: z.infer<typeof QuestionTypeSchema>

  @ApiPropertyOptional({ default: 0, description: 'Display order within the assessment' })
  order?: number

  @ApiPropertyOptional({ default: 1.0, description: 'Score per question in this section' })
  scorePerQuestion?: number

  @ApiPropertyOptional({ description: 'Total score for this section (auto-calculated if not provided)' })
  totalScore?: number
}

// ===== Update AssessmentSection DTO =====
export class UpdateAssessmentSectionDto extends createZodDto(UpdateAssessmentSectionSchema) {
  @ApiPropertyOptional({ example: 'Updated Vocabulary Section' })
  title?: string

  @ApiPropertyOptional({ enum: ['VOCAB', 'KANJI', 'GRAMMAR', 'SYNONYM', 'ORDER', 'READING', 'LISTENING'] })
  type?: z.infer<typeof QuestionTypeSchema>

  @ApiPropertyOptional({ description: 'Display order within the assessment' })
  order?: number

  @ApiPropertyOptional({ description: 'Score per question in this section' })
  scorePerQuestion?: number

  @ApiPropertyOptional({ description: 'Total score for this section' })
  totalScore?: number
}

export class AssessmentSectionQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  page?: number = 1

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  limit?: number = 20

  @ApiPropertyOptional({ description: 'Search in title' })
  search?: string

  @ApiPropertyOptional({ enum: ['VOCAB', 'KANJI', 'GRAMMAR', 'SYNONYM', 'ORDER', 'READING', 'LISTENING'] })
  type?: z.infer<typeof QuestionTypeSchema>

  @ApiPropertyOptional({ description: 'Filter by assessment ID' })
  assessmentId?: number

  @ApiPropertyOptional({ enum: ['order', 'title', 'type', 'scorePerQuestion'], default: 'order' })
  sortBy?: string = 'order'

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  sortOrder?: string = 'asc'
}

export class BulkCreateAssessmentSectionsDto {
  @ApiProperty({
    type: [CreateAssessmentSectionDto],
    description: 'Array of assessment sections to create (max 50)',
  })
  sections!: CreateAssessmentSectionDto[]
}

export class ReorderAssessmentSectionsDto {
  @ApiProperty({
    type: [Object],
    example: [
      { id: 1, order: 0 },
      { id: 2, order: 1 },
    ],
    description: 'Array of section ID and new order pairs',
  })
  sections!: Array<{ id: number; order: number }>
}

export class BulkDeleteAssessmentSectionsDto {
  @ApiProperty({
    type: [Number],
    example: [1, 2, 3],
    description: 'Array of assessment section IDs to delete (max 100)',
  })
  ids!: number[]
}

// ===== Statistics Response DTO =====
export class AssessmentSectionStatsDto {
  @ApiProperty({ example: 15, description: 'Total number of items in section' })
  totalItems!: number

  @ApiProperty({
    example: { VOCAB: 10, GRAMMAR: 5 },
    description: 'Number of items by question type',
  })
  itemsByType!: Record<string, number>

  @ApiProperty({ example: 15.0, description: 'Total score for this section' })
  totalScore!: number

  @ApiProperty({ example: 1.0, description: 'Score per question' })
  scorePerQuestion!: number

  @ApiPropertyOptional({ example: 25, description: 'Estimated completion time in minutes' })
  estimatedDurationMinutes?: number
}

// ===== Copy Section DTO =====
export class CopyAssessmentSectionDto {
  @ApiProperty({ description: 'Target assessment paper ID to copy section to' })
  targetAssessmentId!: number

  @ApiPropertyOptional({ description: 'New title for the copied section' })
  newTitle?: string

  @ApiPropertyOptional({ default: false, description: 'Whether to copy all items as well' })
  copyItems?: boolean
}

// ===== Move Section DTO =====
export class MoveAssessmentSectionDto {
  @ApiProperty({ description: 'Target assessment paper ID to move section to' })
  targetAssessmentId!: number

  @ApiPropertyOptional({ description: 'New order in target assessment' })
  newOrder?: number
}

// ===== Create Section with Items DTO =====
export class CreateAssessmentSectionWithItemsDto {
  @ApiProperty({ example: 'Vocabulary Section', description: 'Section title' })
  title!: string

  @ApiProperty({ enum: ['VOCAB', 'KANJI', 'GRAMMAR', 'SYNONYM', 'ORDER', 'READING', 'LISTENING'], example: 'VOCAB' })
  type!: z.infer<typeof QuestionTypeSchema>

  @ApiPropertyOptional({ default: 0, description: 'Display order within the assessment' })
  order?: number

  @ApiProperty({
    type: [Number],
    example: [1, 2, 3],
    description: 'Array of question IDs to add to this section',
  })
  questionIds!: number[]

  @ApiProperty({
    type: [Number],
    example: [4, 5],
    description: 'Array of question group IDs to add to this section',
  })
  questionGroupIds?: number[]
}

// ===== Bulk Create Sections with Items DTO =====
export class BulkCreateSectionsWithItemsDto {
  @ApiProperty({ description: 'Assessment paper ID these sections belong to' })
  assessmentId!: number

  @ApiProperty({
    type: [CreateAssessmentSectionWithItemsDto],
    example: [
      {
        title: 'Vocabulary Section',
        type: 'VOCAB',
        order: 0,
        questionIds: [1, 2, 3],
        questionGroupIds: [1],
      },
      {
        title: 'Grammar Section',
        type: 'GRAMMAR',
        order: 1,
        questionIds: [4, 5, 6],
      },
    ],
    description: 'Array of sections to create with their items (max 10)',
  })
  sections!: CreateAssessmentSectionWithItemsDto[]
}

// ===== Update Section Scoring DTO =====
export class UpdateSectionScoringDto {
  @ApiPropertyOptional({ description: 'Score per question in this section' })
  scorePerQuestion?: number

  @ApiPropertyOptional({ description: 'Total score for this section' })
  totalScore?: number

  @ApiPropertyOptional({ default: false, description: 'Auto-calculate total score based on item count' })
  autoCalculate?: boolean
}
