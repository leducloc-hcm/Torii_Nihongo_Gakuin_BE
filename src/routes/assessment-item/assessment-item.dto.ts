import { createZodDto } from 'nestjs-zod'
import {
  CreateAssessmentItemSchema,
  UpdateAssessmentItemSchema,
  AssessmentItemQuerySchema,
} from './assessment-item.model'

export class CreateAssessmentItemDto extends createZodDto(
  CreateAssessmentItemSchema,
) {}

export class UpdateAssessmentItemDto extends createZodDto(
  UpdateAssessmentItemSchema,
) {}

export class AssessmentItemQueryDto extends createZodDto(
  AssessmentItemQuerySchema,
) {}
