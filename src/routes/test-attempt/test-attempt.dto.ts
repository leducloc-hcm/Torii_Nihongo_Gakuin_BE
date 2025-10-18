import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { JLPTLevel } from '@prisma/client'

// ===== Start Test Attempt DTO =====
export class StartTestAttemptDto {
  @ApiProperty({
    example: 123,
    description: 'ID of the test paper to attempt',
  })
  testId!: number
}

// ===== Submit Answer DTO =====
export class SubmitAnswerDto {
  @ApiProperty({
    example: 456,
    description: 'ID of the question being answered',
  })
  questionId!: number

  @ApiPropertyOptional({
    example: 789,
    description: 'ID of the selected option (null for no answer)',
  })
  selectedOptionId?: number
}

// ===== Submit Test Attempt DTO =====
export class SubmitTestAttemptDto {
  @ApiProperty({
    type: [SubmitAnswerDto],
    example: [
      { questionId: 456, selectedOptionId: 789 },
      { questionId: 457, selectedOptionId: 790 },
    ],
    description: 'Array of answers for the test',
  })
  answers!: SubmitAnswerDto[]
}

// ===== Query Test Attempts DTO =====
export class TestAttemptQueryDto {
  @ApiPropertyOptional({
    example: 123,
    description: 'Filter by user ID',
  })
  userId?: number

  @ApiPropertyOptional({
    example: 456,
    description: 'Filter by test ID',
  })
  testId?: number

  @ApiPropertyOptional({
    enum: ['N5', 'N4', 'N3', 'N2', 'N1'],
    example: 'N3',
    description: 'Filter by JLPT level',
  })
  level?: JLPTLevel

  @ApiPropertyOptional({
    example: '2025-01-01T00:00:00.000Z',
    description: 'Filter attempts started after this date',
  })
  startDate?: string

  @ApiPropertyOptional({
    example: '2025-12-31T23:59:59.999Z',
    description: 'Filter attempts started before this date',
  })
  endDate?: string

  @ApiPropertyOptional({
    example: true,
    description: 'Filter by pass/fail status',
  })
  passed?: boolean

  @ApiPropertyOptional({
    example: true,
    default: false,
    description: 'Include answer details in response',
  })
  includeAnswers?: boolean

  @ApiPropertyOptional({
    example: true,
    default: false,
    description: 'Include user details in response',
  })
  includeUser?: boolean

  @ApiPropertyOptional({
    example: true,
    default: false,
    description: 'Include test details in response',
  })
  includeTest?: boolean

  @ApiPropertyOptional({
    example: 1,
    default: 1,
    description: 'Page number for pagination',
  })
  page?: number

  @ApiPropertyOptional({
    example: 20,
    default: 20,
    description: 'Number of items per page',
  })
  limit?: number

  @ApiPropertyOptional({
    example: 'startedAt',
    enum: ['startedAt', 'submittedAt', 'score'],
    default: 'startedAt',
    description: 'Sort by field',
  })
  sortBy?: 'startedAt' | 'submittedAt' | 'score'

  @ApiPropertyOptional({
    example: 'desc',
    enum: ['asc', 'desc'],
    default: 'desc',
    description: 'Sort order',
  })
  sortOrder?: 'asc' | 'desc'
}

// ===== Grade Test Attempt DTO =====
export class GradeTestAttemptDto {
  @ApiProperty({
    example: 123,
    description: 'ID of the test attempt to grade',
  })
  attemptId!: number
}

// ===== Section Score Response DTO =====
export class SectionScoreDto {
  @ApiProperty({ example: 'VOCAB', description: 'Section type' })
  sectionType!: string

  @ApiProperty({ example: 8, description: 'Number of correct answers' })
  correctAnswers!: number

  @ApiProperty({ example: 10, description: 'Total number of questions' })
  totalQuestions!: number

  @ApiProperty({ example: 0.8, description: 'Raw accuracy score (0-1)' })
  rawScore!: number

  @ApiProperty({ example: 48, description: 'Scaled score (JLPT format)' })
  scaledScore!: number

  @ApiProperty({ example: true, description: 'Whether this section meets minimum requirement' })
  passed!: boolean
}

// ===== Level Evaluation Response DTO =====
export class LevelEvaluationDto {
  @ApiProperty({ enum: ['N5', 'N4', 'N3', 'N2', 'N1'], example: 'N3' })
  currentLevel!: JLPTLevel

  @ApiProperty({ example: 142, description: 'Total score out of 180' })
  totalScore!: number

  @ApiProperty({ example: true, description: 'Whether total score meets minimum requirement' })
  totalPassed!: boolean

  @ApiProperty({ example: true, description: 'Whether all sections meet minimum requirements' })
  sectionsPassed!: boolean

  @ApiPropertyOptional({
    enum: ['N5', 'N4', 'N3', 'N2', 'N1'],
    example: 'N2',
    description: 'Suggested next level to attempt',
  })
  suggestedLevel?: JLPTLevel

