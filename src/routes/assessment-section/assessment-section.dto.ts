import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import {
  CreateAssessmentSectionSchema,
  UpdateAssessmentSectionSchema,
  QuestionTypeSchema,
} from './assessment-section.model'

export class CreateAssessmentSectionDto {
  assessmentId!: number
  title!: string
  type!: z.infer<typeof QuestionTypeSchema>
}

export class UpdateAssessmentSectionDto extends createZodDto(UpdateAssessmentSectionSchema) {}

export class AssessmentSectionQueryDto {
  page?: number = 1
  limit?: number = 20
  search?: string
  type?: z.infer<typeof QuestionTypeSchema>
  assessmentId?: number
  sortBy?: string = 'id'
  sortOrder?: string = 'asc'
}
