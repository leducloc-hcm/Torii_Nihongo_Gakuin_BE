import { Prisma } from '@prisma/client'
import { z } from 'zod'

// ===== Prisma Types =====
export type TestPaper = Prisma.TestPaperGetPayload<Record<string, never>>
export type TestPaperWithRelations = Prisma.TestPaperGetPayload<{
  include: {
    blueprint: true
    sections: {
      include: {
        items: {
          include: {
            question: true
          }
        }
      }
    }
    attempts: {
      include: {
        user: {
          select: {
            id: true
            name: true
            email: true
          }
        }
      }
    }
  }
}>

export type TestPaperBasic = Prisma.TestPaperGetPayload<{
  include: {
    blueprint: {
      select: {
        id: true
        title: true
      }
    }
    _count: {
      select: {
        sections: true
        attempts: true
      }
    }
  }
}>

export type TestPaperWithSections = Prisma.TestPaperGetPayload<{
  include: {
    sections: {
      include: {
        items: {
          include: {
            question: {
              include: {
                options: true
              }
            }
          }
        }
      }
    }
  }
}>

// ===== Zod Schemas =====
export const JLPTLevelSchema = z.enum(['N5', 'N4', 'N3', 'N2', 'N1'])
export const VisibilitySchema = z.enum(['PRIVATE', 'UNLISTED', 'PUBLIC'])
export const TestPaperStatusSchema = z.enum(['draft', 'published', 'archived'])

export const TestPaperBaseSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1).max(255),
  level: JLPTLevelSchema,
  isPlacement: z.boolean(),
  createdAt: z.date(),
  visibility: VisibilitySchema,
  blueprintId: z.number().int().positive().nullable(),
  blueprintSnapshot: z.any().nullable(), // JSON
  seed: z.bigint().nullable(),
  version: z.number().int().positive(),
  generatorVersion: z.string().nullable(),
  generatorMeta: z.any().nullable(), // JSON
  status: z.string(),
})

export const CreateTestPaperSchema = z.object({
  title: z.string().min(1).max(255),
  level: JLPTLevelSchema,
  isPlacement: z.boolean().default(false),
  visibility: VisibilitySchema.default('PRIVATE'),
  blueprintId: z.number().int().positive().nullable().optional(),
  seed: z.bigint().nullable().optional(),
  version: z.number().int().positive().default(1),
  generatorVersion: z.string().nullable().optional(),
  generatorMeta: z.any().nullable().optional(),
  status: z.string().default('published'),
})

export const UpdateTestPaperSchema = CreateTestPaperSchema.partial()

export const TestPaperQuerySchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  level: JLPTLevelSchema.optional(),
  isPlacement: z.boolean().optional(),
  visibility: VisibilitySchema.optional(),
  status: z.string().optional(),
  blueprintId: z.number().int().positive().optional(),
  sortBy: z.enum(['createdAt', 'title', 'level', 'version']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// ===== Type Exports =====
export type CreateTestPaperInput = z.infer<typeof CreateTestPaperSchema>
export type UpdateTestPaperInput = z.infer<typeof UpdateTestPaperSchema>
export type TestPaperQuery = z.infer<typeof TestPaperQuerySchema>
export type JLPTLevel = z.infer<typeof JLPTLevelSchema>
export type Visibility = z.infer<typeof VisibilitySchema>
export type TestPaperStatus = z.infer<typeof TestPaperStatusSchema>

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
