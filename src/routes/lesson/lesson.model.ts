import { z } from 'zod'

// Lesson Schema
export const LessonSchema = z.object({
  id: z.number().int().positive(),
  moduleId: z.number().int().positive(),
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  kind: z.enum(['VIDEO', 'ARTICLE', 'QUIZ', 'LIVE']).default('VIDEO'),
  content: z.string().nullable().optional(),
  mediaId: z.number().int().positive().nullable().optional(),
  videoUrl: z.string().url('Invalid video URL').nullable().optional(),
  durationSec: z.number().int().min(0, 'Duration must be non-negative').nullable().optional(),
  order: z.number().int().min(0, 'Order must be non-negative').default(0),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  status: z.enum(['PRIVATE', 'PUBLISHED', 'GLOBAL_PUBLIC']).default('PRIVATE'),
})

// Create Lesson Schema
export const CreateLessonSchema = LessonSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

// Update Lesson Schema
export const UpdateLessonSchema = LessonSchema.omit({
  id: true,
  moduleId: true,
  createdAt: true,
  updatedAt: true,
}).partial()

// Query Lesson Schema
export const QueryLessonSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  search: z.string().optional(),
  moduleId: z.coerce.number().int().positive().optional(),
  kind: z.enum(['VIDEO', 'ARTICLE', 'QUIZ', 'LIVE']).optional(),
  status: z.enum(['PRIVATE', 'PUBLISHED', 'GLOBAL_PUBLIC']).optional(),
  sortBy: z.enum(['order', 'title', 'createdAt']).optional().default('order'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
})

// Lesson Response Schema (with relations)
export const LessonResponseSchema = LessonSchema.extend({
  module: z.object({
    id: z.number(),
    title: z.string(),
    course: z.object({
      id: z.number(),
      title: z.string(),
      slug: z.string(),
    }),
  }),
  resources: z.array(
    z.object({
      id: z.number(),
      url: z.string(),
      kind: z.enum(['AUDIO', 'VIDEO', 'IMAGE', 'PDF', 'OTHER']),
      mimeType: z.string().nullable(),
      sizeByte: z.number().nullable(),
      caption: z.string().nullable(),
      createdAt: z.date(),
    }),
  ),
  liveSession: z
    .object({
      id: z.number(),
      title: z.string(),
      scheduledAt: z.date(),
      endedAt: z.date().nullable(),
      mode: z.enum(['MODE2D', 'MODE3D']),
      roomKey: z.string(),
    })
    .nullable(),
  quiz: z
    .object({
      id: z.number(),
      title: z.string(),
      _count: z.object({
        items: z.number(),
      }),
    })
    .nullable(),
  _count: z.object({
    notes: z.number(),
    resources: z.number(),
  }),
})

// Lesson List Item Schema (simplified for list views)
export const LessonListItemSchema = z.object({
  id: z.number(),
  moduleId: z.number(),
  title: z.string(),
  kind: z.enum(['VIDEO', 'ARTICLE', 'QUIZ', 'LIVE']),
  order: z.number(),
  status: z.enum(['PRIVATE', 'PUBLISHED', 'GLOBAL_PUBLIC']),
  durationSec: z.number().nullable(),
  createdAt: z.date(),
  module: z.object({
    id: z.number(),
    title: z.string(),
    course: z.object({
      id: z.number(),
      title: z.string(),
      slug: z.string(),
    }),
  }),
  _count: z.object({
    notes: z.number(),
    resources: z.number(),
  }),
})

// Repository input/output types
export type LessonCreateInput = {
  moduleId: number
  title: string
  kind?: 'VIDEO' | 'ARTICLE' | 'QUIZ' | 'LIVE'
  content?: string | null
  videoUrl?: string | null
  durationSec?: number | null
  order?: number
  status?: 'PRIVATE' | 'PUBLISHED' | 'GLOBAL_PUBLIC'
}

export type LessonUpdateInput = {
  title?: string
  kind?: 'VIDEO' | 'ARTICLE' | 'QUIZ' | 'LIVE'
  content?: string | null
  videoUrl?: string | null
  durationSec?: number | null
  order?: number
  status?: 'PRIVATE' | 'PUBLISHED' | 'GLOBAL_PUBLIC'
}

export type LessonWhereUniqueInput = {
  id?: number
}

export type LessonWhereInput = {
  id?: number | { not: number }
  moduleId?: number
  title?: { contains: string; mode: 'insensitive' }
  content?: { contains: string; mode: 'insensitive' }
  kind?: 'VIDEO' | 'ARTICLE' | 'QUIZ' | 'LIVE'
  status?: 'PRIVATE' | 'PUBLISHED' | 'GLOBAL_PUBLIC'
  OR?: Array<{
    title?: { contains: string; mode: 'insensitive' }
    content?: { contains: string; mode: 'insensitive' }
  }>
}

export type LessonOrderByInput = {
  id?: 'asc' | 'desc'
  title?: 'asc' | 'desc'
  order?: 'asc' | 'desc'
  createdAt?: 'asc' | 'desc'
}

export type LessonWithRelations = {
  id: number
  moduleId: number
  title: string
  kind: 'VIDEO' | 'ARTICLE' | 'QUIZ' | 'LIVE'
  content: string | null
  videoUrl: string | null
  durationSec: number | null
  order: number
  createdAt: Date
  updatedAt: Date
  status: 'PRIVATE' | 'PUBLISHED' | 'GLOBAL_PUBLIC'
  module: {
    id: number
    title: string
    course: {
      id: number
      title: string
      slug: string
    }
  }
  resources: Array<{
    id: number
    url: string
    kind: 'AUDIO' | 'VIDEO' | 'IMAGE' | 'PDF' | 'OTHER'
    mimeType: string | null
    sizeByte: number | null
    caption: string | null
    createdAt: Date
  }>
  liveSession: {
    id: number
    title: string
    scheduledAt: Date
    endedAt: Date | null
    mode: 'MODE2D' | 'MODE3D'
    roomKey: string
  } | null
  quiz: {
    id: number
    title: string
    _count: {
      items: number
    }
  } | null
  _count: {
    notes: number
    resources: number
  }
}

// Exported Zod types
export type CreateLessonType = z.infer<typeof CreateLessonSchema>
export type Lesson = z.infer<typeof LessonSchema>
export type UpdateLessonType = z.infer<typeof UpdateLessonSchema>
export type QueryLessonType = z.infer<typeof QueryLessonSchema>
export type LessonResponseType = z.infer<typeof LessonResponseSchema>
export type LessonListItemType = z.infer<typeof LessonListItemSchema>
