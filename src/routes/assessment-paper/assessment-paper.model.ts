import { z } from 'zod'
import { AssessmentPaper, User, ScoreProfile } from '@prisma/client'

export type AssessmentPaperBase = AssessmentPaper

export type AssessmentPaperWithRelations = AssessmentPaper & {
  author: Pick<User, 'id' | 'name' | 'email'>
  scoreProfile: Pick<ScoreProfile, 'id' | 'name' | 'level' | 'maxTotal'>
  sections: any[]
}

export type AssessmentPaperBasic = AssessmentPaper & {
  author: Pick<User, 'id' | 'name' | 'email'>
  scoreProfile: Pick<ScoreProfile, 'id' | 'name' | 'level'>
  _count: {
    sections: number
    attempts: number
  }
}

export const JLPTLevelSchema = z.enum(['N5', 'N4', 'N3', 'N2', 'N1'])
export const VisibilitySchema = z.enum(['PRIVATE', 'UNLISTED', 'PUBLIC'])
export const AssessmentTypeSchema = z.enum(['TEST', 'EXAM'])

export const CreateAssessmentPaperSchema = z.object({
  title: z.string().min(1).max(255),
  level: JLPTLevelSchema,
  type: AssessmentTypeSchema,
  visibility: VisibilitySchema.default('PRIVATE'),
  createdBy: z.number().int().positive(),
  scoreProfileId: z.number().int().positive(),
  seed: z.bigint().optional(),
  version: z.number().int().positive().default(1),
  generatorVersion: z.string().optional(),
})

export const UpdateAssessmentPaperSchema = CreateAssessmentPaperSchema.partial().omit({ createdBy: true })

export const AssessmentPaperQuerySchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  level: JLPTLevelSchema.optional(),
  type: AssessmentTypeSchema.optional(),
  visibility: VisibilitySchema.optional(),
  createdBy: z.number().int().positive().optional(),
  blueprintId: z.number().int().positive().optional(),
  sortBy: z.enum(['createdAt', 'title', 'level', 'type', 'version']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export type CreateAssessmentPaperInput = z.infer<typeof CreateAssessmentPaperSchema>
export type UpdateAssessmentPaperInput = z.infer<typeof UpdateAssessmentPaperSchema>
export type AssessmentPaperQuery = z.infer<typeof AssessmentPaperQuerySchema>