  @ApiProperty({
    example: "Congratulations! You passed N3. You're ready to attempt N2.",
    description: 'Personalized recommendation message',
  })
  recommendation!: string
}

// ===== Test Attempt Response DTO =====
export class TestAttemptResponseDto {
  @ApiProperty({ example: 1, description: 'Test attempt ID' })
  id!: number

  @ApiProperty({ example: 123, description: 'User ID' })
  userId!: number

  @ApiProperty({ example: 456, description: 'Test paper ID' })
  testId!: number

  @ApiProperty({ example: '2025-10-15T10:30:00.000Z', description: 'When the test was started' })
  startedAt!: string

  @ApiPropertyOptional({
    example: '2025-10-15T11:45:00.000Z',
    description: 'When the test was submitted (null if not submitted)',
  })
  submittedAt?: string

  @ApiPropertyOptional({
    example: 85.5,
    description: 'Final score percentage (null if not graded)',
  })
  score?: number

  @ApiPropertyOptional({
    enum: ['N5', 'N4', 'N3', 'N2', 'N1'],
    example: 'N2',
    description: 'Suggested JLPT level (null if not graded)',
  })
  levelSuggestion?: JLPTLevel

  @ApiPropertyOptional({
    description: 'User details (when includeUser=true)',
    example: {
      id: 123,
      name: 'John Doe',
      email: 'john@example.com',
    },
  })
  user?: {
    id: number
    name: string
    email: string
  }

  @ApiPropertyOptional({
    description: 'Test details (when includeTest=true)',
    example: {
      id: 456,
      title: 'JLPT N3 Practice Test',
      level: 'N3',
      totalQuestions: 50,
    },
  })
  test?: {
    id: number
    title: string
    level: JLPTLevel
    totalQuestions: number
  }

  @ApiPropertyOptional({
    type: [Object],
    description: 'Answer details (when includeAnswers=true)',
    example: [
      {
        id: 1,
        questionId: 456,
        selectedOptionId: 789,
        isCorrect: true,
      },
    ],
  })
  answers?: Array<{
    id: number
    questionId: number
    selectedOptionId: number | null
    isCorrect: boolean
  }>
}

// ===== Test Attempt Stats Response DTO =====
export class TestAttemptStatsDto extends TestAttemptResponseDto {
  @ApiProperty({ example: 50, description: 'Total number of questions in the test' })
  totalQuestions!: number

  @ApiProperty({ example: 42, description: 'Number of correct answers' })
  correctAnswers!: number

  @ApiProperty({ example: 84.0, description: 'Overall accuracy percentage' })
  accuracy!: number

  @ApiProperty({
    type: [SectionScoreDto],
    description: 'Detailed scores for each section',
  })
  sectionScores!: SectionScoreDto[]

  @ApiProperty({
    type: LevelEvaluationDto,
    description: 'JLPT level evaluation and recommendations',
  })
  levelEvaluation!: LevelEvaluationDto
}

// ===== Test Attempt List Response DTO =====
export class TestAttemptListResponseDto {
  @ApiProperty({ type: [TestAttemptResponseDto] })
  data!: TestAttemptResponseDto[]

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

// ===== Leaderboard Entry DTO =====
export class LeaderboardEntryDto {
  @ApiProperty({ example: 1, description: 'Rank position' })
  rank!: number

  @ApiProperty({
    example: { id: 123, name: 'John Doe' },
    description: 'User information',
  })
  user!: {
    id: number
    name: string
  }

  @ApiProperty({ example: 95.5, description: 'Best score for this test' })
  bestScore!: number

  @ApiProperty({ example: '2025-10-15T11:45:00.000Z', description: 'When the best score was achieved' })
  achievedAt!: string

  @ApiProperty({ example: 3, description: 'Number of attempts for this test' })
  attemptCount!: number
}

// ===== Test Statistics DTO =====
export class TestStatisticsDto {
  @ApiProperty({ example: 456, description: 'Test paper ID' })
  testId!: number

  @ApiProperty({ example: 150, description: 'Total number of attempts' })
  totalAttempts!: number

  @ApiProperty({ example: 125, description: 'Number of completed attempts' })
  completedAttempts!: number

  @ApiProperty({ example: 78.5, description: 'Average score across all attempts' })
  averageScore!: number

  @ApiProperty({ example: 95.2, description: 'Highest score achieved' })
  highestScore!: number

  @ApiProperty({ example: 45.8, description: 'Lowest score achieved' })
  lowestScore!: number

  @ApiProperty({ example: 83.2, description: 'Pass rate percentage' })
  passRate!: number

  @ApiProperty({
    example: { N5: 5, N4: 15, N3: 45, N2: 35, N1: 25 },
    description: 'Distribution of suggested levels',
  })
  levelSuggestions!: Record<string, number>
}
