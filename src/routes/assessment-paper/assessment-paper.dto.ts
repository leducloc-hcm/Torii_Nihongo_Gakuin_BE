import { createZodDto } from 'nestjs-zod'
import {
  CreateAssessmentPaperSchema,
  UpdateAssessmentPaperSchema,
  AssessmentPaperQuerySchema,
} from './assessment-paper.model'

export class CreateAssessmentPaperDto extends createZodDto(CreateAssessmentPaperSchema) {}
export class UpdateAssessmentPaperDto extends createZodDto(UpdateAssessmentPaperSchema) {}
export class AssessmentPaperQueryDto extends createZodDto(AssessmentPaperQuerySchema) {}
