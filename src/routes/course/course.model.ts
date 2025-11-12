import { z } from 'zod'

// Course Schema
export const CourseSchema = z.object({
  id: z.number().int().positive(),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(255, 'Slug must be less than 255 characters')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase, alphanumeric with hyphens'),
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  subtitle: z.string().max(500, 'Subtitle must be less than 500 characters').nullable().optional(),
  description: z.string().nullable().optional(),
  level: z.enum(['N5', 'N4', 'N3', 'N2', 'N1']),
  courseType: z.enum(['VIDEO_QUIZ', 'VIDEO_QUIZ_LIVE', 'LIVE_ONLY']).default('VIDEO_QUIZ'),
  thumbnailUrl: z.string().url('Invalid thumbnail URL').nullable().optional(),
  price: z.number().int().min(0, 'Price must be non-negative').default(0),
  status: z.enum(['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.number().int().positive(),
  lecturerIds: z.array(z.number().int().positive()),
})

// Create Course Schema
export const CreateCourseSchema = CourseSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  status: true,
})

// Update Course Schema
export const UpdateCourseSchema = CourseSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
}).partial()

export const UpdateCourseStatusSchemaForAdmin = CourseSchema.omit({
  id: true,
  slug: true,
  title: true,
  subtitle: true,
  description: true,
  level: true,
  courseType: true,
  thumbnailUrl: true,
  price: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  lecturerIds: true,
})
  .partial()
  .extend({
    status: z.enum(['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED']),
  })

// Query Course Schema
export const QueryCourseSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  search: z.string().optional(),
  level: z.enum(['N5', 'N4', 'N3', 'N2', 'N1']).optional(),
  courseType: z.enum(['VIDEO_QUIZ', 'VIDEO_QUIZ_LIVE', 'LIVE_ONLY']).optional(),
  status: z.enum(['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED']).optional(),
  sortBy: z.enum(['createdAt', 'title', 'price', 'level']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
})

// Course Response Schema (with relations)
export const CourseResponseSchema = CourseSchema.extend({
  lecturer: z
    .object({
      id: z.number(),
      name: z.string(),
      email: z.string(),
    })
    .nullable(),
  modules: z.array(
    z.object({
      id: z.number(),
      title: z.string(),
      order: z.number(),
      _count: z.object({
        lessons: z.number(),
      }),
    }),
  ),
  _count: z.object({
    modules: z.number(),
    enrollments: z.number(),
    reviews: z.number(),
  }),
  reviews: z
    .array(
      z.object({
        id: z.number(),
        rating: z.number(),
        comment: z.string().nullable(),
        user: z.object({
          id: z.number(),
          name: z.string(),
        }),
        createdAt: z.date(),
      }),
    )
    .optional(),
})

// Course List Item Schema (simplified for list views)
export const CourseListItemSchema = z.object({
  id: z.number(),
  slug: z.string(),
  title: z.string(),
  subtitle: z.string().nullable(),
  level: z.enum(['N5', 'N4', 'N3', 'N2', 'N1']),
  courseType: z.enum(['VIDEO_QUIZ', 'VIDEO_QUIZ_LIVE', 'LIVE_ONLY']),
  thumbnailUrl: z.string().nullable(),
  price: z.number(),
  status: z.enum(['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED']),
  createdAt: z.date(),
  lecturer: z
    .object({
      id: z.number(),
      name: z.string(),
    })
    .nullable(),
  _count: z.object({
    modules: z.number(),
    enrollments: z.number(),
  }),
})

// Published Course List Item Schema (includes enrollment status)
export const PublishedCourseListItemSchema = CourseListItemSchema.extend({
  isEnrolled: z.boolean(),
  lecturers: z.array(
    z.object({
      id: z.number(),
      userId: z.number(),
      name: z.string().nullable(),
      username: z.string().nullable(),
      avatar: z.string().nullable(),
    }),
  ),
})

