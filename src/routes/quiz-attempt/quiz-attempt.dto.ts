import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { createZodDto } from 'nestjs-zod'
import { StartQuizAttemptSchema, SubmitQuizAttemptSchema, QuizAttemptQuerySchema } from './quiz-attempt.model'

export class StartQuizAttemptDto extends createZodDto(StartQuizAttemptSchema) {
  @ApiProperty({
    description: 'Quiz ID to start attempt',
    example: 1,
  })
  quizId!: number
}

export class SubmitQuizAnswerDto {
  @ApiProperty({
    description: 'Question ID',
    example: 1,
  })
  questionId!: number

  @ApiPropertyOptional({
    description: 'Selected option ID (for multiple choice)',
    example: 1,
  })
  selectedOptionId?: number
}

export class SubmitQuizAttemptDto extends createZodDto(SubmitQuizAttemptSchema) {
  @ApiProperty({
    description: 'Array of answers',
    type: [SubmitQuizAnswerDto],
  })
  answers!: SubmitQuizAnswerDto[]
}

export class QuizAttemptQueryDto extends createZodDto(QuizAttemptQuerySchema) {
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
    description: 'Filter by user ID',
    example: 1,
  })
  userId?: number

  @ApiPropertyOptional({
    description: 'Filter by completion status',
    example: true,
  })
  completed?: boolean

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: ['id', 'startedAt', 'submittedAt'],
    example: 'startedAt',
  })
  sortBy!: 'id' | 'startedAt' | 'submittedAt'

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    example: 'desc',
  })
  sortOrder!: 'asc' | 'desc'
}
