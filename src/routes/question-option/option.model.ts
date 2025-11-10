import { z } from 'zod'

export const OptionSchema = z.object({
  id: z.number().int().positive(),
  questionId: z.number().int().positive(),
  content: z.string().min(1, 'Option content is required').max(1000, 'Option content too long').nullable(),
  isCorrect: z.boolean().default(false),
  order: z.number().int().min(0).default(0),
})

export const CreateOptionSchema = OptionSchema.omit({ id: true }).extend({
  // questionId will be provided via URL parameter
  mediaId: z.number().int().positive().optional(),
})

export const UpdateOptionSchema = OptionSchema.omit({ id: true, questionId: true })
  .extend({
    mediaId: z.number().int().positive().optional(),
  })
  .partial()

export const QueryOptionSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  isCorrect: z.coerce.boolean().optional(),
  sortBy: z.enum(['order', 'content', 'isCorrect']).optional().default('order'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
})

export const OptionResponseSchema = OptionSchema.extend({
  question: z
    .object({
      id: z.number(),
      stem: z.string(),
      type: z.string(),
      level: z.string(),
    })
    .optional(),
})

export const OptionListItemSchema = OptionSchema

export const BulkCreateOptionsSchema = z.object({
  options: z
    .array(CreateOptionSchema.omit({ questionId: true }))
    .min(1, 'At least 1 option required')
    .max(10, 'Maximum 10 options per bulk operation'),
})

export const ReorderOptionsSchema = z.object({
  options: z
    .array(
      z.object({
        id: z.number().int().positive(),
        order: z.number().int().min(0),
      }),
    )
    .min(1, 'At least 1 option required'),
})

export type Option = z.infer<typeof OptionSchema>
export type OptionWithQuestion = Option & {
  question?: {
    id: number
    stem: string
    type: string
    level: string
  }
}

// Import custom types instead of Prisma types
export type {
  OptionCreateData as OptionCreateInput,
  OptionUpdateData as OptionUpdateInput,
  OptionWhereUniqueInput,
  OptionWhereInput,
} from 'src/shared/types/question.types'

export type OptionOrderByInput = {
  id?: 'asc' | 'desc'
  questionId?: 'asc' | 'desc'
  order?: 'asc' | 'desc'
}
