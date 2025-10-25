import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { createZodDto } from 'nestjs-zod'
import {
  CreateAssessmentItemSchema,
  UpdateAssessmentItemSchema,
  AssessmentItemQuerySchema,
} from './assessment-item.model'

export class CreateAssessmentItemDto extends createZodDto(CreateAssessmentItemSchema) {
  @ApiProperty({ example: 1, description: 'Section ID' })
  sectionId!: number

  @ApiPropertyOptional({ example: 1, description: 'Question ID' })
  questionId?: number

  @ApiPropertyOptional({ example: 1, description: 'Question Group ID' })
  questionGroupId?: number

  @ApiProperty({ example: 0, description: 'Order in section', default: 0 })
  order!: number

  @ApiPropertyOptional({ example: 'Reading Comprehension', description: 'Item name' })
  name?: string

  @ApiPropertyOptional({ example: 300, description: 'Time limit in seconds' })
  timeLimitSec?: number

  @ApiPropertyOptional({ example: 1.0, description: 'Score per question' })
  scorePerQuestion?: number

  @ApiPropertyOptional({ enum: ['TEST', 'EXAM'], description: 'Assessment type' })
  assessmentType?: 'TEST' | 'EXAM'
}

export class UpdateAssessmentItemDto extends createZodDto(UpdateAssessmentItemSchema) {
  @ApiPropertyOptional({ example: 1, description: 'Question ID' })
  questionId?: number

  @ApiPropertyOptional({ example: 1, description: 'Question Group ID' })
  questionGroupId?: number

  @ApiPropertyOptional({ example: 0, description: 'Order in section' })
  order?: number

  @ApiPropertyOptional({ example: 'Reading Comprehension', description: 'Item name' })
  name?: string

  @ApiPropertyOptional({ example: 300, description: 'Time limit in seconds' })
  timeLimitSec?: number

  @ApiPropertyOptional({ example: 1.0, description: 'Score per question' })
  scorePerQuestion?: number

  @ApiPropertyOptional({ enum: ['TEST', 'EXAM'], description: 'Assessment type' })
  assessmentType?: 'TEST' | 'EXAM'
}

export class AssessmentItemQueryDto extends createZodDto(AssessmentItemQuerySchema) {
  @ApiProperty({ example: 1, description: 'Page number', default: 1 })
  page!: number

  @ApiProperty({ example: 20, description: 'Items per page', default: 20 })
  limit!: number

  @ApiPropertyOptional({ example: 1, description: 'Filter by section ID' })
  sectionId?: number

  @ApiPropertyOptional({ example: 1, description: 'Filter by question ID' })
  questionId?: number

  @ApiPropertyOptional({ example: 1, description: 'Filter by question group ID' })
  questionGroupId?: number

  @ApiPropertyOptional({ example: 0, description: 'Minimum order' })
  minOrder?: number

  @ApiPropertyOptional({ example: 10, description: 'Maximum order' })
  maxOrder?: number

  @ApiProperty({ example: false, description: 'Include question details', default: false })
  includeQuestion!: boolean

  @ApiProperty({ example: false, description: 'Include section details', default: false })
  includeSection!: boolean

  @ApiProperty({ example: false, description: 'Include question group details', default: false })
  includeQuestionGroup!: boolean

  @ApiProperty({ example: 'order', description: 'Sort by field', default: 'order' })
  sortBy!: string

  @ApiProperty({ enum: ['asc', 'desc'], description: 'Sort order', default: 'asc' })
  sortOrder!: 'asc' | 'desc'
}
