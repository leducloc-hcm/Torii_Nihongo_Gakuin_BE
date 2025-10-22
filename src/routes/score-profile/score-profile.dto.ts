import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { z } from 'zod'
import { CreateScoreProfileSchema, UpdateScoreProfileSchema, ScoreProfileQuerySchema } from './score-profile.model'

// ===== Create ScoreProfile DTO =====
export class CreateScoreProfileDto {
  @ApiProperty({
    example: 'JLPT N4 đơn giản',
    description: 'Name of the score profile',
  })
  name!: string

  @ApiPropertyOptional({
    enum: ['N5', 'N4', 'N3', 'N2', 'N1'],
    example: 'N4',
    description: 'JLPT level (optional)',
  })
  level?: string

  @ApiPropertyOptional({
    example: 180,
    description: 'Maximum total score for the assessment',
  })
  maxTotal?: number

  @ApiPropertyOptional({
    example: 90,
    description: 'Minimum total score required to pass',
  })
  minTotalPass?: number

  @ApiPropertyOptional({
    example: 19,
    description: 'Minimum score required for each bucket/section',
  })
  minBucketPass?: number

  @ApiPropertyOptional({
    example: 60,
    default: 60,
    description: 'Maximum score for each bucket/section',
  })
  maxBucket?: number

  @ApiPropertyOptional({
    example: 'Cấu hình điểm chuẩn cho JLPT N4',
    description: 'Additional notes about this profile',
  })
  notes?: string

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
    example: {
      VOCAB: 'KNOWLEDGE',
      GRAMMAR: 'KNOWLEDGE',
      READING: 'READING',
      LISTENING: 'LISTENING',
    },
    description: 'Mapping of question types to score buckets',
  })
  mappings!: Record<string, string>
}

// ===== Update ScoreProfile DTO =====
export class UpdateScoreProfileDto {
  @ApiPropertyOptional({
    example: 'JLPT N4 updated',
    description: 'Updated name of the score profile',
  })
  name?: string

  @ApiPropertyOptional({
    enum: ['N5', 'N4', 'N3', 'N2', 'N1'],
    example: 'N4',
    description: 'Updated JLPT level',
  })
  level?: string

  @ApiPropertyOptional({
    example: 200,
    description: 'Updated maximum total score',
  })
  maxTotal?: number

  @ApiPropertyOptional({
    example: 100,
    description: 'Updated minimum total score to pass',
  })
  minTotalPass?: number

  @ApiPropertyOptional({
    example: 25,
    description: 'Updated minimum bucket score',
  })
  minBucketPass?: number

  @ApiPropertyOptional({
    example: 70,
    description: 'Updated maximum bucket score',
  })
  maxBucket?: number

  @ApiPropertyOptional({
    example: 'Updated notes',
    description: 'Updated notes',
  })
  notes?: string

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'string' },
    example: {
      VOCAB: 'KNOWLEDGE',
      GRAMMAR: 'KNOWLEDGE',
      KANJI: 'KNOWLEDGE',
      READING: 'READING',
      LISTENING: 'LISTENING',
    },
    description: 'Updated question type to bucket mappings',
  })
  mappings?: Record<string, string>
}

// ===== Query ScoreProfile DTO =====
export class ScoreProfileQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  page?: number = 1

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  limit?: number = 20

  @ApiPropertyOptional({
    enum: ['N5', 'N4', 'N3', 'N2', 'N1'],
    description: 'Filter by JLPT level',
  })
  level?: string

  @ApiPropertyOptional({
    example: 'JLPT',
    description: 'Filter by profile name (partial match)',
  })
  name?: string

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Include count of associated papers',
  })
  includeCount?: boolean

  @ApiPropertyOptional({
    example: 'createdAt',
    enum: ['id', 'name', 'level', 'createdAt', 'updatedAt'],
    default: 'createdAt',
    description: 'Sort by field',
  })
  sortBy?: string = 'createdAt'

  @ApiPropertyOptional({
    example: 'desc',
    enum: ['asc', 'desc'],
    default: 'desc',
    description: 'Sort order',
  })
  sortOrder?: string = 'desc'
}

// ===== Response DTOs =====
export class ScoreProfileResponseDto {
  @ApiProperty({ example: 1, description: 'Score profile ID' })
  id!: number

  @ApiProperty({ example: 'JLPT N4 đơn giản', description: 'Profile name' })
  name!: string

  @ApiPropertyOptional({
    enum: ['N5', 'N4', 'N3', 'N2', 'N1'],
    example: 'N4',
    description: 'JLPT level',
  })
  level?: string

  @ApiPropertyOptional({ example: 180, description: 'Maximum total score' })
  maxTotal?: number

  @ApiPropertyOptional({ example: 90, description: 'Minimum total score to pass' })
  minTotalPass?: number

  @ApiPropertyOptional({ example: 19, description: 'Minimum score per bucket' })
  minBucketPass?: number

  @ApiPropertyOptional({ example: 60, description: 'Maximum score per bucket' })
  maxBucket?: number

  @ApiPropertyOptional({ example: 'Configuration notes', description: 'Profile notes' })
  notes?: string

  @ApiProperty({
    example: {
      VOCAB: 'KNOWLEDGE',
      GRAMMAR: 'KNOWLEDGE',
      READING: 'READING',
      LISTENING: 'LISTENING',
    },
    description: 'Question type to bucket mappings',
  })
  mappings!: object

  @ApiProperty({ example: '2023-10-22T10:00:00Z', description: 'Creation timestamp' })
  createdAt!: Date

  @ApiProperty({ example: '2023-10-22T12:00:00Z', description: 'Last update timestamp' })
  updatedAt!: Date
}

export class ScoreProfileWithCountDto extends ScoreProfileResponseDto {
  @ApiProperty({
    example: { papers: 5 },
    description: 'Count of associated assessment papers',
  })
  _count!: {
    papers: number
  }
}

export class ScoreProfileListResponseDto {
  @ApiProperty({ type: [ScoreProfileWithCountDto] })
  data!: ScoreProfileWithCountDto[]

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

// ===== Validation DTO =====
export class ScoreProfileValidationDto {
  @ApiProperty({ example: true, description: 'Whether the profile values are valid' })
  isValid!: boolean

  @ApiProperty({
    type: [String],
    example: [],
    description: 'List of validation errors if any',
  })
  errors!: string[]
}

// ===== Default Profile Creation DTO =====
export class CreateDefaultProfilesDto {
  @ApiPropertyOptional({
    enum: ['N5', 'N4', 'N3', 'N2', 'N1'],
    description: 'Create default profile for specific level only',
  })
  level?: string

  @ApiPropertyOptional({
    example: false,
    default: false,
    description: 'Overwrite existing default profiles',
  })
  overwrite?: boolean
}
