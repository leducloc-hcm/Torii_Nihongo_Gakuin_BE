import { createZodDto } from 'nestjs-zod'
import {
  CreateQuestionGroupSchema,
  UpdateQuestionGroupSchema,
  QueryQuestionGroupSchema,
  QuestionGroupResponseSchema,
  QuestionGroupListItemSchema,
  BulkCreateQuestionGroupsSchema,
  AddQuestionsToGroupSchema,
  RemoveQuestionsFromGroupSchema,
  QuestionGroupStatsSchema,
} from './question-group.model'

export class CreateQuestionGroupDTO extends createZodDto(CreateQuestionGroupSchema) {}
export class UpdateQuestionGroupDTO extends createZodDto(UpdateQuestionGroupSchema) {}
export class QueryQuestionGroupDTO extends createZodDto(QueryQuestionGroupSchema) {}
export class QuestionGroupResponseDTO extends createZodDto(QuestionGroupResponseSchema) {}
export class QuestionGroupListItemDTO extends createZodDto(QuestionGroupListItemSchema) {}
export class BulkCreateQuestionGroupsDTO extends createZodDto(BulkCreateQuestionGroupsSchema) {}
export class AddQuestionsToGroupDTO extends createZodDto(AddQuestionsToGroupSchema) {}
export class RemoveQuestionsFromGroupDTO extends createZodDto(RemoveQuestionsFromGroupSchema) {}
export class QuestionGroupStatsDTO extends createZodDto(QuestionGroupStatsSchema) {}

// Versioning DTOs
import { CloneQuestionGroupSchema } from './question-group.model'
export class CloneQuestionGroupDTO extends createZodDto(CloneQuestionGroupSchema) {}
