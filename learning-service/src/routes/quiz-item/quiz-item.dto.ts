import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import {
  CreateQuizItemSchema,
  UpdateQuizItemSchema,
  QuizItemQuerySchema,
  BulkAddQuestionsSchema,
  ReorderQuizItemsSchema,
} from './quiz-item.model'

export class CreateQuizItemDto extends createZodDto(CreateQuizItemSchema) {
  @ApiProperty({
    description: 'Quiz ID',
    example: 1,
  })
  quizId!: number

  @ApiProperty({
    description: 'Question ID',
    example: 1,
  })
  questionId!: number

  @ApiPropertyOptional({
    description: 'Question Group ID',
    example: 1,
  })
  questionGroupId?: number

  @ApiPropertyOptional({
    description: 'Display order',
    example: 0,
    minimum: 0,
    default: 0,
  })
  order!: number
}

export class UpdateQuizItemDto extends createZodDto(UpdateQuizItemSchema) {
  @ApiPropertyOptional({
    description: 'Display order',
    example: 1,
    minimum: 0,
  })
  order?: number

  @ApiPropertyOptional({
    description: 'Question Group ID (null to remove)',
    example: 1,
  })
  questionGroupId?: number | null
}

export class QuizItemQueryDto extends createZodDto(QuizItemQuerySchema) {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  page!: number

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  limit!: number

  @ApiPropertyOptional({
    description: 'Filter by quiz ID',
    example: 1,
  })
  quizId?: number

  @ApiPropertyOptional({
    description: 'Filter by question ID',
    example: 1,
  })
  questionId?: number

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: ['id', 'order'],
    example: 'order',
  })
  sortBy!: 'id' | 'order'

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    example: 'asc',
  })
  sortOrder!: 'asc' | 'desc'
}

export class BulkAddQuestionsDto extends createZodDto(BulkAddQuestionsSchema) {
  @ApiProperty({
    description: 'Array of question IDs to add',
    example: [1, 2, 3],
    type: [Number],
  })
  questionIds!: number[]
}

export class ReorderQuizItemsDto extends createZodDto(ReorderQuizItemsSchema) {
  @ApiProperty({
    description: 'Array of item reorder instructions',
    example: [
      { id: 1, order: 0 },
      { id: 2, order: 1 },
    ],
    type: [Object],
  })
  items!: Array<{
    id: number
    order: number
  }>
}
