import { createZodDto } from 'nestjs-zod'
import {
  CreateQuestionSchema,
  UpdateQuestionSchema,
  QueryQuestionSchema,
  QuestionResponseSchema,
  QuestionListItemSchema,
  BulkCreateQuestionsSchema,
  QuestionStatsSchema,
} from './question.model'

export class CreateQuestionDTO extends createZodDto(CreateQuestionSchema) {}
export class UpdateQuestionDTO extends createZodDto(UpdateQuestionSchema) {}
export class QueryQuestionDTO extends createZodDto(QueryQuestionSchema) {}
export class QuestionResponseDTO extends createZodDto(QuestionResponseSchema) {}
export class QuestionListItemDTO extends createZodDto(QuestionListItemSchema) {}
export class BulkCreateQuestionsDTO extends createZodDto(BulkCreateQuestionsSchema) {}
export class QuestionStatsDTO extends createZodDto(QuestionStatsSchema) {}
