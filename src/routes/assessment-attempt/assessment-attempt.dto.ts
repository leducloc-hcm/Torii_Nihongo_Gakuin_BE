import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { JLPTLevel } from '@prisma/client'

// ===== Start Assessment Attempt DTO =====
export class StartAssessmentAttemptDto {
  @ApiProperty({
    example: 123,
    description: 'ID of the assessment paper to attempt',
  })
  assessmentId!: number
}

// ===== Start Attempt from Progress DTO =====
export class StartAttemptFromProgressDto {
  @ApiProperty({
    example: 456,
    description: 'ID of the assessment progress to create attempt from',
  })
  progressId!: number
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

  @ApiPropertyOptional({
    example: 120,
    description: 'Time spent on this question in seconds',
  })
  timeSpentSec?: number
}

// ===== Submit Assessment Attempt DTO =====
export class SubmitAssessmentAttemptDto {
  @ApiProperty({
    type: [SubmitAnswerDto],
    example: [
      { questionId: 456, selectedOptionId: 789, timeSpentSec: 120 },
      { questionId: 457, selectedOptionId: 790, timeSpentSec: 95 },
    ],
    description: 'Array of answers for the assessment',
  })
  answers!: SubmitAnswerDto[]
}

// ===== Query Assessment Attempts DTO =====
export class AssessmentAttemptQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  page?: number = 1

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  limit?: number = 20

  @ApiPropertyOptional({
    example: 123,
    description: 'Filter by user ID',
  })
  userId?: number

  @ApiPropertyOptional({
    example: 456,
    description: 'Filter by assessment ID',
  })
  assessmentId?: number

  @ApiPropertyOptional({
    enum: JLPTLevel,
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
    description: 'Filter by submitted status',
  })
  submitted?: boolean

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
    description: 'Include assessment details in response',
  })
  includeAssessment?: boolean

  @ApiPropertyOptional({
    example: 'startedAt',
    enum: ['startedAt', 'submittedAt', 'score', 'earnedScore'],
    default: 'startedAt',
    description: 'Sort by field',
  })
  sortBy?: string = 'startedAt'

  @ApiPropertyOptional({
    example: 'desc',
    enum: ['asc', 'desc'],
    default: 'desc',
    description: 'Sort order',
  })
  sortOrder?: string = 'desc'
}

// ===== Grade Assessment Attempt DTO =====
export class GradeAssessmentAttemptDto {
  @ApiProperty({
    example: 123,
    description: 'ID of the assessment attempt to grade',
  })
  attemptId!: number

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Whether to use automatic grading',
  })
  autoGrade?: boolean
}

// ===== Update Attempt Score DTO =====
export class UpdateAttemptScoreDto {
  @ApiPropertyOptional({
    example: 85.5,
    description: 'Overall score for the attempt',
  })
  score?: number

  @ApiPropertyOptional({
    example: 42.75,
    description: 'Earned score based on correct answers',
  })
  earnedScore?: number

  @ApiPropertyOptional({
    enum: JLPTLevel,
    example: 'N2',
    description: 'Suggested JLPT level based on performance',
  })
  levelSuggestion?: JLPTLevel
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
  @ApiProperty({ enum: JLPTLevel, example: 'N3' })
  currentLevel!: JLPTLevel

  @ApiProperty({ example: 142, description: 'Total score out of 180' })
  totalScore!: number

  @ApiProperty({ example: true, description: 'Whether total score meets minimum requirement' })
  totalPassed!: boolean

  @ApiProperty({ example: true, description: 'Whether all sections meet minimum requirements' })
  sectionsPassed!: boolean

  @ApiPropertyOptional({
    enum: JLPTLevel,
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

// ===== Assessment Attempt Response DTO =====
export class AssessmentAttemptResponseDto {
  @ApiProperty({ example: 1, description: 'Assessment attempt ID' })
  id!: number

  @ApiProperty({ example: 123, description: 'Assessment paper ID' })
  assessmentId!: number

  @ApiProperty({ example: 456, description: 'User ID' })
  userId!: number

  @ApiProperty({ example: '2025-10-15T10:30:00.000Z', description: 'When the assessment was started' })
  startedAt!: string

  @ApiPropertyOptional({
    example: '2025-10-15T11:45:00.000Z',
    description: 'When the assessment was submitted (null if not submitted)',
  })
  submittedAt?: string

  @ApiPropertyOptional({
    example: 85.5,
    description: 'Final score percentage (null if not graded)',
  })
  score?: number

  @ApiPropertyOptional({
    example: 42.75,
    description: 'Earned score based on correct answers (null if not graded)',
  })
  earnedScore?: number

  @ApiPropertyOptional({
    enum: JLPTLevel,
    example: 'N2',
    description: 'Suggested JLPT level (null if not graded)',
  })
  levelSuggestion?: JLPTLevel

  @ApiPropertyOptional({
    description: 'User details (when includeUser=true)',
    example: {
      id: 456,
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
    description: 'Assessment details (when includeAssessment=true)',
    example: {
      id: 123,
      title: 'JLPT N3 Practice Assessment',
      level: 'N3',
      type: 'TEST',
    },
  })
  assessment?: {
    id: number
    title: string
    level: JLPTLevel
    type: string
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
        timeSpentSec: 120,
      },
    ],
  })
  answers?: Array<{
    id: number
    questionId: number
    selectedOptionId: number | null
    isCorrect: boolean | null
    timeSpentSec: number | null
    explanation: string | null
  }>
}

// ===== Assessment Attempt Stats Response DTO =====
export class AssessmentAttemptStatsDto extends AssessmentAttemptResponseDto {
  @ApiProperty({ example: 50, description: 'Total number of questions in the assessment' })
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

// ===== Assessment Attempt List Response DTO =====
export class AssessmentAttemptListResponseDto {
  @ApiProperty({ type: [AssessmentAttemptResponseDto] })
  data!: AssessmentAttemptResponseDto[]

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

  @ApiProperty({ example: 95.5, description: 'Best score for this assessment' })
  bestScore!: number

  @ApiProperty({ example: '2025-10-15T11:45:00.000Z', description: 'When the best score was achieved' })
  achievedAt!: string

  @ApiProperty({ example: 3, description: 'Number of attempts for this assessment' })
  attemptCount!: number
}

// ===== Assessment Statistics DTO =====
export class AssessmentStatisticsDto {
  @ApiProperty({ example: 456, description: 'Assessment paper ID' })
  assessmentId!: number

  @ApiProperty({ example: 150, description: 'Total number of attempts' })
  totalAttempts!: number

  @ApiProperty({ example: 125, description: 'Number of submitted attempts' })
  submittedAttempts!: number

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
  levelDistribution!: Record<string, number>
}

// ===== User Assessment History DTO =====
export class UserAssessmentHistoryDto {
  @ApiProperty({ example: 123, description: 'User ID' })
  userId!: number

  @ApiProperty({ example: 25, description: 'Total number of assessments attempted' })
  totalAttempts!: number

  @ApiProperty({ example: 20, description: 'Number of completed assessments' })
  completedAttempts!: number

  @ApiProperty({ example: 82.5, description: 'Average score across all attempts' })
  averageScore!: number

  @ApiProperty({ example: 'N3', description: 'Most frequently suggested level' })
  mostSuggestedLevel!: JLPTLevel | null

  @ApiProperty({ example: '2025-10-15T11:45:00.000Z', description: 'Date of last attempt' })
  lastAttemptDate!: string | null

  @ApiProperty({
    type: [AssessmentAttemptResponseDto],
    description: 'Recent assessment attempts',
  })
  recentAttempts!: AssessmentAttemptResponseDto[]
}
