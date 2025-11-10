import { z } from 'zod'

// Blog Schema
export const BlogSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  content: z.string().min(1, 'Content is required'),
  image: z.string().url('Invalid image URL').nullable().optional(),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(255, 'Slug must be less than 255 characters')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase, alphanumeric with hyphens'),
  date: z.coerce.date(),
  authorId: z.number().int().positive(),
})

// Create Blog Schema
export const CreateBlogSchema = BlogSchema.omit({ id: true, date: true, authorId: true }).extend({
  tagIds: z.array(z.number().int().positive()).optional().default([]),
})

// Update Blog Schema
export const UpdateBlogSchema = BlogSchema.omit({ id: true, date: true, authorId: true })
  .partial()
  .extend({
    tagIds: z.array(z.number().int().positive()).optional(),
  })

// Query Blog Schema
export const QueryBlogSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  search: z.string().optional(),
  tagId: z.coerce.number().int().positive().optional(),
  authorId: z.coerce.number().int().positive().optional(),
  sortBy: z.enum(['date', 'title']).optional().default('date'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
})

// Blog Response Schema (with relations)
export const BlogResponseSchema = BlogSchema.extend({
  author: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
  }),
  tags: z.array(
    z.object({
      tag: z.object({
        id: z.number(),
        name: z.string(),
        slug: z.string(),
        description: z.string().nullable(),
      }),
    }),
  ),
})

// Blog List Item Schema (simplified for list views)
export const BlogListItemSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  image: z.string().nullable(),
  date: z.date(),
  author: z.object({
    id: z.number(),
    name: z.string(),
  }),
  tags: z.array(
    z.object({
      tag: z.object({
        id: z.number(),
        name: z.string(),
        slug: z.string(),
      }),
    }),
  ),
})

// Repository input/output types
export type BlogCreateInput = {
  title: string
  content: string
  image?: string | null
  slug: string
  author: {
    connect: {
      id: number
    }
  }
  tags?: {
    create: Array<{
      tag: {
        connect: {
          id: number
        }
      }
    }>
  }
}

export type BlogUpdateInput = {
  title?: string
  content?: string
  image?: string | null
  slug?: string
  tags?: {
    create: Array<{
      tag: {
        connect: {
          id: number
        }
      }
    }>
  }
}

export type BlogWhereUniqueInput = {
  id?: number
  slug?: string
}

export type BlogWhereInput = {
  id?: number | { not: number }
  slug?: string
  title?: { contains: string; mode: 'insensitive' }
  content?: { contains: string; mode: 'insensitive' }
  authorId?: number
  tags?: {
    some: {
      tagId: number
    }
  }
  OR?: Array<{
    title?: { contains: string; mode: 'insensitive' }
    content?: { contains: string; mode: 'insensitive' }
  }>
}

export type BlogOrderByInput = {
  id?: 'asc' | 'desc'
  title?: 'asc' | 'desc'
  date?: 'asc' | 'desc'
  slug?: 'asc' | 'desc'
}

export type BlogWithRelations = {
  id: number
  title: string
  content: string
  image: string | null
  slug: string
  date: Date
  authorId: number
  author: {
    id: number
    name: string
    email: string
  }
  tags: Array<{
    tag: {
      id: number
      name: string
      slug: string
      description: string | null
    }
  }>
}

// Exported Zod types
export type CreateBlogType = z.infer<typeof CreateBlogSchema>
export type Blog = z.infer<typeof BlogSchema>
export type UpdateBlogType = z.infer<typeof UpdateBlogSchema>
export type QueryBlogType = z.infer<typeof QueryBlogSchema>
export type BlogResponseType = z.infer<typeof BlogResponseSchema>
export type BlogListItemType = z.infer<typeof BlogListItemSchema>