// Repository input/output types
export type CourseCreateInput = {
  slug: string
  title: string
  subtitle?: string | null
  description?: string | null
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1'
  courseType?: 'VIDEO_QUIZ' | 'VIDEO_QUIZ_LIVE' | 'LIVE_ONLY'
  thumbnailUrl?: string | null
  price?: number
  status?: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'ARCHIVED'
  lecturerIds: number[] | []
  createdBy: number
}

export type CourseUpdateInput = {
  slug?: string
  title?: string
  subtitle?: string | null
  description?: string | null
  level?: 'N5' | 'N4' | 'N3' | 'N2' | 'N1'
  courseType?: 'VIDEO_QUIZ' | 'VIDEO_QUIZ_LIVE' | 'LIVE_ONLY'
  thumbnailUrl?: string | null
  price?: number
  status?: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'ARCHIVED'
  lecturer?:
    | {
        connect: {
          id: number
        }
      }
    | {
        disconnect: true
      }
    | null
}

export type CourseWhereUniqueInput = {
  id?: number
  slug?: string
}

export type CourseWhereInput = {
  id?: number | { not: number }
  slug?: string
  title?: { contains: string; mode: 'insensitive' }
  description?: { contains: string; mode: 'insensitive' }
  level?: 'N5' | 'N4' | 'N3' | 'N2' | 'N1'
  courseType?: 'VIDEO_QUIZ' | 'VIDEO_QUIZ_LIVE' | 'LIVE_ONLY'
  status?: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'ARCHIVED'
  lecturerId?: number | null
  OR?: Array<{
    title?: { contains: string; mode: 'insensitive' }
    description?: { contains: string; mode: 'insensitive' }
  }>
}

export type CourseOrderByInput = {
  id?: 'asc' | 'desc'
  title?: 'asc' | 'desc'
  createdAt?: 'asc' | 'desc'
  price?: 'asc' | 'desc'
  level?: 'asc' | 'desc'
}

export type CourseWithRelations = {
  id: number
  slug: string
  title: string
  subtitle: string | null
  description: string | null
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1'
  courseType: 'VIDEO_QUIZ' | 'VIDEO_QUIZ_LIVE' | 'LIVE_ONLY'
  thumbnailUrl: string | null
  price: number
  status: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'ARCHIVED'
  createdAt: Date
  updatedAt: Date
  lecturerIds: number[]
  lecturers?: Array<{
    id: number
    name: string
    email: string
    username: string | null
    avatar: string | null
  } | null>[]
  modules: Array<{
    id: number
    title: string
    order: number
    _count: {
      lessons: number
    }
  }>
  _count: {
    modules: number
    enrollments: number
    reviews: number
  }
  reviews?: Array<{
    id: number
    rating: number
    comment: string | null
    user: {
      id: number
      name: string
    }
    createdAt: Date
  }>
  isEnrolled?: boolean
}

export type PublishedCourseListItem = {
  id: number
  slug: string
  title: string
  subtitle: string | null
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1'
  courseType: 'VIDEO_QUIZ' | 'VIDEO_QUIZ_LIVE' | 'LIVE_ONLY'
  thumbnailUrl: string | null
  price: number
  status: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'ARCHIVED'
  createdAt: Date
  lecturers: Array<{
    id: number
    userId: number
    name: string | null
    username: string | null
    avatar: string | null
  }>
  _count: {
    modules: number
    enrollments: number
  }
  isEnrolled: boolean
}

// Exported Zod types
export type CreateCourseType = z.infer<typeof CreateCourseSchema>
export type Course = z.infer<typeof CourseSchema>
export type UpdateCourseType = z.infer<typeof UpdateCourseSchema>
export type QueryCourseType = z.infer<typeof QueryCourseSchema>
export type CourseResponseType = z.infer<typeof CourseResponseSchema>
export type CourseListItemType = z.infer<typeof CourseListItemSchema>
export type PublishedCourseListItemType = z.infer<typeof PublishedCourseListItemSchema>
export type UpdateCourseStatusTypeForAdmin = z.infer<typeof UpdateCourseStatusSchemaForAdmin>
