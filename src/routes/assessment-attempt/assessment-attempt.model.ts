// ===== AssessmentAttempt Model =====
// Represents student assessment submissions with grading and JLPT level suggestions
// Handles scoring logic based on JLPT official scoring criteria

import { z } from 'zod'
import { AssessmentAttempt, AssessmentPaper, User, AssessmentAnswer, Question, AssessmentSection } from '@prisma/client'
import { JLPTLevel } from '@prisma/client'

// ===== Base Types =====
export type AssessmentAttemptBase = AssessmentAttempt

// ===== Extended Types with Relations =====
export type AssessmentAttemptWithDetails = AssessmentAttempt & {
  user: Pick<User, 'id' | 'name' | 'email'>
  assessment: Pick<AssessmentPaper, 'id' | 'title' | 'level' | 'type'> & {
    scoreProfile?: {
      id: number
      name: string
      level: JLPTLevel | null
      maxTotal: number | null
      minTotalPass: number | null
      minBucketPass: number | null
      maxBucket: number | null
      mappings: any // JSON mapping of question types to buckets
    }
  }
  answers: (AssessmentAnswer & {
    question: Question & {
      assessmentItems: {
        section: Pick<AssessmentSection, 'type'>
      }[]
    }
  })[]
}

export type AssessmentAttemptWithStats = AssessmentAttempt & {
  totalQuestions: number
  correctAnswers: number
  accuracy: number
  sectionScores: SectionScore[]
  levelEvaluation: LevelEvaluation
}

export type AssessmentAttemptBasic = AssessmentAttempt & {
  user?: Pick<User, 'id' | 'name' | 'email'>
  assessment?: Pick<AssessmentPaper, 'id' | 'title' | 'level' | 'type'>
  _count?: {
    answers: number
  }
}

// ===== JLPT Scoring Types =====
export interface SectionScore {
  sectionType: string // VOCAB, KANJI, GRAMMAR, READING, LISTENING
  correctAnswers: number
  totalQuestions: number
  rawScore: number
  scaledScore: number // Out of 60 for each section
  passed: boolean
}

export interface LevelEvaluation {
  currentLevel: JLPTLevel
  totalScore: number // Out of 180
  totalPassed: boolean
  sectionsPassed: boolean
  suggestedLevel: JLPTLevel | null
  recommendation: string
}

// ===== JLPT Scoring Constants =====
export const JLPT_SCORING_CRITERIA = {
  N5: {
    totalMinScore: 80, // Out of 180
    totalMaxScore: 180,
    sections: {
      LANGUAGE_READING: { minScore: 38, maxScore: 120 }, // VOCAB + KANJI + GRAMMAR + READING
      LISTENING: { minScore: 19, maxScore: 60 },
    },
  },
  N4: {
    totalMinScore: 90,
    totalMaxScore: 180,
    sections: {
      LANGUAGE_READING: { minScore: 38, maxScore: 120 },
      LISTENING: { minScore: 19, maxScore: 60 },
    },
  },
  N3: {
    totalMinScore: 95,
    totalMaxScore: 180,
    sections: {
      LANGUAGE: { minScore: 19, maxScore: 60 }, // VOCAB + KANJI + GRAMMAR
      READING: { minScore: 19, maxScore: 60 },
      LISTENING: { minScore: 19, maxScore: 60 },
    },
  },
  N2: {
    totalMinScore: 90,
    totalMaxScore: 180,
    sections: {
      LANGUAGE: { minScore: 19, maxScore: 60 },
      READING: { minScore: 19, maxScore: 60 },
      LISTENING: { minScore: 19, maxScore: 60 },
    },
  },
  N1: {
    totalMinScore: 100,
    totalMaxScore: 180,
    sections: {
      LANGUAGE: { minScore: 19, maxScore: 60 },
      READING: { minScore: 19, maxScore: 60 },
      LISTENING: { minScore: 19, maxScore: 60 },
    },
  },
} as const

// Section groupings for different JLPT levels
export const SECTION_GROUPINGS = {
  N5_N4: {
    LANGUAGE_READING: ['VOCAB', 'KANJI', 'GRAMMAR', 'READING'],
    LISTENING: ['LISTENING'],
  },
  N3_N2_N1: {
    LANGUAGE: ['VOCAB', 'KANJI', 'GRAMMAR'],
    READING: ['READING'],
    LISTENING: ['LISTENING'],
  },
} as const

// ===== Zod Schemas =====
export const StartAssessmentAttemptSchema = z.object({
  assessmentId: z.number().int().positive(),
})

export const SubmitAnswerSchema = z.object({
  questionId: z.number().int().positive(),
  selectedOptionId: z.number().int().positive().optional(),
  timeSpentSec: z.number().int().min(0).optional(),
})

export const SubmitAssessmentAttemptSchema = z.object({
  answers: z.array(SubmitAnswerSchema).min(1),
})

export const AssessmentAttemptQuerySchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  userId: z.number().int().positive().optional(),
  assessmentId: z.number().int().positive().optional(),
  level: z.nativeEnum(JLPTLevel).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  submitted: z.boolean().optional(),
  includeAnswers: z.boolean().default(false),
  includeUser: z.boolean().default(false),
  includeAssessment: z.boolean().default(false),
  sortBy: z.enum(['startedAt', 'submittedAt', 'score', 'earnedScore']).default('startedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export const GradeAttemptSchema = z.object({
  attemptId: z.number().int().positive(),
  autoGrade: z.boolean().default(true),
})

