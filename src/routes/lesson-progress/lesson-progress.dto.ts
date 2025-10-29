import { createZodDto } from 'nestjs-zod'
import {
  UpdateProgressSchema,
  CourseProgressSchema,
  CourseProgressDetailsSchema,
  LessonProgressSchema,
} from './lesson-progress.model'

export class UpdateProgressDTO extends createZodDto(UpdateProgressSchema) {}
export class CourseProgressDTO extends createZodDto(CourseProgressSchema) {}
export class CourseProgressDetailsDTO extends createZodDto(CourseProgressDetailsSchema) {}
export class LessonProgressDTO extends createZodDto(LessonProgressSchema) {}
