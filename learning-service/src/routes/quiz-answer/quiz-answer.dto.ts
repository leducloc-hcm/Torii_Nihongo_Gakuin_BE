import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { createZodDto } from 'nestjs-zod'
import { CreateQuizAnswerSchema, UpdateQuizAnswerSchema, QuizAnswerQuerySchema } from './quiz-answer.model'

export class CreateQuizAnswerDto extends createZodDto(CreateQuizAnswerSchema) {
  @ApiProperty({
    description: 'Quiz attempt ID',
    example: 1,
  })
  attemptId!: number

  @ApiProperty({
    description: 'Question ID',
    example: 1,
  })
  questionId!: number

  @ApiPropertyOptional({
    description: 'Selected option ID',
    example: 1,
  })
  selectedOptionId?: number

  @ApiPropertyOptional({
    description: 'Explanation for the answer',
    example: 'This is the correct answer because...',
  })
  explanation?: string
}

export class UpdateQuizAnswerDto extends createZodDto(UpdateQuizAnswerSchema) {
  @ApiPropertyOptional({
    description: 'Selected option ID (null to remove)',
    example: 1,
  })
  selectedOptionId?: number | null

  @ApiPropertyOptional({
    description: 'Explanation for the answer (null to remove)',
    example: 'Updated explanation',
  })
  explanation?: string | null
}

export class QuizAnswerQueryDto extends createZodDto(QuizAnswerQuerySchema) {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  page!: number

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  limit!: number

  @ApiPropertyOptional({
    description: 'Filter by attempt ID',
    example: 1,
  })
  attemptId?: number

  @ApiPropertyOptional({
    description: 'Filter by question ID',
    example: 1,
  })
  questionId?: number

  @ApiPropertyOptional({
    description: 'Filter by correctness',
    example: true,
  })
  isCorrect?: boolean

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: ['id', 'attemptId', 'questionId'],
    example: 'id',
  })
  sortBy!: 'id' | 'attemptId' | 'questionId'

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    example: 'asc',
  })
  sortOrder!: 'asc' | 'desc'
}
