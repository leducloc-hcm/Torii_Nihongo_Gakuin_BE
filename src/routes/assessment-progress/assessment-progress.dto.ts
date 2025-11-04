import { createZodDto } from 'nestjs-zod'
import {
  CreateAssessmentProgressSchema,
  UpdateAssessmentProgressSchema,
  QueryAssessmentProgressSchema,
  SaveAnswerProgressSchema,
  UpdateAnswerProgressSchema,
  SubmitAssessmentSchema,
  StartAssessmentSchema,
  AutoSaveProgressSchema,
} from './assessment-progress.model'

// ============= PROGRESS DTOs =============

export class CreateAssessmentProgressDTO extends createZodDto(CreateAssessmentProgressSchema) {}
export class UpdateAssessmentProgressDTO extends createZodDto(UpdateAssessmentProgressSchema) {}
export class QueryAssessmentProgressDTO extends createZodDto(QueryAssessmentProgressSchema) {}

// ============= ANSWER DTOs =============

export class SaveAnswerProgressDTO extends createZodDto(SaveAnswerProgressSchema) {}
export class UpdateAnswerProgressDTO extends createZodDto(UpdateAnswerProgressSchema) {}

// ============= ACTION DTOs =============

export class SubmitAssessmentDTO extends createZodDto(SubmitAssessmentSchema) {}
export class StartAssessmentDTO extends createZodDto(StartAssessmentSchema) {}
export class AutoSaveProgressDTO extends createZodDto(AutoSaveProgressSchema) {}
