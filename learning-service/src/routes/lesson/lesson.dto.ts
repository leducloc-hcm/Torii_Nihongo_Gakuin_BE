import { createZodDto } from 'nestjs-zod'
import {
  CreateLessonSchema,
  UpdateLessonSchema,
  QueryLessonSchema,
  LessonResponseSchema,
  LessonListItemSchema,
} from './lesson.model'

export class CreateLessonDTO extends createZodDto(CreateLessonSchema) {}
export class UpdateLessonDTO extends createZodDto(UpdateLessonSchema) {}
export class QueryLessonDTO extends createZodDto(QueryLessonSchema) {}
export class LessonResponseDTO extends createZodDto(LessonResponseSchema) {}
export class LessonListItemDTO extends createZodDto(LessonListItemSchema) {}
