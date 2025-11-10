import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { JLPTLevel } from '@prisma/client'

export class CreateAssessmentAnswerDto {
  @ApiProperty({
    example: 123,
    description: 'ID of the assessment attempt',
  })
  attemptId!: number

  @ApiProperty({
    example: 456,
    description: 'ID of the question being answered',
  })
  questionId!: number

  @ApiProperty({
    example: 789,
    description: 'ID of the selected option (null for skipped questions)',
    nullable: true,
  })
  selectedOptionId!: number | null

  @ApiPropertyOptional({
    example: 45,
    description: 'Time spent on this question in seconds',
  })
  timeSpentSec?: number | null
}

export class UpdateAssessmentAnswerDto {
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
    description: 'Whether the answer is correct (set automatically during grading)',
  })
  isCorrect?: boolean

  @ApiPropertyOptional({
    example: 'Detailed explanation of the correct answer',
    description: 'Optional explanation provided with the answer',
  })
  explanation?: string
}

export class BulkUpdateAssessmentAnswerDto {
  @ApiProperty({
    example: 456,
    description: 'ID of the question',
  })
  questionId: number

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
    description: 'Whether the answer is correct (set automatically during grading)',
  })
  isCorrect?: boolean

  @ApiPropertyOptional({
    example: 'Detailed explanation of the correct answer',
    description: 'Optional explanation provided with the answer',
  })
  explanation?: string
}

export class BulkCreateAssessmentAnswersDto {
  @ApiProperty({
    type: [CreateAssessmentAnswerDto],
    description: 'Array of answers to create',
  })
  answers!: CreateAssessmentAnswerDto[]
}

export class AssessmentAnswerQueryDto {
  @ApiPropertyOptional({
    example: 123,
    description: 'Filter by assessment attempt ID',
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
    description: 'Filter by assessment ID',
  })
  assessmentId?: number

  @ApiPropertyOptional({
    example: true,
    description: 'Filter by correctness',
  })
  isCorrect?: boolean

  @ApiPropertyOptional({
    enum: JLPTLevel,
    example: 'N3',
    description: 'Filter by JLPT level',
  })
  level?: JLPTLevel

  @ApiPropertyOptional({
    example: 'VOCAB',
    description: 'Filter by question type',
  })
  questionType?: string

  @ApiPropertyOptional({
    example: true,
    default: false,
    description: 'Include question details in response',
  })
  includeQuestion?: boolean = false

  @ApiPropertyOptional({
    example: true,
    default: false,
    description: 'Include attempt details in response',
  })
  includeAttempt?: boolean = false

  @ApiPropertyOptional({
    example: true,
    default: false,
    description: 'Include selected option details in response',
  })
  includeSelectedOption?: boolean = false

  @ApiProperty({ description: 'Page number for pagination', default: 1 })
  page: number = 1

  @ApiProperty({ description: 'Number of items per page', default: 10 })
  limit: number = 10

  @ApiPropertyOptional({
    enum: ['id', 'timeSpentSec', 'isCorrect'],
    example: 'id',
    default: 'id',
    description: 'Field to sort by',
  })
  sortBy: string = 'id'

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    example: 'asc',
    default: 'asc',
    description: 'Sort order',
  })
  sortOrder: string = 'asc'
}

export class GradeAssessmentAnswersDto {
  @ApiProperty({
    example: 123,
    description: 'Assessment attempt ID to grade',
  })
  attemptId!: number

  @ApiProperty({
    example: true,
    default: true,
    description: 'Whether to use automatic grading',
  })
  autoGrade!: boolean
}

export class AssessmentAnswerStatsDto {
  @ApiPropertyOptional({
    example: 456,
    description: 'Question ID for statistics',
  })
  questionId?: number

  @ApiPropertyOptional({
    example: 123,
    description: 'Assessment ID for statistics',
  })
  assessmentId?: number

  @ApiPropertyOptional({
    enum: JLPTLevel,
    example: 'N3',
    description: 'JLPT level filter',
  })
  level?: JLPTLevel

  @ApiPropertyOptional({
    example: 'VOCAB',
    description: 'Question type filter',
  })
  questionType?: string

  @ApiPropertyOptional({
    example: '2025-01-01T00:00:00.000Z',
    description: 'Start date for statistics',
  })
  startDate?: string

  @ApiPropertyOptional({
    example: '2025-12-31T23:59:59.999Z',
    description: 'End date for statistics',
  })
  endDate?: string
}

// ===== Response DTOs =====
export class AssessmentAnswerResponseDto {
  @ApiProperty({ example: 1, description: 'Answer ID' })
  id!: number

  @ApiProperty({ example: 123, description: 'Assessment attempt ID' })
  attemptId!: number

  @ApiProperty({ example: 456, description: 'Question ID' })
  questionId!: number

