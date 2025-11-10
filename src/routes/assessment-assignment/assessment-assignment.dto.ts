import { createZodDto } from 'nestjs-zod'
import {
  CreateAssessmentAssignmentSchema,
  UpdateAssessmentAssignmentSchema,
  QueryAssessmentAssignmentSchema,
  AssessmentAssignmentSchema,
  AssignmentStatsSchema,
  MyAssignmentsQuerySchema,
} from './assessment-assignment.model'

export class CreateAssessmentAssignmentDTO extends createZodDto(CreateAssessmentAssignmentSchema) {}
export class UpdateAssessmentAssignmentDTO extends createZodDto(UpdateAssessmentAssignmentSchema) {}
export class QueryAssessmentAssignmentDTO extends createZodDto(QueryAssessmentAssignmentSchema) {}
export class AssessmentAssignmentResponseDTO extends createZodDto(AssessmentAssignmentSchema) {}
export class AssignmentStatsDTO extends createZodDto(AssignmentStatsSchema) {}
export class MyAssignmentsQueryDTO extends createZodDto(MyAssignmentsQuerySchema) {}
