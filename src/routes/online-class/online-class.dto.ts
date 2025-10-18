import { createZodDto } from 'nestjs-zod'
import {
  CreateOnlineClassSchema,
  UpdateOnlineClassSchema,
  ClassListQuerySchema,
  JoinClassTokenSchema,
  StartRecordingSchema,
  ShareDocumentSchema,
  ParticipantActionSchema,
  OnlineClassResponseSchema,
  ClassAnalyticsSchema,
} from './online-class.model'

// Basic CRUD DTOs
export class CreateOnlineClassDto extends createZodDto(CreateOnlineClassSchema) {}
export class UpdateOnlineClassDto extends createZodDto(UpdateOnlineClassSchema) {}
export class ClassListQueryDto extends createZodDto(ClassListQuerySchema) {}

// Feature DTOs
export class JoinClassTokenDto extends createZodDto(JoinClassTokenSchema) {}
export class StartRecordingDto extends createZodDto(StartRecordingSchema) {}
export class ShareDocumentDto extends createZodDto(ShareDocumentSchema) {}
export class ParticipantActionDto extends createZodDto(ParticipantActionSchema) {}

// Response DTOs
export class OnlineClassResponseDto extends createZodDto(OnlineClassResponseSchema) {}
export class ClassAnalyticsDto extends createZodDto(ClassAnalyticsSchema) {}
