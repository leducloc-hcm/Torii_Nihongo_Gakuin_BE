import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

const DocumentShareSchema = z.object({
  documentUrl: z.string().url('Invalid document URL'),
  documentName: z.string().min(1, 'Document name cannot be empty'),
  documentType: z.enum(['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'image']),
  pageNumber: z.number().int().min(1).optional(),
  totalPages: z.number().int().min(1).optional(),
  description: z.string().optional(),
})

export class DocumentShareDto extends createZodDto(DocumentShareSchema) {}

const ScreenShareSchema = z.object({
  type: z.enum(['start', 'stop']),
  quality: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  includeAudio: z.boolean().optional().default(false),
})

export class ScreenShareDto extends createZodDto(ScreenShareSchema) {}

const RecordingControlSchema = z.object({
  action: z.enum(['start', 'stop', 'pause', 'resume']),
  options: z
    .object({
      includeVideo: z.boolean().optional().default(true),
      includeAudio: z.boolean().optional().default(true),
      includeScreenShare: z.boolean().optional().default(true),
      quality: z.enum(['low', 'medium', 'high']).optional().default('medium'),
    })
    .optional(),
})

export class RecordingControlDto extends createZodDto(RecordingControlSchema) {}

const RaiseHandSchema = z.object({
  action: z.enum(['raise', 'lower']),
  reason: z.string().optional(), // Optional reason for raising hand
})

export class RaiseHandDto extends createZodDto(RaiseHandSchema) {}

const ParticipantControlSchema = z.object({
  targetUserId: z.string().min(1, 'Target user ID cannot be empty'),
  action: z.enum([
    'mute_audio',
    'unmute_audio',
    'mute_video',
    'unmute_video',
    'kick',
    'promote_presenter',
    'demote_presenter',
  ]),
  reason: z.string().optional(),
})

export class ParticipantControlDto extends createZodDto(ParticipantControlSchema) {}
