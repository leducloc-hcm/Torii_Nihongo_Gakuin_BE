import { createZodDto } from 'nestjs-zod'
import {
  ScreenShareStartSchema,
  DocumentPingSchema,
  RecordingStartSchema,
  RaiseHandRequestSchema,
  LecturerControlSchema,
  ClassFeaturesSchema,
  WhiteboardActionSchema,
  BreakoutRoomSchema,
  ClassStatsResponseSchema,
} from '../../routes/online-class/online-class.model'

// Enhanced Screen Share DTO
export class ScreenShareStartDto extends createZodDto(ScreenShareStartSchema) {}

// Enhanced Document Share DTO
export class DocumentPingDto extends createZodDto(DocumentPingSchema) {}

// Enhanced Recording DTO
export class RecordingStartDto extends createZodDto(RecordingStartSchema) {}

// Enhanced Raise Hand DTO
export class RaiseHandRequestDto extends createZodDto(RaiseHandRequestSchema) {}

// Lecturer Controls DTO
export class LecturerControlDto extends createZodDto(LecturerControlSchema) {}

// Enhanced Class Features DTO
export class ClassFeaturesDto extends createZodDto(ClassFeaturesSchema) {}

// Whiteboard DTO
export class WhiteboardActionDto extends createZodDto(WhiteboardActionSchema) {}

// Breakout Room DTO
export class BreakoutRoomDto extends createZodDto(BreakoutRoomSchema) {}

// Class Statistics DTO
export class ClassStatsResponseDto extends createZodDto(ClassStatsResponseSchema) {}
