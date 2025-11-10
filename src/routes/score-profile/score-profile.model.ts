import { z } from 'zod'
import { ScoreProfile, AssessmentPaper, JLPTLevel } from '@prisma/client'

// ===== Base Types =====
export type ScoreProfileBase = ScoreProfile

export type ScoreProfileWithRelations = ScoreProfile & {
  papers: AssessmentPaper[]
  _count: {
    papers: number
  }
}

export type ScoreProfileBasic = ScoreProfile & {
  _count: {
    papers: number
  }
}

// ===== Zod Schemas =====
export const JLPTLevelSchema = z.enum(['N5', 'N4', 'N3', 'N2', 'N1'])

// Mappings validation schema - ensures valid question types to bucket mappings
export const ScoreMappingsSchema = z
  .union([
    z.record(
      z.enum(['VOCAB', 'GRAMMAR', 'KANJI', 'READING', 'LISTENING', 'SYNONYM', 'ORDER_SENTENCE']),
      z.enum(['KNOWLEDGE', 'READING', 'LISTENING']),
    ),
    z.object({}).optional(),
  ])
  .default({})

export const CreateScoreProfileSchema = z.object({
  name: z.string().min(1).max(255),
  level: JLPTLevelSchema.optional(),
  maxTotal: z.number().int().positive().optional(),
  minTotalPass: z.number().int().min(0).optional(),
  minBucketPass: z.number().int().min(0).optional(),
  maxBucket: z.number().int().positive().default(60),
  notes: z.string().optional(),
  mappings: ScoreMappingsSchema,
})

export const UpdateScoreProfileSchema = CreateScoreProfileSchema.partial()

export const ScoreProfileQuerySchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  level: JLPTLevelSchema.optional(),
  name: z.string().optional(),
  includeCount: z.boolean().default(true),
  sortBy: z.enum(['id', 'name', 'level', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// ===== Type Exports =====
export type CreateScoreProfileInput = z.infer<typeof CreateScoreProfileSchema>
export type UpdateScoreProfileInput = z.infer<typeof UpdateScoreProfileSchema>
export type ScoreProfileQuery = z.infer<typeof ScoreProfileQuerySchema>
export type ScoreMappings = z.infer<typeof ScoreMappingsSchema>

// ===== Constants =====
export const SCORE_PROFILE_CONSTRAINTS = {
  MAX_NAME_LENGTH: 255,
  MAX_TOTAL_SCORE: 999,
  MAX_BUCKET_SCORE: 200,
  DEFAULT_MAX_BUCKET: 60,
} as const

// ===== Error Messages =====
export const SCORE_PROFILE_ERRORS = {
  NOT_FOUND: 'Score profile not found',
  NAME_REQUIRED: 'Profile name is required',
  INVALID_MAPPINGS: 'Invalid score mappings format',
  INVALID_SCORE_VALUES: 'Invalid score values - totals and buckets must be positive',
  MIN_PASS_EXCEEDS_MAX: 'Minimum pass score cannot exceed maximum total score',
  BUCKET_PASS_EXCEEDS_MAX: 'Minimum bucket pass score cannot exceed maximum bucket score',
  PROFILE_IN_USE: 'Cannot delete score profile - it is being used by assessment papers',
} as const

// ===== Helper Functions =====
export function validateScoreValues(data: Partial<CreateScoreProfileInput>): string[] {
  const errors: string[] = []

  // Check if minTotalPass doesn't exceed maxTotal
  if (data.minTotalPass && data.maxTotal && data.minTotalPass > data.maxTotal) {
    errors.push(SCORE_PROFILE_ERRORS.MIN_PASS_EXCEEDS_MAX)
  }

  // Check if minBucketPass doesn't exceed maxBucket
  if (data.minBucketPass && data.maxBucket && data.minBucketPass > data.maxBucket) {
    errors.push(SCORE_PROFILE_ERRORS.BUCKET_PASS_EXCEEDS_MAX)
  }

  return errors
}

// Default score profile templates
export const DEFAULT_SCORE_PROFILES = {
  JLPT_N5_SIMPLE: {
    name: 'JLPT N5 đơn giản',
    level: 'N5' as JLPTLevel,
    maxTotal: 100,
    minTotalPass: 60,
    minBucketPass: 19,
    maxBucket: 60,
    notes: 'Cấu hình điểm chuẩn cho JLPT N5',
    mappings: {
      VOCAB: 'KNOWLEDGE',
      GRAMMAR: 'KNOWLEDGE',
      KANJI: 'KNOWLEDGE',
      READING: 'READING',
      LISTENING: 'LISTENING',
    },
  },
  JLPT_N4_DEFAULT: {
    name: 'JLPT N4 mặc định',
    level: 'N4' as JLPTLevel,
    maxTotal: 180,
    minTotalPass: 90,
    minBucketPass: 38,
    maxBucket: 60,
    notes: 'Cấu hình điểm tiêu chuẩn cho JLPT N4',
    mappings: {
      VOCAB: 'KNOWLEDGE',
      GRAMMAR: 'KNOWLEDGE',
      KANJI: 'KNOWLEDGE',
      READING: 'READING',
      LISTENING: 'LISTENING',
    },
  },
  TEST_100_POINTS: {
    name: 'Test 100 điểm',
    level: undefined,
    maxTotal: 100,
    minTotalPass: 70,
    minBucketPass: 50,
    maxBucket: 100,
    notes: 'Cấu hình cho bài test đơn giản 100 điểm',
    mappings: {
      VOCAB: 'KNOWLEDGE',
      GRAMMAR: 'KNOWLEDGE',
      READING: 'KNOWLEDGE',
      LISTENING: 'KNOWLEDGE',
    },
  },
} as const
