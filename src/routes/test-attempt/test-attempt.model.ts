// ===== TestAttempt Model =====
// Represents student test submissions with grading and JLPT level suggestions
// Handles scoring logic based on JLPT official scoring criteria

import { TestAttempt as PrismaTestAttempt, JLPTLevel } from '@prisma/client'
import { z } from 'zod'

// ===== Prisma Types =====
export type TestAttempt = PrismaTestAttempt

// ===== Extended Types with Relations =====
export interface TestAttemptWithDetails extends TestAttempt {
  user: {
    id: number
    name: string
    email: string
  }
  test: {
    id: number
    title: string
    level: JLPTLevel
    totalQuestions: number
  }
  answers: Array<{
    id: number
    questionId: number
    selectedOptionId: number | null
    isCorrect: boolean
    question: {
      type: string
      section: {
        type: string
      }
    }
  }>
}

export interface TestAttemptStats extends TestAttempt {
  totalQuestions: number
  correctAnswers: number
  accuracy: number
  sectionScores: SectionScore[]
  levelEvaluation: LevelEvaluation
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
export const StartTestAttemptSchema = z.object({
  testId: z.number().int().positive(),
})

export const SubmitAnswerSchema = z.object({
  questionId: z.number().int().positive(),
  selectedOptionId: z.number().int().positive().optional(),
})

export const SubmitTestAttemptSchema = z.object({
  answers: z.array(SubmitAnswerSchema).min(1),
})

export const TestAttemptQuerySchema = z.object({
  userId: z.number().int().positive().optional(),
  testId: z.number().int().positive().optional(),
  level: z.nativeEnum(JLPTLevel).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  passed: z.boolean().optional(),
  includeAnswers: z.boolean().default(false),
  includeUser: z.boolean().default(false),
  includeTest: z.boolean().default(false),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  sortBy: z.enum(['startedAt', 'submittedAt', 'score']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

export const GradeAttemptSchema = z.object({
  attemptId: z.number().int().positive(),
})

// ===== Type Exports =====
export type StartTestAttemptInput = z.infer<typeof StartTestAttemptSchema>
export type SubmitAnswerInput = z.infer<typeof SubmitAnswerSchema>
export type SubmitTestAttemptInput = z.infer<typeof SubmitTestAttemptSchema>
export type TestAttemptQueryInput = z.infer<typeof TestAttemptQuerySchema>
export type GradeAttemptInput = z.infer<typeof GradeAttemptSchema>

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
export const TEST_ATTEMPT_ERRORS = {
  NOT_FOUND: 'Test attempt not found',
  TEST_NOT_FOUND: 'Test not found',
  USER_NOT_FOUND: 'User not found',
  ALREADY_STARTED: 'User has already started this test',
  ALREADY_SUBMITTED: 'Test attempt already submitted',
  NOT_STARTED: 'Test attempt not started',
  INVALID_QUESTION: 'Question not in this test',
  INVALID_OPTION: 'Invalid option for this question',
  SUBMISSION_REQUIRED: 'Test must be submitted before grading',
} as const

// ===== Constants =====
export const TEST_ATTEMPT_CONSTRAINTS = {
  MAX_QUERY_LIMIT: 100,
  DEFAULT_QUERY_LIMIT: 20,
} as const
