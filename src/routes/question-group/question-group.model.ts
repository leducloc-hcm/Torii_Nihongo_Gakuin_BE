import { z } from 'zod'
export const QuestionGroupTypeEnum = z.enum([
  'VOCAB',
  'KANJI',
  'GRAMMAR',
  'CLOZE',
  'READING_SHORT',
  'READING_MEDIUM',
  'READING_LONG',
  'LISTENING',
])

export const QuestionGroupSchema = z.object({
  id: z.number().int().positive(),
  type: QuestionGroupTypeEnum,
  title: z.string().min(1, 'Group title is required').max(500, 'Group title too long').optional().nullable(),
  passage: z.string().max(5000, 'Passage too long').optional().nullable(),
  mediaId: z.number().int().positive().optional().nullable(),
  order: z.number().int().min(0).optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
  createdAt: z.date(),
})

export const CreateQuestionGroupSchema = QuestionGroupSchema.omit({ id: true, createdAt: true }).extend({
  questions: z.array(z.number().int().positive()).optional().default([]),
})

export const UpdateQuestionGroupSchema = QuestionGroupSchema.omit({ id: true, createdAt: true })
  .partial()
  .extend({
    questions: z.array(z.number().int().positive()).optional(),
  })

export const QueryQuestionGroupSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  type: QuestionGroupTypeEnum.optional(),
  hasMedia: z.coerce.boolean().optional(),
  hasPassage: z.coerce.boolean().optional(),
  keyword: z.string().optional(),
  sortBy: z.enum(['createdAt', 'type', 'title', 'order']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
})

export const QuestionGroupResponseSchema = QuestionGroupSchema.extend({
  questions: z.array(
    z.object({
      id: z.number(),
      stem: z.string(),
      type: z.string(),
      level: z.string(),
      difficulty: z.string(),
    }),
  ),
  media: z
    .object({
      id: z.number(),
      url: z.string(),
      kind: z.string(),
      caption: z.string().nullable(),
    })
    .optional()
    .nullable(),
  questionsCount: z.number().int(),
})

export const QuestionGroupListItemSchema = QuestionGroupSchema.extend({
  questionsCount: z.number().int(),
  hasMedia: z.boolean(),
  hasPassage: z.boolean(),
})

export const BulkCreateQuestionGroupsSchema = z.object({
  groups: z
    .array(CreateQuestionGroupSchema)
    .min(1, 'At least 1 question group required')
    .max(20, 'Maximum 20 question groups per bulk operation'),
})

export const AddQuestionsToGroupSchema = z.object({
  questionIds: z
    .array(z.number().int().positive())
    .min(1, 'At least 1 question required')
    .max(50, 'Maximum 50 questions per operation'),
})

export const RemoveQuestionsFromGroupSchema = z.object({
  questionIds: z.array(z.number().int().positive()).min(1, 'At least 1 question required'),
})

export const QuestionGroupStatsSchema = z.object({
  totalGroups: z.number().int(),
  byType: z.record(z.number().int()),
  withMedia: z.number().int(),
  withoutMedia: z.number().int(),
  withPassage: z.number().int(),
  withoutPassage: z.number().int(),
  averageQuestionsPerGroup: z.number(),
})

export const CloneQuestionGroupSchema = z.object({
  type: QuestionGroupTypeEnum.optional(),
  title: z.string().min(1).max(500).optional().nullable(),
  passage: z.string().max(5000).optional().nullable(),
  mediaId: z.number().int().positive().optional().nullable(),
  order: z.number().int().min(0).optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
  questionIds: z.array(z.number().int().positive()).optional(),
})

export type QuestionGroup = z.infer<typeof QuestionGroupSchema>
export type QuestionGroupWithQuestions = QuestionGroup & {
  questions: Array<{
    id: number
    stem: string
    type: string
    level: string
    difficulty: string
  }>
  media?: {
    id: number
    url: string
    kind: string
    caption?: string | null
  } | null
  questionsCount: number
}

// Note: These types will be available after Prisma client regeneration
export type QuestionGroupCreateInput = any // Prisma.QuestionGroupCreateInput
export type QuestionGroupUpdateInput = any // Prisma.QuestionGroupUpdateInput
export type QuestionGroupWhereUniqueInput = any // Prisma.QuestionGroupWhereUniqueInput
export type QuestionGroupWhereInput = any // Prisma.QuestionGroupWhereInput
export type QuestionGroupOrderByInput = any // Prisma.QuestionGroupOrderByWithRelationInput
