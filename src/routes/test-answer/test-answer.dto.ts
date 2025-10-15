// ===== TestAnswer DTOs =====
// Data Transfer Objects for TestAnswer API endpoints
// Handles documentation for TestAnswer operations

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { JLPTLevel, QuestionType, Difficulty } from '@prisma/client'

// ===== Request DTOs =====

export class CreateTestAnswerDto {
  @ApiProperty({
    example: 123,
    description: 'ID of the test attempt',
  })
  attemptId: number

  @ApiProperty({
    example: 456,
    description: 'ID of the question being answered',
  })
  questionId: number

  @ApiPropertyOptional({
    example: 789,
    description: 'ID of the selected option (null for skipped questions)',
  })
  selectedOptionId?: number

  @ApiPropertyOptional({
    example: 45,
    description: 'Time spent on this question in seconds',
  })
  timeSpentSec?: number

  @ApiPropertyOptional({
    example: 'I chose this answer because...',
    description: 'Student explanation for their answer choice',
  })
  explanation?: string
}

export class UpdateTestAnswerDto {
  @ApiPropertyOptional({
    example: 789,
    description: 'ID of the selected option',
  })
  selectedOptionId?: number

  @ApiPropertyOptional({
    example: 60,
    description: 'Time spent on this question in seconds',
  })
  timeSpentSec?: number

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the answer is correct',
  })
  isCorrect?: boolean

  @ApiPropertyOptional({
    example: 'Updated explanation for my answer...',
    description: 'Student explanation for their answer choice',
  })
  explanation?: string
}

export class TestAnswerQueryDto {
  @ApiPropertyOptional({
    example: 123,
    description: 'Filter by test attempt ID',
  })
  attemptId?: number

  @ApiPropertyOptional({
    example: 456,
    description: 'Filter by question ID',
  })
  questionId?: number

  @ApiPropertyOptional({
    example: 789,
    description: 'Filter by user ID',
  })
  userId?: number

  @ApiPropertyOptional({
    example: 101,
    description: 'Filter by test ID',
  })
  testId?: number

  @ApiPropertyOptional({
    example: true,
    description: 'Filter by correct/incorrect answers',
  })
  isCorrect?: boolean

  @ApiPropertyOptional({
    example: true,
    description: 'Filter by answered/skipped questions',
  })
  hasAnswer?: boolean

  @ApiPropertyOptional({
    enum: QuestionType,
    example: 'VOCAB',
    description: 'Filter by question type',
  })
  questionType?: QuestionType

  @ApiPropertyOptional({
    enum: JLPTLevel,
    example: 'N3',
    description: 'Filter by JLPT level',
  })
  level?: JLPTLevel

  @ApiPropertyOptional({
    enum: Difficulty,
    example: 'MEDIUM',
    description: 'Filter by question difficulty',
  })
  difficulty?: Difficulty

  @ApiPropertyOptional({
    example: true,
    default: false,
    description: 'Include question details',
  })
  includeQuestion?: boolean

  @ApiPropertyOptional({
    example: true,
    default: false,
    description: 'Include attempt details',
  })
  includeAttempt?: boolean

  @ApiPropertyOptional({
    example: true,
    default: false,
    description: 'Include selected option details',
  })
  includeSelectedOption?: boolean

  @ApiPropertyOptional({
    example: 1,
    default: 1,
    description: 'Page number',
  })
  page?: number

  @ApiPropertyOptional({
    example: 20,
    default: 20,
    description: 'Number of items per page',
  })
  limit?: number

  @ApiPropertyOptional({
    example: 'id',
    enum: ['id', 'questionId', 'timeSpentSec'],
    default: 'id',
    description: 'Sort by field',
  })
  sortBy?: 'id' | 'questionId' | 'timeSpentSec'

  @ApiPropertyOptional({
    example: 'asc',
    enum: ['asc', 'desc'],
    default: 'asc',
    description: 'Sort order',
  })
  sortOrder?: 'asc' | 'desc'
}

// ===== Response DTOs =====

export class TestAnswerResponseDto {
  @ApiProperty({ example: 1, description: 'Answer ID' })
  id: number

  @ApiProperty({ example: 123, description: 'Attempt ID' })
  attemptId: number

  @ApiProperty({ example: 456, description: 'Question ID' })
  questionId: number

  @ApiPropertyOptional({ example: 789, description: 'Selected option ID' })
  selectedOptionId?: number

  @ApiPropertyOptional({ example: true, description: 'Whether answer is correct' })
  isCorrect?: boolean

  @ApiPropertyOptional({ example: 45, description: 'Time spent in seconds' })
  timeSpentSec?: number

  @ApiPropertyOptional({ example: 'I chose this answer because...', description: 'Student explanation' })
  explanation?: string
}

export class AnswerStatisticsDto {
  @ApiProperty({ example: 100, description: 'Total number of answers' })
  totalAnswers: number

  @ApiProperty({ example: 75, description: 'Number of correct answers' })
  correctAnswers: number

  @ApiProperty({ example: 75.0, description: 'Overall accuracy rate as percentage' })
  accuracyRate: number

  @ApiProperty({ example: 35.5, description: 'Average time per question in seconds' })
  averageTimePerQuestion: number
}
