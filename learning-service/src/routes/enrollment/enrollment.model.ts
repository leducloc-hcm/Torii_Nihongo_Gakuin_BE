import { z } from 'zod'

// Enrollment Schema
export const EnrollmentSchema = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  courseId: z.number().int().positive(),
  courseType: z.enum(['VIDEO_QUIZ', 'VIDEO_QUIZ_LIVE', 'LIVE_ONLY']),
  createdAt: z.coerce.date(),
  expiresAt: z.coerce.date().nullable().optional(),
})

// Create Enrollment Schema
export const CreateEnrollmentSchema = EnrollmentSchema.omit({
  id: true,
  createdAt: true,
}).extend({
  userId: z.number().int().positive().optional(), // Will be set from auth context
})

// Update Enrollment Schema
export const UpdateEnrollmentSchema = z.object({
  expiresAt: z.coerce.date().nullable().optional(),
})

// Query Enrollment Schema
export const QueryEnrollmentSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  userId: z.coerce.number().int().positive().optional(),
  courseId: z.coerce.number().int().positive().optional(),
  courseType: z.enum(['VIDEO_QUIZ', 'VIDEO_QUIZ_LIVE', 'LIVE_ONLY']).optional(),
  expired: z.coerce.boolean().optional(),
  sortBy: z.enum(['createdAt', 'expiresAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
})

// Enrollment Response Schema (with relations)
export const EnrollmentResponseSchema = EnrollmentSchema.extend({
  user: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    customerProfile: z
      .object({
        avatar: z.string().nullable(),
        username: z.string().nullable(),
      })
      .nullable(),
  }),
  course: z.object({
    id: z.number(),
    slug: z.string(),
    title: z.string(),
    subtitle: z.string().nullable(),
    level: z.enum(['N5', 'N4', 'N3', 'N2', 'N1']),
    courseType: z.enum(['VIDEO_QUIZ', 'VIDEO_QUIZ_LIVE', 'LIVE_ONLY']),
    thumbnailUrl: z.string().nullable(),
    price: z.number(),
    status: z.enum(['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED']),
    _count: z
      .object({
        modules: z.number(),
        lessons: z.number().optional(),
      })
      .optional(),
  }),
})

// Enrollment List Item Schema (simplified for list views)
export const EnrollmentListItemSchema = z.object({
  id: z.number(),
  userId: z.number(),
  courseId: z.number(),
  courseType: z.enum(['VIDEO_QUIZ', 'VIDEO_QUIZ_LIVE', 'LIVE_ONLY']),
  createdAt: z.date(),
  expiresAt: z.date().nullable(),
  user: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    customerProfile: z
      .object({
        avatar: z.string().nullable(),
        username: z.string().nullable(),
      })
      .nullable(),
  }),
  course: z.object({
    id: z.number(),
    slug: z.string(),
    title: z.string(),
    level: z.enum(['N5', 'N4', 'N3', 'N2', 'N1']),
    thumbnailUrl: z.string().nullable(),
    price: z.number(),
  }),
})

// My Enrollments Response Schema (for current user)
export const MyEnrollmentSchema = z.object({
  id: z.number(),
  courseId: z.number(),
  courseType: z.enum(['VIDEO_QUIZ', 'VIDEO_QUIZ_LIVE', 'LIVE_ONLY']),
  createdAt: z.date(),
  expiresAt: z.date().nullable(),
  course: z.object({
    id: z.number(),
    slug: z.string(),
    title: z.string(),
    subtitle: z.string().nullable(),
    description: z.string().nullable(),
    level: z.enum(['N5', 'N4', 'N3', 'N2', 'N1']),
    courseType: z.enum(['VIDEO_QUIZ', 'VIDEO_QUIZ_LIVE', 'LIVE_ONLY']),
    thumbnailUrl: z.string().nullable(),
    price: z.number(),
    status: z.enum(['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED']),
    _count: z.object({
      modules: z.number(),
    }),
  }),
})

// Repository input/output types
export type EnrollmentCreateInput = {
  userId: number
  courseId: number
  courseType: 'VIDEO_QUIZ' | 'VIDEO_QUIZ_LIVE' | 'LIVE_ONLY'
  expiresAt?: Date | null
}

export type EnrollmentUpdateInput = {
  expiresAt?: Date | null
}

export type EnrollmentWhereUniqueInput = {
  id?: number
  userId_courseId?: {
    userId: number
    courseId: number
  }
}

export type EnrollmentWhereInput = {
  id?: number
  userId?: number
  courseId?: number
  courseType?: 'VIDEO_QUIZ' | 'VIDEO_QUIZ_LIVE' | 'LIVE_ONLY'
  expiresAt?: {
    lt?: Date
    gt?: Date
    lte?: Date
    gte?: Date
  } | null
  AND?: EnrollmentWhereInput[]
  OR?: EnrollmentWhereInput[]
}

export type EnrollmentOrderByInput = {
  id?: 'asc' | 'desc'
  createdAt?: 'asc' | 'desc'
  expiresAt?: 'asc' | 'desc'
}

export type EnrollmentWithRelations = {
  id: number
  userId: number
  courseId: number
  courseType: 'VIDEO_QUIZ' | 'VIDEO_QUIZ_LIVE' | 'LIVE_ONLY'
  createdAt: Date
  expiresAt: Date | null
  user: {
    id: number
    name: string
    email: string
    customerProfile: {
      avatar: string | null
      username: string | null
    } | null
  }
  course: {
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
    _count?: {
      modules: number
      lessons?: number
    }
  }
}

export type MyEnrollmentType = {
  id: number
  courseId: number
  courseType: 'VIDEO_QUIZ' | 'VIDEO_QUIZ_LIVE' | 'LIVE_ONLY'
  createdAt: Date
  expiresAt: Date | null
  course: {
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
    _count: {
      modules: number
    }
  }
}

// Exported Zod types
export type CreateEnrollmentType = z.infer<typeof CreateEnrollmentSchema>
export type Enrollment = z.infer<typeof EnrollmentSchema>
export type UpdateEnrollmentType = z.infer<typeof UpdateEnrollmentSchema>
export type QueryEnrollmentType = z.infer<typeof QueryEnrollmentSchema>
export type EnrollmentResponseType = z.infer<typeof EnrollmentResponseSchema>
export type EnrollmentListItemType = z.infer<typeof EnrollmentListItemSchema>
export type MyEnrollmentSchemaType = z.infer<typeof MyEnrollmentSchema>