export const UpdateAttemptScoreSchema = z.object({
  score: z.number().min(0).optional(),
  earnedScore: z.number().min(0).optional(),
  levelSuggestion: z.nativeEnum(JLPTLevel).optional(),
})

// ===== Type Exports =====
export type StartAssessmentAttemptInput = z.infer<typeof StartAssessmentAttemptSchema>
export type SubmitAnswerInput = z.infer<typeof SubmitAnswerSchema>
export type SubmitAssessmentAttemptInput = z.infer<typeof SubmitAssessmentAttemptSchema>
export type AssessmentAttemptQuery = z.infer<typeof AssessmentAttemptQuerySchema>
export type GradeAttemptInput = z.infer<typeof GradeAttemptSchema>
export type UpdateAttemptScoreInput = z.infer<typeof UpdateAttemptScoreSchema>

// ===== Helper Functions =====
export function calculateScaledScore(correctAnswers: number, totalQuestions: number, maxScore: number): number {
  if (totalQuestions === 0) return 0
  const rawPercentage = correctAnswers / totalQuestions
  return Math.round(rawPercentage * maxScore)
}

export function determineSectionGrouping(level: JLPTLevel): keyof typeof SECTION_GROUPINGS {
  return level === 'N5' || level === 'N4' ? 'N5_N4' : 'N3_N2_N1'
}

export function evaluateJLPTLevel(sectionScores: SectionScore[], currentLevel: JLPTLevel): LevelEvaluation {
  const criteria = JLPT_SCORING_CRITERIA[currentLevel]
  const totalScore = sectionScores.reduce((sum, section) => sum + section.scaledScore, 0)

  // Check if total score meets minimum requirement
  const totalPassed = totalScore >= criteria.totalMinScore

  // Check if each section meets minimum requirement
  let sectionsPassed = true
  for (const section of sectionScores) {
    const sectionName = section.sectionType as keyof typeof criteria.sections
    const sectionCriteria = criteria.sections[sectionName]
    if (sectionCriteria && section.scaledScore < sectionCriteria.minScore) {
      sectionsPassed = false
      break
    }
  }

  const passed = totalPassed && sectionsPassed

  // Suggest appropriate level
  let suggestedLevel: JLPTLevel | null = null
  let recommendation = ''

  if (passed) {
    // If passed current level, suggest next level up (if available)
    const levels: JLPTLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']
    const currentIndex = levels.indexOf(currentLevel)

    if (currentIndex > 0) {
      suggestedLevel = levels[currentIndex - 1]
      recommendation = `Congratulations! You passed ${currentLevel}. You're ready to attempt ${suggestedLevel}.`
    } else {
      recommendation = `Excellent! You've mastered ${currentLevel}, the highest JLPT level.`
    }
  } else {
    // If failed, analyze what went wrong and suggest improvement
    if (!totalPassed && !sectionsPassed) {
      recommendation = `Focus on improving all areas. Your total score (${totalScore}/${criteria.totalMaxScore}) and section scores need improvement.`
    } else if (!totalPassed) {
      recommendation = `You need to improve your overall performance. Current score: ${totalScore}/${criteria.totalMaxScore} (minimum: ${criteria.totalMinScore}).`
    } else if (!sectionsPassed) {
      recommendation = `Your total score is good, but some sections need improvement. Check individual section requirements.`
    }

    // Suggest staying at current level or going down if score is very low
    const scorePercentage = totalScore / criteria.totalMaxScore
    if (scorePercentage < 0.3 && currentLevel !== 'N5') {
      const levels: JLPTLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']
      const currentIndex = levels.indexOf(currentLevel)
      suggestedLevel = levels[currentIndex + 1]
      recommendation += ` Consider starting with ${suggestedLevel} to build a stronger foundation.`
    } else {
      suggestedLevel = currentLevel
      recommendation += ` Continue practicing ${currentLevel} level materials.`
    }
  }

  return {
    currentLevel,
    totalScore,
    totalPassed,
    sectionsPassed,
    suggestedLevel,
    recommendation,
  }
}

// ===== Error Messages =====
export const ASSESSMENT_ATTEMPT_ERRORS = {
  NOT_FOUND: 'Assessment attempt not found',
  ASSESSMENT_NOT_FOUND: 'Assessment not found',
  USER_NOT_FOUND: 'User not found',
  ALREADY_STARTED: 'User has already started this assessment',
  ALREADY_SUBMITTED: 'Assessment attempt already submitted',
  NOT_STARTED: 'Assessment attempt not started',
  INVALID_QUESTION: 'Question not in this assessment',
  INVALID_OPTION: 'Invalid option for this question',
  SUBMISSION_REQUIRED: 'Assessment must be submitted before grading',
  CANNOT_UPDATE_SUBMITTED: 'Cannot update submitted assessment attempt',
} as const

// ===== Constants =====
export const ASSESSMENT_ATTEMPT_CONSTRAINTS = {
  MAX_QUERY_LIMIT: 100,
  DEFAULT_QUERY_LIMIT: 20,
  MAX_TIME_LIMIT_HOURS: 24,
} as const

// ===== Statistics Types =====
export const AssessmentAttemptStatsSchema = z.object({
  totalAttempts: z.number().int().min(0),
  submittedAttempts: z.number().int().min(0),
  averageScore: z.number().min(0).optional(),
  averageAccuracy: z.number().min(0).max(100).optional(),
  levelDistribution: z.record(z.string(), z.number().int().min(0)),
  passRate: z.number().min(0).max(100).optional(),
})

export type AssessmentAttemptStats = z.infer<typeof AssessmentAttemptStatsSchema>
