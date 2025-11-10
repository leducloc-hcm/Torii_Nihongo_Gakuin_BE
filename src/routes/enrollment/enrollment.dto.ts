import { createZodDto } from 'nestjs-zod'
import {
  CreateEnrollmentSchema,
  UpdateEnrollmentSchema,
  QueryEnrollmentSchema,
  EnrollmentResponseSchema,
  EnrollmentListItemSchema,
  MyEnrollmentSchema,
} from './enrollment.model'

export class CreateEnrollmentDTO extends createZodDto(CreateEnrollmentSchema) {}
export class UpdateEnrollmentDTO extends createZodDto(UpdateEnrollmentSchema) {}
export class QueryEnrollmentDTO extends createZodDto(QueryEnrollmentSchema) {}
export class EnrollmentResponseDTO extends createZodDto(EnrollmentResponseSchema) {}
export class EnrollmentListItemDTO extends createZodDto(EnrollmentListItemSchema) {}
export class MyEnrollmentDTO extends createZodDto(MyEnrollmentSchema) {}