  @ApiPropertyOptional({
    example: 789,
    description: 'Selected option ID (null if not answered)',
  })
  selectedOptionId?: number | null

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the answer is correct (null if not graded)',
  })
  isCorrect?: boolean | null

  @ApiPropertyOptional({
    example: 45,
    description: 'Time spent on question in seconds',
  })
  timeSpentSec?: number | null

  @ApiPropertyOptional({
    example: 'Detailed explanation of the answer',
    description: 'Explanation provided after grading',
  })
  explanation?: string | null

  @ApiPropertyOptional({
    description: 'Question details (when includeQuestion=true)',
    example: {
      id: 456,
      type: 'VOCAB',
      stem: 'What does this word mean?',
      level: 'N3',
    },
  })
  question?: {
    id: number
    type: string
    stem: string
    level: JLPTLevel
    difficulty: string
  }

  @ApiPropertyOptional({
    description: 'Attempt details (when includeAttempt=true)',
    example: {
      id: 123,
      userId: 789,
      assessmentId: 101,
      startedAt: '2025-10-15T10:30:00.000Z',
    },
  })
  attempt?: {
    id: number
    userId: number
    assessmentId: number
    startedAt: string
  }

  @ApiPropertyOptional({
    description: 'Selected option details (when includeSelectedOption=true)',
    example: {
      id: 789,
      content: 'Option A',
      isCorrect: true,
    },
  })
  selectedOption?: {
    id: number
    content: string
    isCorrect: boolean
  }
}

export class AssessmentAnswerListResponseDto {
  @ApiProperty({ type: [AssessmentAnswerResponseDto] })
  data!: AssessmentAnswerResponseDto[]

  @ApiProperty({
    example: {
      total: 100,
      page: 1,
      limit: 20,
      totalPages: 5,
      hasNext: true,
      hasPrev: false,
    },
    description: 'Pagination information',
  })
  pagination!: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export class AssessmentAnswerAnalyticsDto {
  @ApiProperty({ example: 456, description: 'Question ID' })
  questionId!: number

  @ApiProperty({ example: 150, description: 'Total number of attempts' })
  totalAttempts!: number

  @ApiProperty({ example: 120, description: 'Number of correct attempts' })
  correctAttempts!: number

  @ApiProperty({ example: 45.5, description: 'Average time spent in seconds' })
  averageTimeSpent!: number

  @ApiProperty({ example: 2, description: 'Difficulty rating (1-5)' })
  difficultyRating!: number

  @ApiProperty({ example: 80.0, description: 'Accuracy rate percentage' })
  accuracyRate!: number

  @ApiProperty({
    type: [Object],
    description: 'Common incorrect options',
    example: [
      { optionId: 791, optionContent: 'Wrong option A', frequency: 15 },
      { optionId: 792, optionContent: 'Wrong option B', frequency: 8 },
    ],
  })
  commonMistakes!: Array<{
    optionId: number
    optionContent: string
    frequency: number
  }>
}

export class AssessmentAnswerSummaryDto {
  @ApiProperty({ example: 123, description: 'Assessment attempt ID' })
  attemptId!: number

  @ApiProperty({ example: 50, description: 'Total number of questions' })
  totalQuestions!: number

  @ApiProperty({ example: 45, description: 'Number of answered questions' })
  answeredQuestions!: number

  @ApiProperty({ example: 38, description: 'Number of correct answers' })
  correctAnswers!: number

  @ApiProperty({ example: 7, description: 'Number of wrong answers' })
  wrongAnswers!: number

  @ApiProperty({ example: 5, description: 'Number of skipped questions' })
  skippedQuestions!: number

  @ApiProperty({ example: 42.5, description: 'Average time per question in seconds' })
  averageTimePerQuestion!: number

  @ApiProperty({ example: 2100, description: 'Total time spent in seconds' })
  totalTimeSpent!: number

  @ApiProperty({ example: 84.4, description: 'Accuracy percentage' })
  accuracy!: number
}

export class QuestionPerformanceDto {
  @ApiProperty({ example: 456, description: 'Question ID' })
  questionId!: number

  @ApiProperty({ example: 'VOCAB', description: 'Question type' })
  questionType!: string

  @ApiProperty({ enum: JLPTLevel, example: 'N3', description: 'JLPT level' })
  level!: JLPTLevel

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the answer is correct (null if not answered)',
  })
  isCorrect?: boolean

  @ApiPropertyOptional({
    example: 45,
    description: 'Time spent on question in seconds',
  })
  timeSpent?: number

  @ApiPropertyOptional({
    example: 'Option A',
    description: 'User selected answer',
  })
  userAnswer?: string

  @ApiProperty({
    example: 'Option B',
    description: 'Correct answer',
  })
  correctAnswer!: string

  @ApiPropertyOptional({
    example: 'This is because...',
    description: 'Explanation of the answer',
  })
  explanation?: string
}
