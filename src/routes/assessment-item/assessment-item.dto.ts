import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { createZodDto } from 'nestjs-zod'
import { Transform } from 'class-transformer'
import { CreateAssessmentItemSchema, UpdateAssessmentItemSchema, AssessmentItemQuerySchema } from './assessment-item.model'

export class CreateAssessmentItemDto extends createZodDto(CreateAssessmentItemSchema) {
  @ApiProperty({ example: 1, description: 'Section ID' })
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  sectionId!: number

  @ApiPropertyOptional({ example: 1, description: 'Question ID' })
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  questionId?: number

  @ApiPropertyOptional({ example: 1, description: 'Question Group ID' })
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  questionGroupId?: number

  @ApiProperty({ example: 0, description: 'Order in section', default: 0 })
  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : 0))
  order!: number

  @ApiPropertyOptional({ example: 'Reading Comprehension', description: 'Item name' })
  name?: string

  @ApiPropertyOptional({ example: 300, description: 'Time limit in seconds' })
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  timeLimitSec?: number

  @ApiPropertyOptional({ example: 1.0, description: 'Score per question' })
  @Transform(({ value }) => (value ? parseFloat(value) : undefined))
  scorePerQuestion?: number

  @ApiPropertyOptional({ enum: ['TEST', 'EXAM'], description: 'Assessment type' })
  assessmentType?: 'TEST' | 'EXAM'
}

export class UpdateAssessmentItemDto extends createZodDto(UpdateAssessmentItemSchema) {
  @ApiPropertyOptional({ example: 1, description: 'Question ID' })
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  questionId?: number

  @ApiPropertyOptional({ example: 1, description: 'Question Group ID' })
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  questionGroupId?: number

  @ApiPropertyOptional({ example: 0, description: 'Order in section' })
  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : undefined))
  order?: number

  @ApiPropertyOptional({ example: 'Reading Comprehension', description: 'Item name' })
  name?: string

  @ApiPropertyOptional({ example: 300, description: 'Time limit in seconds' })
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  timeLimitSec?: number

  @ApiPropertyOptional({ example: 1.0, description: 'Score per question' })
  @Transform(({ value }) => (value ? parseFloat(value) : undefined))
  scorePerQuestion?: number

  @ApiPropertyOptional({ enum: ['TEST', 'EXAM'], description: 'Assessment type' })
  assessmentType?: 'TEST' | 'EXAM'
}

export class AssessmentItemQueryDto extends createZodDto(AssessmentItemQuerySchema) {
  @ApiProperty({ example: 1, description: 'Page number', default: 1 })
  @Transform(({ value }) => (value ? parseInt(value, 10) : 1))
  page!: number

  @ApiProperty({ example: 20, description: 'Items per page', default: 20 })
  @Transform(({ value }) => (value ? parseInt(value, 10) : 20))
  limit!: number

  @ApiPropertyOptional({ example: 1, description: 'Filter by section ID' })
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  sectionId?: number

  @ApiPropertyOptional({ example: 1, description: 'Filter by question ID' })
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  questionId?: number

  @ApiPropertyOptional({ example: 1, description: 'Filter by question group ID' })
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  questionGroupId?: number

  @ApiPropertyOptional({ example: 0, description: 'Minimum order' })
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  minOrder?: number

  @ApiPropertyOptional({ example: 10, description: 'Maximum order' })
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  maxOrder?: number

  @ApiProperty({ example: false, description: 'Include question details', default: false })
  @Transform(({ value }) => value === 'true' || value === true)
  includeQuestion!: boolean

  @ApiProperty({ example: false, description: 'Include section details', default: false })
  @Transform(({ value }) => value === 'true' || value === true)
  includeSection!: boolean

  @ApiProperty({ example: false, description: 'Include question group details', default: false })
  @Transform(({ value }) => value === 'true' || value === true)
  includeQuestionGroup!: boolean

  @ApiProperty({ example: 'order', description: 'Sort by field', default: 'order' })
  sortBy!: string

  @ApiProperty({ enum: ['asc', 'desc'], description: 'Sort order', default: 'asc' })
  sortOrder!: 'asc' | 'desc'
}
