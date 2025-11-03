import { createZodDto } from 'nestjs-zod'
import {
  CreateQuestionSchema,
  CreateQuestionWithOptionsSchema,
  UpdateQuestionSchema,
  UpdateQuestionWithOptionsSchema,
  QueryQuestionSchema,
  QuestionResponseSchema,
  QuestionListItemSchema,
  BulkCreateQuestionsSchema,
  QuestionStatsSchema,
} from './question.model'

export class CreateQuestionDTO extends createZodDto(CreateQuestionSchema) {}
export class CreateQuestionWithOptionsDTO extends createZodDto(CreateQuestionWithOptionsSchema) {}
export class UpdateQuestionDTO extends createZodDto(UpdateQuestionSchema) {}
export class UpdateQuestionWithOptionsDTO extends createZodDto(UpdateQuestionWithOptionsSchema) {}
export class QueryQuestionDTO extends createZodDto(QueryQuestionSchema) {}
export class QuestionResponseDTO extends createZodDto(QuestionResponseSchema) {}
export class QuestionListItemDTO extends createZodDto(QuestionListItemSchema) {}
export class BulkCreateQuestionsDTO extends createZodDto(BulkCreateQuestionsSchema) {}
export class QuestionStatsDTO extends createZodDto(QuestionStatsSchema) {}

// Versioning DTOs
import { CloneQuestionSchema } from './question.model'
export class CloneQuestionDTO extends createZodDto(CloneQuestionSchema) {}
