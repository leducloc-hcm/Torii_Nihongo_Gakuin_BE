import { z } from 'zod'
import { AssessmentPaper, AssessmentSection, AssessmentAttempt, User, Lesson, PlacementBlueprint } from '@prisma/client'

// ===== Base Types from Prisma =====
export type AssessmentPaperBase = AssessmentPaper

// Complex relation types
export type AssessmentPaperWithRelations = AssessmentPaper & {
  author: Pick<User, 'id' | 'name' | 'email'>
  lesson?: Lesson | null
  blueprint?: PlacementBlueprint | null
  sections: (AssessmentSection & {
    items: any[]
  })[]
  attempts: (AssessmentAttempt & {
    user: Pick<User, 'id' | 'name' | 'email'>
  })[]
}

export type AssessmentPaperBasic = AssessmentPaper & {
  author: Pick<User, 'id' | 'name' | 'email'>
  lesson?: Pick<Lesson, 'id' | 'title'> | null
  blueprint?: Pick<PlacementBlueprint, 'id' | 'level'> | null
  _count: {
    sections: number
    attempts: number
  }
}

export type AssessmentPaperWithSections = AssessmentPaper & {
  author: Pick<User, 'id' | 'name' | 'email'>
  sections: (AssessmentSection & {
    items: any[]
  })[]
}

// ===== Zod Schemas =====
export const JLPTLevelSchema = z.enum(['N5', 'N4', 'N3', 'N2', 'N1'])
export const VisibilitySchema = z.enum(['PRIVATE', 'UNLISTED', 'PUBLIC'])
export const AssessmentTypeSchema = z.enum(['QUIZ', 'TEST', 'EXAM'])

export const AssessmentPaperBaseSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1).max(255),
  level: JLPTLevelSchema,
  type: AssessmentTypeSchema,
  visibility: VisibilitySchema,
  createdBy: z.number().int().positive(),
  createdAt: z.date(),
  lessonId: z.number().int().positive().nullable(),
  blueprintId: z.number().int().positive().nullable(),
  blueprintSnapshot: z.any().nullable(), // JSON
  seed: z.bigint().nullable(),
  version: z.number().int().positive(),
  generatorVersion: z.string().nullable(),
  generatorMeta: z.any().nullable(), // JSON
})

// Manual creation schema - for creating assessment papers by hand
export const CreateAssessmentPaperManualSchema = z.object({
  title: z.string().min(1).max(255),
  level: JLPTLevelSchema,
  type: AssessmentTypeSchema,
  visibility: VisibilitySchema.default('PRIVATE'),
  createdBy: z.number().int().positive(),
  lessonId: z.number().int().positive().optional(),
})

// Blueprint generation schema - for creating assessment papers from blueprint
export const CreateAssessmentPaperBlueprintSchema = z.object({
  title: z.string().min(1).max(255),
  level: JLPTLevelSchema,
  type: AssessmentTypeSchema,
  visibility: VisibilitySchema.default('PRIVATE'),
  createdBy: z.number().int().positive(),
  blueprintId: z.number().int().positive(),
  blueprintSnapshot: z.any().nullable().optional(), // JSON snapshot of blueprint
  seed: z.bigint().nullable().optional(),
  version: z.number().int().positive().default(1),
  generatorVersion: z.string().nullable().optional(),
  generatorMeta: z.any().nullable().optional(),
})

// Flexible schema that handles both modes
export const CreateAssessmentPaperSchema = z.object({
  title: z.string().min(1).max(255),
  level: JLPTLevelSchema,
  type: AssessmentTypeSchema,
  visibility: VisibilitySchema.default('PRIVATE'),
  createdBy: z.number().int().positive(),
  lessonId: z.number().int().positive().optional(),
  blueprintId: z.number().int().positive().optional(),
  blueprintSnapshot: z.any().optional(), // JSON
  seed: z.bigint().optional(),
  version: z.number().int().positive().default(1),
  generatorVersion: z.string().optional(),
  generatorMeta: z.any().optional(),
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
  lessonId: z.number().int().positive().optional(),
  blueprintId: z.number().int().positive().optional(),
  sortBy: z.enum(['createdAt', 'title', 'level', 'type', 'version']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// ===== Type Exports =====
export type CreateAssessmentPaperInput = z.infer<typeof CreateAssessmentPaperSchema>
export type CreateAssessmentPaperManualInput = z.infer<typeof CreateAssessmentPaperManualSchema>
export type CreateAssessmentPaperBlueprintInput = z.infer<typeof CreateAssessmentPaperBlueprintSchema>
export type UpdateAssessmentPaperInput = z.infer<typeof UpdateAssessmentPaperSchema>
export type AssessmentPaperQuery = z.infer<typeof AssessmentPaperQuerySchema>
export type JLPTLevel = z.infer<typeof JLPTLevelSchema>
export type Visibility = z.infer<typeof VisibilitySchema>
export type AssessmentType = z.infer<typeof AssessmentTypeSchema>

// ===== Generator Metadata Schema =====
export const GeneratorMetaSchema = z
  .object({
    model: z.string().optional(),
    temperature: z.number().optional(),
    codeHash: z.string().optional(),
    configHash: z.string().optional(),
    timestamp: z.date().optional(),
  })
  .nullable()

export type GeneratorMeta = z.infer<typeof GeneratorMetaSchema>
