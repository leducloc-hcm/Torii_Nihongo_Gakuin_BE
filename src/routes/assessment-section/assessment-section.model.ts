import { AssessmentItem, AssessmentPaper, AssessmentSection, Question } from '@prisma/client'
import { z } from 'zod'

export type AssessmentSectionBase = AssessmentSection

export type AssessmentSectionWithItems = AssessmentSection & {
  items: (AssessmentItem & {
    question?: Question | null
    questionGroup?: any | null
  })[]
}

export type AssessmentSectionWithAssessment = AssessmentSection & {
  assessment: Pick<AssessmentPaper, 'id' | 'title' | 'level' | 'type'>
  _count: {
    items: number
  }
}

export type AssessmentSectionBasic = AssessmentSection & {
  _count: {
    items: number
  }
}

export const QuestionTypeSchema = z.enum(['VOCAB', 'GRAMMAR', 'READING', 'LISTENING'])

export const CreateAssessmentSectionSchema = z.object({
  assessmentId: z.number().int().positive(),
  title: z.string().min(1).max(255),
  type: QuestionTypeSchema,
  timeLimitSec: z.number().int().positive().optional(),
})

export const UpdateAssessmentSectionSchema = CreateAssessmentSectionSchema.partial().omit({ assessmentId: true })

export const AssessmentSectionQuerySchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  type: QuestionTypeSchema.optional(),
  assessmentId: z.number().int().positive().optional(),
  sortBy: z.enum(['id', 'title', 'type']).default('id'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})

export type CreateAssessmentSectionInput = z.infer<typeof CreateAssessmentSectionSchema>
export type UpdateAssessmentSectionInput = z.infer<typeof UpdateAssessmentSectionSchema>
export type AssessmentSectionQuery = z.infer<typeof AssessmentSectionQuerySchema>
