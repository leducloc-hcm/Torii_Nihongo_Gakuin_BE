import { createZodDto } from 'nestjs-zod'
import {
  CreateCourseSchema,
  UpdateCourseSchema,
  QueryCourseSchema,
  CourseResponseSchema,
  CourseListItemSchema,
} from './course.model'

export class CreateCourseDTO extends createZodDto(CreateCourseSchema) {}
export class UpdateCourseDTO extends createZodDto(UpdateCourseSchema) {}
export class QueryCourseDTO extends createZodDto(QueryCourseSchema) {}
export class CourseResponseDTO extends createZodDto(CourseResponseSchema) {}
export class CourseListItemDTO extends createZodDto(CourseListItemSchema) {}
