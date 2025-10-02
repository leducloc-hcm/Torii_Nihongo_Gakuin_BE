import { z } from 'zod'

// Tag Schema
export const TagSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1, 'Tag name is required').max(100, 'Tag name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').nullable().optional(),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100, 'Slug must be less than 100 characters')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase, alphanumeric with hyphens'),
})

// Create Tag Schema
export const CreateTagSchema = TagSchema.omit({ id: true })

// Update Tag Schema
export const UpdateTagSchema = TagSchema.omit({ id: true }).partial()

// Query Tag Schema
export const QueryTagSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  search: z.string().optional(),
})

// Tag Response Schema
export const TagResponseSchema = TagSchema.extend({
  _count: z
    .object({
      blogs: z.number().int().nonnegative(),
    })
    .optional(),
})

// Repository input/output types
export const TagCreateInputSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase, alphanumeric with hyphens'),
})

export const TagUpdateInputSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase, alphanumeric with hyphens')
    .optional(),
})

export const TagWhereUniqueInputSchema = z.object({
  id: z.number().int().positive().optional(),
  slug: z.string().min(1).max(100).optional(),
})

export const TagWhereInputSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.union([z.number().int().positive(), z.object({ not: z.number().int().positive() })]).optional(),
    slug: z
      .union([z.string().min(1).max(100), z.object({ contains: z.string(), mode: z.literal('insensitive') })])
      .optional(),
    name: z.object({ contains: z.string(), mode: z.literal('insensitive') }).optional(),
    description: z.object({ contains: z.string(), mode: z.literal('insensitive') }).optional(),
    OR: z.array(TagWhereInputSchema).optional(),
  }),
)

export const TagOrderByInputSchema = z.object({
  id: z.enum(['asc', 'desc']).optional(),
  name: z.enum(['asc', 'desc']).optional(),
  slug: z.enum(['asc', 'desc']).optional(),
  date: z.enum(['asc', 'desc']).optional(),
})

export type CreateTagType = z.infer<typeof CreateTagSchema>
export type Tag = z.infer<typeof TagSchema>
export type UpdateTagType = z.infer<typeof UpdateTagSchema>
export type QueryTagType = z.infer<typeof QueryTagSchema>
export type TagResponseType = z.infer<typeof TagResponseSchema>

export type TagCreateInputType = z.infer<typeof TagCreateInputSchema>
export type TagUpdateInputType = z.infer<typeof TagUpdateInputSchema>
export type TagWhereUniqueInputType = z.infer<typeof TagWhereUniqueInputSchema>
export type TagWhereInputType = z.infer<typeof TagWhereInputSchema>
export type TagOrderByInputType = z.infer<typeof TagOrderByInputSchema>
