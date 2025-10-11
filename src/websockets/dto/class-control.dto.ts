import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

const JoinClassSchema = z.object({
  classId: z.string().min(1, 'Class ID cannot be empty'),
  role: z.enum(['teacher', 'student']),
  userId: z.string().min(1, 'User ID cannot be empty'),
  displayName: z.string().min(1, 'Display name cannot be empty'),
  avatar: z.string().url().optional(),
})

export class JoinClassDto extends createZodDto(JoinClassSchema) {}

const ClassCapabilitySchema = z.object({
  canPublishVideo: z.boolean().default(false),
  canPublishAudio: z.boolean().default(false),
  canShareScreen: z.boolean().default(false),
  canShareDocuments: z.boolean().default(false),
  canRecord: z.boolean().default(false),
  canControlParticipants: z.boolean().default(false),
  canModerateChat: z.boolean().default(false),
})

export class ClassCapabilityDto extends createZodDto(ClassCapabilitySchema) {}

const MediaSettingsSchema = z.object({
  audio: z.object({
    enabled: z.boolean(),
    muted: z.boolean().optional().default(false),
    volume: z.number().min(0).max(100).optional().default(100),
  }),
  video: z.object({
    enabled: z.boolean(),
    quality: z.enum(['low', 'medium', 'high']).optional().default('medium'),
    facingMode: z.enum(['user', 'environment']).optional().default('user'),
  }),
  screenShare: z
    .object({
      enabled: z.boolean(),
      includeAudio: z.boolean().optional().default(false),
    })
    .optional(),
})

export class MediaSettingsDto extends createZodDto(MediaSettingsSchema) {}
