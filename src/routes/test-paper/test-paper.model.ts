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

export const TestPaperBaseSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1).max(255),
  level: JLPTLevelSchema,
  createdAt: z.date(),
  visibility: VisibilitySchema,
  blueprintId: z.number().int().positive().nullable(),
  blueprintSnapshot: z.any().nullable(), // JSON
  seed: z.bigint().nullable(),
  version: z.number().int().positive(),
  generatorVersion: z.string().nullable(),
  generatorMeta: z.any().nullable(), // JSON
})

// Manual creation schema - for creating test papers by hand
export const CreateTestPaperManualSchema = z.object({
  title: z.string().min(1).max(255),
  level: JLPTLevelSchema,
  visibility: VisibilitySchema.default('PRIVATE'),
})

// MCP server generation schema - for creating test papers via MCP
export const CreateTestPaperMCPSchema = z.object({
  title: z.string().min(1).max(255),
  level: JLPTLevelSchema,
  visibility: VisibilitySchema.default('PRIVATE'),
  blueprintId: z.number().int().positive(),
  blueprintSnapshot: z.any().nullable().optional(), // JSON snapshot of blueprint
  seed: z.bigint().nullable().optional(),
  version: z.number().int().positive().default(1),
  generatorVersion: z.string().nullable().optional(),
  generatorMeta: z.any().nullable().optional(),
})

// Union schema that accepts both modes
export const CreateTestPaperSchema = z.discriminatedUnion('mode', [
  z
    .object({
      mode: z.literal('manual'),
    })
    .merge(CreateTestPaperManualSchema),
  z
    .object({
      mode: z.literal('mcp'),
    })
    .merge(CreateTestPaperMCPSchema),
])

// Alternative: Single schema that handles both (more flexible)
export const CreateTestPaperFlexibleSchema = z.object({
  title: z.string().min(1).max(255),
  level: JLPTLevelSchema,
  visibility: VisibilitySchema.default('PRIVATE'),
  blueprintId: z.number().int().positive().optional(),
  blueprintSnapshot: z.any().optional(), // JSON
  seed: z.bigint().optional(),
  version: z.number().int().positive().default(1),
  generatorVersion: z.string().optional(),
  generatorMeta: z.any().optional(),
})

export const UpdateTestPaperSchema = CreateTestPaperFlexibleSchema.partial()

export const TestPaperQuerySchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  level: JLPTLevelSchema.optional(),
  visibility: VisibilitySchema.optional(),
  blueprintId: z.number().int().positive().optional(),
  sortBy: z.enum(['createdAt', 'title', 'level', 'version']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// ===== Type Exports =====
export type CreateTestPaperInput = z.infer<typeof CreateTestPaperFlexibleSchema>
export type CreateTestPaperManualInput = z.infer<typeof CreateTestPaperManualSchema>
export type CreateTestPaperMCPInput = z.infer<typeof CreateTestPaperMCPSchema>
export type UpdateTestPaperInput = z.infer<typeof UpdateTestPaperSchema>
export type TestPaperQuery = z.infer<typeof TestPaperQuerySchema>
export type JLPTLevel = z.infer<typeof JLPTLevelSchema>
export type Visibility = z.infer<typeof VisibilitySchema>

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
