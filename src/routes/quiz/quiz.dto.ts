import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { CreateQuizSchema, UpdateQuizSchema, QuizQuerySchema } from './quiz.model'

export class CreateQuizDto extends createZodDto(CreateQuizSchema) {
  @ApiProperty({
    description: 'Quiz title',
    example: 'N5 Vocabulary Quiz',
    maxLength: 255,
  })
  title!: string

  @ApiPropertyOptional({
    description: 'Associated lesson ID',
    example: 1,
  })
  lessonId?: number

  @ApiProperty({
    description: 'Time limit in seconds',
    example: 1800,
  })
  timeLimitSec!: number

  @ApiPropertyOptional({
    description: 'Quiz version',
    example: 1,
    default: 1,
  })
  version!: number
}

export class UpdateQuizDto extends createZodDto(UpdateQuizSchema) {
  @ApiPropertyOptional({
    description: 'Quiz title',
    example: 'Updated N5 Vocabulary Quiz',
    maxLength: 255,
  })
  title?: string

  @ApiPropertyOptional({
    description: 'Associated lesson ID (null to remove)',
    example: 1,
  })
  lessonId?: number | null

  @ApiPropertyOptional({
    description: 'Time limit in seconds',
    example: 1800,
  })
  timeLimitSec?: number

  @ApiPropertyOptional({
    description: 'Quiz version',
    example: 2,
  })
  version?: number
}

export class QuizQueryDto extends createZodDto(QuizQuerySchema) {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  page!: number

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  limit!: number

  @ApiPropertyOptional({
    description: 'Search in quiz title',
    example: 'vocabulary',
  })
  search?: string

  @ApiPropertyOptional({
    description: 'Filter by lesson ID',
    example: 1,
  })
  lessonId?: number

  @ApiPropertyOptional({
    description: 'Filter by creator ID',
    example: 1,
  })
  createdBy?: number

  @ApiPropertyOptional({
    description: 'Include attempt statistics',
    example: false,
  })
  includeAttempts!: boolean

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: ['id', 'title', 'createdAt', 'createdBy'],
    example: 'createdAt',
  })
  sortBy!: 'id' | 'title' | 'createdAt' | 'createdBy'

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    example: 'desc',
  })
  sortOrder!: 'asc' | 'desc'
}

export const BulkDeleteQuizSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(100),
})

export class BulkDeleteQuizDto extends createZodDto(BulkDeleteQuizSchema) {
  @ApiProperty({
    type: [Number],
    example: [1, 2, 3],
    description: 'Array of quiz IDs to delete (max 100)',
  })
  ids!: number[]
}

export const CloneQuizSchema = z.object({
  title: z.string().min(1).max(255).optional(),
})

export class CloneQuizDto extends createZodDto(CloneQuizSchema) {
  @ApiPropertyOptional({ example: 'Cloned Quiz Title' })
  title?: string
}

// ===== Statistics DTOs =====
export class QuizStatsDto {
  @ApiProperty({ example: 45, description: 'Total number of attempts' })
  totalAttempts!: number

  @ApiProperty({ example: 32, description: 'Number of completed attempts' })
  completedAttempts!: number

  @ApiProperty({ example: 78.5, description: 'Average score' })
  averageScore!: number

  @ApiProperty({ example: 95.2, description: 'Highest score achieved' })
  highestScore!: number

  @ApiProperty({ example: 45.8, description: 'Lowest score achieved' })
  lowestScore!: number

  @ApiProperty({ example: 0.8, description: 'Pass rate (0-1)' })
  passRate!: number

  @ApiProperty({ example: 0.9, description: 'Completion rate (0-1)' })
  completionRate!: number
}
