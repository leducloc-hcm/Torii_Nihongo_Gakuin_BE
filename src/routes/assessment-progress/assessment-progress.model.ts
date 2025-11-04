import { z } from 'zod'

// ============= CREATE SCHEMA =============

export const CreateAssessmentProgressSchema = z.object({
  assessmentId: z.number().int().positive(),
  userId: z.number().int().positive(),
  assignmentId: z.number().int().positive().optional().nullable(),
  currentSection: z.number().int().min(0).optional().nullable(),
  currentQuestion: z.number().int().min(0).optional().nullable(),
  timeSpentSec: z.number().int().min(0).default(0),
  remainingSec: z.number().int().min(0).optional().nullable(),
  isSubmitted: z.boolean().default(false),
  completedAt: z.coerce.date().optional().nullable(),
})

export type CreateAssessmentProgress = z.infer<typeof CreateAssessmentProgressSchema>

// ============= UPDATE SCHEMA =============

export const UpdateAssessmentProgressSchema = z.object({
  currentSection: z.number().int().min(0).optional().nullable(),
  currentQuestion: z.number().int().min(0).optional().nullable(),
  timeSpentSec: z.number().int().min(0).optional(),
  remainingSec: z.number().int().min(0).optional().nullable(),
  isSubmitted: z.boolean().optional(),
  completedAt: z.coerce.date().optional().nullable(),
})

export type UpdateAssessmentProgress = z.infer<typeof UpdateAssessmentProgressSchema>

// ============= QUERY SCHEMA =============

export const QueryAssessmentProgressSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  userId: z.coerce.number().int().positive().optional(),
  assignmentId: z.coerce.number().int().positive().optional(),
  assessmentId: z.coerce.number().int().positive().optional(),
  isSubmitted: z.coerce.boolean().optional(),
  sortBy: z.enum(['startedAt', 'lastSavedAt', 'completedAt']).default('startedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export type QueryAssessmentProgress = z.infer<typeof QueryAssessmentProgressSchema>

// ============= SAVE ANSWER SCHEMA =============

export const SaveAnswerProgressSchema = z.object({
  progressId: z.number().int().positive(),
  questionId: z.number().int().positive(),
  selectedOptionId: z.number().int().positive().optional().nullable(),
  timeSpentSec: z.number().int().min(0).optional().default(0),
  isFlagged: z.boolean().optional().default(false),
})

export type SaveAnswerProgress = z.infer<typeof SaveAnswerProgressSchema>

// ============= UPDATE ANSWER SCHEMA =============

export const UpdateAnswerProgressSchema = z.object({
  selectedOptionId: z.number().int().positive().optional().nullable(),
  timeSpentSec: z.number().int().min(0).optional(),
  isFlagged: z.boolean().optional(),
})

export type UpdateAnswerProgress = z.infer<typeof UpdateAnswerProgressSchema>

// ============= SUBMIT ASSESSMENT SCHEMA =============

export const SubmitAssessmentSchema = z.object({
  progressId: z.number().int().positive(),
})

export type SubmitAssessment = z.infer<typeof SubmitAssessmentSchema>

// ============= START ASSESSMENT SCHEMA =============

export const StartAssessmentSchema = z.object({
  assessmentId: z.number().int().positive(),
  assignmentId: z.number().int().positive().optional().nullable(),
})

export type StartAssessment = z.infer<typeof StartAssessmentSchema>

// ============= AUTO SAVE SCHEMA =============

export const AutoSaveProgressSchema = z.object({
  progressId: z.number().int().positive(),
  currentSection: z.number().int().min(0).optional().nullable(),
  currentQuestion: z.number().int().min(0).optional().nullable(),
  timeSpentSec: z.number().int().min(0).optional(),
})

export type AutoSaveProgress = z.infer<typeof AutoSaveProgressSchema>
