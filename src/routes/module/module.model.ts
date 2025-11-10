import { z } from 'zod'

// Module Schema
export const ModuleSchema = z.object({
  id: z.number().int().positive(),
  courseId: z.number().int().positive(),
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  order: z.number().int().min(0, 'Order must be non-negative').default(0),
})

// Create Module Schema
export const CreateModuleSchema = ModuleSchema.omit({
  id: true,
})

// Update Module Schema
export const UpdateModuleSchema = ModuleSchema.omit({
  id: true,
  courseId: true,
}).partial()

// Query Module Schema
export const QueryModuleSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  search: z.string().optional(),
  courseId: z.coerce.number().int().positive().optional(),
  sortBy: z.enum(['order', 'title']).optional().default('order'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
})

// Module Response Schema (with relations)
export const ModuleResponseSchema = ModuleSchema.extend({
  course: z.object({
    id: z.number(),
    title: z.string(),
    slug: z.string(),
  }),
  lessons: z.array(
    z.object({
      id: z.number(),
      title: z.string(),
      kind: z.enum(['VIDEO', 'ARTICLE', 'QUIZ', 'LIVE']),
      order: z.number(),
      status: z.enum(['PRIVATE', 'PUBLISHED', 'GLOBAL_PUBLIC']),
      durationSec: z.number().nullable(),
      createdAt: z.date(),
    }),
  ),
  _count: z.object({
    lessons: z.number(),
  }),
})

// Module List Item Schema (simplified for list views)
export const ModuleListItemSchema = z.object({
  id: z.number(),
  courseId: z.number(),
  title: z.string(),
  order: z.number(),
  course: z.object({
    id: z.number(),
    title: z.string(),
    slug: z.string(),
  }),
  _count: z.object({
    lessons: z.number(),
  }),
})

// Repository input/output types
export type ModuleCreateInput = {
  courseId: number
  title: string
  order?: number
}

export type ModuleUpdateInput = {
  title?: string
  order?: number
}

export type ModuleWhereUniqueInput = {
  id?: number
}

export type ModuleWhereInput = {
  id?: number | { not: number }
  courseId?: number
  title?: { contains: string; mode: 'insensitive' }
  OR?: Array<{
    title?: { contains: string; mode: 'insensitive' }
  }>
}

export type ModuleOrderByInput = {
  id?: 'asc' | 'desc'
  title?: 'asc' | 'desc'
  order?: 'asc' | 'desc'
}

export type ModuleWithRelations = {
  id: number
  courseId: number
  title: string
  order: number
  course: {
    id: number
    title: string
    slug: string
  }
  lessons: Array<{
    id: number
    title: string
    kind: 'VIDEO' | 'ARTICLE' | 'QUIZ' | 'LIVE'
    order: number
    status: 'PRIVATE' | 'PUBLISHED' | 'GLOBAL_PUBLIC'
    durationSec: number | null
    createdAt: Date
  }>
  _count: {
    lessons: number
  }
}

// Exported Zod types
export type CreateModuleType = z.infer<typeof CreateModuleSchema>
export type Module = z.infer<typeof ModuleSchema>
export type UpdateModuleType = z.infer<typeof UpdateModuleSchema>
export type QueryModuleType = z.infer<typeof QueryModuleSchema>
export type ModuleResponseType = z.infer<typeof ModuleResponseSchema>
export type ModuleListItemType = z.infer<typeof ModuleListItemSchema>
