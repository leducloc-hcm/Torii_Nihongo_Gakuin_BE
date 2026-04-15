import { createZodDto } from "nestjs-zod";
import {
  CreateCourseSchema,
  UpdateCourseSchema,
  QueryCourseSchema,
  CourseResponseSchema,
  CourseListItemSchema,
  UpdateCourseStatusSchemaForAdmin,
} from "./course.model";
import { z } from "zod";

export class CreateCourseDTO extends createZodDto(CreateCourseSchema) {}
export class UpdateCourseDTO extends createZodDto(UpdateCourseSchema) {}
export class QueryCourseDTO extends createZodDto(QueryCourseSchema) {}
export class CourseResponseDTO extends createZodDto(CourseResponseSchema) {}
export class CourseListItemDTO extends createZodDto(CourseListItemSchema) {}

// Class Management DTOs
export const CreateClassSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  lecturerId: z
    .number()
    .int()
    .positive("Lecturer ID must be a positive integer"),
  startDate: z.string().datetime("Invalid start date format").optional(),
  endDate: z.string().datetime("Invalid end date format").optional(),
  capacity: z
    .number()
    .int()
    .positive("Capacity must be a positive integer")
    .default(20),
});

export const UpdateClassSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().optional(),
  lecturerId: z
    .number()
    .int()
    .positive("Lecturer ID must be a positive integer")
    .optional(),
  startDate: z.string().datetime("Invalid start date format").optional(),
  endDate: z.string().datetime("Invalid end date format").optional(),
  capacity: z
    .number()
    .int()
    .positive("Capacity must be a positive integer")
    .optional(),
  isActive: z.boolean().optional(),
});

export const CreateSessionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  scheduledAt: z.string().datetime("Invalid datetime format"),
});

export const UpdateSessionSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  scheduledAt: z.string().datetime("Invalid datetime format").optional(),
});

export class CreateClassDTO extends createZodDto(CreateClassSchema) {}
export class UpdateClassDTO extends createZodDto(UpdateClassSchema) {}
export class CreateSessionDTO extends createZodDto(CreateSessionSchema) {}
export class UpdateSessionDTO extends createZodDto(UpdateSessionSchema) {}

export class UpdateCourseStatusDTOForAdmin extends createZodDto(
  UpdateCourseStatusSchemaForAdmin,
) {}
