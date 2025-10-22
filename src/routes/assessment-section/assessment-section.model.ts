import { z } from 'zod'
import { AssessmentSection, AssessmentPaper, AssessmentItem, Question } from '@prisma/client'

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

export const QuestionTypeSchema = z.enum(['VOCAB', 'KANJI', 'GRAMMAR', 'SYNONYM', 'ORDER', 'READING', 'LISTENING'])

export const AssessmentSectionBaseSchema = z.object({
  id: z.number().int().positive(),
  assessmentId: z.number().int().positive(),
  title: z.string().min(1).max(255),
  type: QuestionTypeSchema,
})

export const CreateAssessmentSectionSchema = z.object({
  assessmentId: z.number().int().positive(),
  title: z.string().min(1).max(255),
  type: QuestionTypeSchema,
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

// ===== Type Exports =====
export type CreateAssessmentSectionInput = z.infer<typeof CreateAssessmentSectionSchema>
export type UpdateAssessmentSectionInput = z.infer<typeof UpdateAssessmentSectionSchema>
export type AssessmentSectionQuery = z.infer<typeof AssessmentSectionQuerySchema>
export type QuestionType = z.infer<typeof QuestionTypeSchema>

export const BulkCreateAssessmentSectionsSchema = z.object({
  sections: z.array(CreateAssessmentSectionSchema).min(1).max(50),
})

export const ReorderAssessmentSectionsSchema = z.object({
  sections: z
    .array(
      z.object({
        id: z.number().int().positive(),
        order: z.number().int().min(0),
      }),
    )
    .min(1)
    .max(100),
})

export const BulkDeleteAssessmentSectionsSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(100),
})

export type BulkCreateAssessmentSectionsInput = z.infer<typeof BulkCreateAssessmentSectionsSchema>
export type ReorderAssessmentSectionsInput = z.infer<typeof ReorderAssessmentSectionsSchema>
export type BulkDeleteAssessmentSectionsInput = z.infer<typeof BulkDeleteAssessmentSectionsSchema>

// ===== Section Statistics =====
export const AssessmentSectionStatsSchema = z.object({
  totalItems: z.number().int().min(0),
  itemsByType: z.record(z.string(), z.number().int().min(0)),
  estimatedDurationMinutes: z.number().optional(),
})

export type AssessmentSectionStats = z.infer<typeof AssessmentSectionStatsSchema>
