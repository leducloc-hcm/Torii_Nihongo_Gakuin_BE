import { z } from 'zod'

export const JLPTLevelEnum = z.enum(['N5', 'N4', 'N3', 'N2', 'N1'])
export const QuestionTypeEnum = z.enum(['VOCAB', 'KANJI', 'GRAMMAR', 'SYNONYM', 'ORDER', 'READING', 'LISTENING'])
export const DifficultyEnum = z.enum(['EASY', 'MEDIUM', 'HARD'])
export const ReadingLengthEnum = z.enum(['SHORT', 'MEDIUM', 'LONG'])

export const OptionSchema = z.object({
  id: z.number().int().positive().optional(),
  content: z.string().min(1, 'Option content is required').max(1000, 'Option content too long'),
  isCorrect: z.boolean().default(false),
  order: z.number().int().min(0).default(0),
})

export const QuestionSchema = z.object({
  id: z.number().int().positive(),
  type: QuestionTypeEnum,
  level: JLPTLevelEnum,
  difficulty: DifficultyEnum,
  stem: z.string().min(1, 'Question stem is required').max(2000, 'Question stem too long'),
  passage: z.string().max(5000, 'Passage too long').optional().nullable(),
  mediaId: z.number().int().positive().optional().nullable(),
  explanation: z.string().max(2000, 'Explanation too long').optional().nullable(),
  readingLength: ReadingLengthEnum.optional().nullable(),
  createdAt: z.date(),
})

export const CreateQuestionSchema = QuestionSchema.omit({ id: true, createdAt: true })

export const CreateQuestionWithOptionsSchema = QuestionSchema.omit({ id: true, createdAt: true })
  .extend({
    options: z
      .array(OptionSchema.omit({ id: true }))
      .min(2, 'At least 2 options required')
      .max(6, 'Maximum 6 options allowed'),
  })
  .refine(
    (data) => {
      const correctOptions = data.options.filter((opt) => opt.isCorrect).length
      return correctOptions >= 1
    },
    {
      message: 'At least one option must be correct',
      path: ['options'],
    },
  )

export const UpdateQuestionSchema = QuestionSchema.omit({ id: true, createdAt: true }).partial()

export const UpdateQuestionWithOptionsSchema = QuestionSchema.omit({ id: true, createdAt: true })
  .partial()
  .extend({
    options: z.array(OptionSchema).min(2, 'At least 2 options required').max(6, 'Maximum 6 options allowed').optional(),
  })
  .refine(
    (data) => {
      if (data.options) {
        const correctOptions = data.options.filter((opt) => opt.isCorrect).length
        return correctOptions >= 1
      }
      return true
    },
    {
      message: 'At least one option must be correct',
      path: ['options'],
    },
  )

export const QueryQuestionSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  type: QuestionTypeEnum.optional(),
  level: JLPTLevelEnum.optional(),
  difficulty: DifficultyEnum.optional(),
  readingLength: ReadingLengthEnum.optional().nullable(),
  keyword: z.string().optional(),
  hasMedia: z.coerce.boolean().optional(),
  sortBy: z.enum(['createdAt', 'level', 'difficulty', 'type']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
})

export const QuestionResponseSchema = QuestionSchema.extend({
  options: z.array(OptionSchema),
  media: z
    .object({
      id: z.number(),
      url: z.string(),
      kind: z.string(),
      caption: z.string().nullable(),
    })
    .optional()
    .nullable(),
})

export const QuestionListItemSchema = QuestionSchema.extend({
  optionsCount: z.number().int(),
  correctOptionsCount: z.number().int(),
  hasMedia: z.boolean(),
})

export const BulkCreateQuestionsSchema = z.object({
  questions: z
    .array(CreateQuestionWithOptionsSchema)
    .min(1, 'At least 1 question required')
    .max(50, 'Maximum 50 questions per bulk operation'),
})

export const QuestionStatsSchema = z.object({
  totalQuestions: z.number().int(),
  byType: z.record(z.number().int()),
  byLevel: z.record(z.number().int()),
  byDifficulty: z.record(z.number().int()),
  withMedia: z.number().int(),
  withoutMedia: z.number().int(),
})

export const CloneQuestionSchema = z
  .object({
    type: QuestionTypeEnum.optional(),
    level: JLPTLevelEnum.optional(),
    difficulty: DifficultyEnum.optional(),
    stem: z.string().min(1).max(2000).optional(),
    passage: z.string().max(5000).optional().nullable(),
    explanation: z.string().max(2000).optional().nullable(),
    readingLength: ReadingLengthEnum.optional().nullable(),
    mediaId: z.number().int().positive().optional().nullable(),
    options: z
      .array(
        z.object({
          content: z.string().min(1).max(1000),
          isCorrect: z.boolean().default(false),
          order: z.number().int().min(0).default(0),
          mediaId: z.number().int().positive().optional().nullable(),
        }),
      )
      .min(2, 'At least 2 options required')
      .max(6, 'Maximum 6 options allowed')
      .optional(),
  })
  .refine(
    (data) => {
      if (data.options) {
        const correctOptions = data.options.filter((opt) => opt.isCorrect).length
        return correctOptions >= 1
      }
      return true
    },
    {
      message: 'At least one option must be correct when options are provided',
      path: ['options'],
    },
  )

export type Question = z.infer<typeof QuestionSchema>
export type QuestionWithOptions = Question & {
  options: Array<{
    id: number
    content: string
    isCorrect: boolean
    order: number
  }>
  media?: {
    id: number
    url: string
    kind: string
    caption?: string | null
  } | null
}

// Import custom types instead of Prisma types
export type {
  QuestionCreateData as QuestionCreateInput,
  QuestionUpdateData as QuestionUpdateInput,
  QuestionWhereUniqueInput,
  QuestionWhereInput,
  QuestionOrderByInput,
  OptionCreateData as OptionCreateInput,
  OptionUpdateData as OptionUpdateInput,
} from 'src/shared/types/question.types'
