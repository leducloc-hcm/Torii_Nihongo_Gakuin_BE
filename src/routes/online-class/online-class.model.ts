import { z } from 'zod'

// Base Online Class Schema
export const OnlineClassSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  description: z.string().nullable().optional(),
  courseId: z.number().int().positive().nullable().optional(),
  lecturerId: z.number().int().positive(),
  scheduledAt: z.coerce.date(),
  durationMinutes: z
    .number()
    .int()
    .min(15, 'Duration must be at least 15 minutes')
    .max(480, 'Duration cannot exceed 480 minutes')
    .default(60),
  capacity: z.number().int().min(2, 'Minimum 2 participants').max(100, 'Maximum 100 participants').default(50),
  level: z.enum(['N5', 'N4', 'N3', 'N2', 'N1']).nullable().optional(),
  tags: z.array(z.string()).default([]),
  recordingEnabled: z.boolean().default(false),
  chatEnabled: z.boolean().default(true),
  screenShareEnabled: z.boolean().default(true),
  documentShareEnabled: z.boolean().default(true),
  raiseHandEnabled: z.boolean().default(true),
  isActive: z.boolean().default(true),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

// Create Online Class Schema
export const CreateOnlineClassSchema = OnlineClassSchema.omit({
  id: true,
  lecturerId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  scheduledAt: z.string().datetime('Invalid date-time format'),
})

// Update Online Class Schema
export const UpdateOnlineClassSchema = OnlineClassSchema.omit({
  id: true,
  lecturerId: true,
  createdAt: true,
  updatedAt: true,
})
  .partial()
  .extend({
    scheduledAt: z.string().datetime('Invalid date-time format').optional(),
  })

// Class List Query Schema
export const ClassListQuerySchema = z.object({
  page: z.coerce.number().int().min(1, 'Page must be at least 1').optional().default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .optional()
    .default(10),
  search: z.string().optional(),
  level: z.enum(['N5', 'N4', 'N3', 'N2', 'N1']).optional(),
  lecturerId: z.coerce.number().int().positive().optional(),
  courseId: z.coerce.number().int().positive().optional(),
  status: z.enum(['upcoming', 'active', 'completed', 'cancelled']).optional(),
  dateFrom: z.string().date('Invalid date format').optional(),
  dateTo: z.string().date('Invalid date format').optional(),
  tags: z.array(z.string()).optional(),
  sortBy: z.enum(['createdAt', 'scheduledAt', 'title', 'capacity']).optional().default('scheduledAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
})

// Join Class Token Schema
export const JoinClassTokenSchema = z.object({
  token: z.string(),
  expiresAt: z.coerce.date(),
  classInfo: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    scheduledAt: z.coerce.date(),
    lecturerName: z.string(),
    capacity: z.number(),
    janusRoomId: z.number().optional(),
    janusServer: z.string().optional(),
    features: z.object({
      chatEnabled: z.boolean(),
      screenShareEnabled: z.boolean(),
      documentShareEnabled: z.boolean(),
      raiseHandEnabled: z.boolean(),
    }),
  }),
  userRole: z.enum(['teacher', 'student']),
  permissions: z.object({
    canPublishVideo: z.boolean(),
    canPublishAudio: z.boolean(),
    canShareScreen: z.boolean(),
    canShareDocuments: z.boolean(),
    canRecord: z.boolean(),
    canControlParticipants: z.boolean(),
    canModerateChat: z.boolean(),
  }),
})

// Start Recording Schema
export const StartRecordingSchema = z.object({
  filename: z.string().optional(),
  includeVideo: z.boolean().optional().default(true),
  includeAudio: z.boolean().optional().default(true),
  quality: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  maxDurationMinutes: z
    .number()
    .int()
    .min(5, 'Minimum 5 minutes')
    .max(480, 'Maximum 480 minutes')
    .optional()
    .default(120),
})

// Share Document Schema
export const ShareDocumentSchema = z.object({
  documentUrl: z.string().url('Invalid document URL'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  type: z.enum(['pdf', 'image', 'presentation', 'video', 'other']).optional().default('other'),
  sizeBytes: z.number().int().min(0, 'Size must be non-negative').optional(),
  notifyParticipants: z.boolean().optional().default(true),
  allowDownload: z.boolean().optional().default(true),
})

// Participant Action Schema
export const ParticipantActionSchema = z.object({
  action: z.enum(['mute_audio', 'mute_video', 'kick', 'promote_presenter', 'demote_presenter', 'allow_unmute']),
  reason: z.string().optional(),
  durationMinutes: z.number().int().min(1, 'Minimum 1 minute').max(60, 'Maximum 60 minutes').optional(),
  notifyParticipant: z.boolean().optional().default(true),
})

// Online Class Response Schema (with relations)
export const OnlineClassResponseSchema = OnlineClassSchema.extend({
  currentSession: z
    .object({
      id: z.string(),
      roomKey: z.string(),
      startedAt: z.coerce.date(),
      participantCount: z.number(),
      isRecording: z.boolean(),
      janusRoomId: z.number().optional(),
    })
    .optional(),
  lecturer: z
    .object({
      id: z.number(),
      name: z.string(),
      avatar: z.string().optional(),
    })
    .optional(),
  course: z
    .object({
      id: z.number(),
      title: z.string(),
      level: z.enum(['N5', 'N4', 'N3', 'N2', 'N1']),
    })
    .optional(),
})

// Class Analytics Schema
export const ClassAnalyticsSchema = z.object({
  classId: z.string(),
  totalSessions: z.number(),
  totalDurationMinutes: z.number(),
  averageParticipants: z.number(),
  maxParticipants: z.number(),
  totalRecordings: z.number(),
  totalDocumentsShared: z.number(),
  totalHandsRaised: z.number(),
  totalChatMessages: z.number(),
  participantEngagement: z.object({
    averageSessionDuration: z.number(),
    handRaiseFrequency: z.number(),
    chatParticipationRate: z.number(),
  }),
  sessionHistory: z.array(
    z.object({
      sessionId: z.string(),
      startedAt: z.coerce.date(),
      endedAt: z.coerce.date().optional(),
      participantCount: z.number(),
      duration: z.number(),
      wasRecorded: z.boolean(),
      documentsShared: z.number(),
      handsRaised: z.number(),
      chatMessages: z.number(),
    }),
  ),
  popularTimeSlots: z.array(
    z.object({
      hour: z.number(),
      participantCount: z.number(),
      engagementScore: z.number(),
    }),
  ),
  attendancePattern: z.object({
    regularAttendees: z.number(),
    dropOffRate: z.number(),
    averageJoinDelay: z.number(),
  }),
})

// Enhanced Class Features Schemas

// Screen Share Start Schema
export const ScreenShareStartSchema = z.object({
  quality: z.enum(['low', 'medium', 'high']).default('medium'),
  includeAudio: z.boolean().optional().default(false),
  frameRate: z.number().int().min(5, 'Minimum 5 fps').max(30, 'Maximum 30 fps').optional().default(15),
  maxBitrate: z.number().int().min(100000, 'Minimum 100kbps').max(2000000, 'Maximum 2Mbps').optional().default(512000),
})

// Document Ping Schema
export const DocumentPingSchema = z.object({
  documentUrl: z.string().url('Invalid document URL'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  type: z.enum(['pdf', 'image', 'presentation', 'video', 'link', 'other']),
  thumbnailUrl: z.string().url('Invalid thumbnail URL').optional(),
  sizeBytes: z.number().int().min(0, 'Size must be non-negative').optional(),
  pageCount: z.number().int().min(1, 'Page count must be at least 1').optional(),
  allowDownload: z.boolean().optional().default(true),
  highlight: z.boolean().optional().default(false),
  autoDismissSeconds: z.number().int().min(5, 'Minimum 5 seconds').max(300, 'Maximum 300 seconds').optional(),
})

// Recording Start Schema (Enhanced)
export const RecordingStartSchema = z.object({
  recordingName: z.string().optional(),
  includeVideo: z.boolean().optional().default(true),
  includeAudio: z.boolean().optional().default(true),
  includeScreenShare: z.boolean().optional().default(true),
  includeChatHistory: z.boolean().optional().default(false),
  quality: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  maxDurationMinutes: z
    .number()
    .int()
    .min(5, 'Minimum 5 minutes')
    .max(480, 'Maximum 480 minutes')
    .optional()
    .default(120),
  autoUpload: z.boolean().optional().default(true),
})

// Raise Hand Request Schema
export const RaiseHandRequestSchema = z.object({
  action: z.enum(['raise', 'lower']),
  reason: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional().default('normal'),
  category: z.enum(['technical', 'content', 'audio', 'video', 'other']).optional().default('other'),
})

// Lecturer Control Schema
export const LecturerControlSchema = z.object({
  targetUserId: z.string(),
  action: z.enum([
    'mute_audio',
    'mute_video',
    'unmute_audio',
    'unmute_video',
    'kick',
    'promote_presenter',
    'demote_presenter',
    'spotlight',
    'remove_spotlight',
    'allow_screen_share',
    'deny_screen_share',
  ]),
  reason: z.string().optional(),
  notifyParticipant: z.boolean().optional().default(true),
  durationMinutes: z.number().int().min(1, 'Minimum 1 minute').max(60, 'Maximum 60 minutes').optional(),
})

// Class Features Schema
export const ClassFeaturesSchema = z.object({
  chatEnabled: z.boolean().optional(),
  studentScreenShareEnabled: z.boolean().optional(),
  documentShareEnabled: z.boolean().optional(),
  raiseHandEnabled: z.boolean().optional(),
  breakoutRoomsEnabled: z.boolean().optional(),
  whiteboardEnabled: z.boolean().optional(),
  recordingEnabled: z.boolean().optional(),
  maxParticipants: z.number().int().min(2, 'Minimum 2 participants').max(100, 'Maximum 100 participants').optional(),
  autoAdmit: z.boolean().optional(),
  waitingRoomEnabled: z.boolean().optional(),
})

// Whiteboard Action Schema
export const WhiteboardActionSchema = z.object({
  action: z.enum(['clear', 'save', 'load', 'share_control', 'revoke_control']),
  targetUserId: z.string().optional(),
  whiteboardData: z.any().optional(),
  name: z.string().optional(),
})

// Breakout Room Schema
export const BreakoutRoomSchema = z.object({
  action: z.enum(['create', 'assign', 'close', 'broadcast']),
  roomCount: z.number().int().min(2, 'Minimum 2 rooms').max(10, 'Maximum 10 rooms').optional(),
  assignments: z.record(z.string(), z.number()).optional(),
  roomId: z.number().int().optional(),
  message: z.string().optional(),
  autoAssign: z.boolean().optional().default(false),
  durationMinutes: z.number().int().min(5, 'Minimum 5 minutes').max(60, 'Maximum 60 minutes').optional().default(15),
})

// Class Stats Response Schema
export const ClassStatsResponseSchema = z.object({
  classId: z.string(),
  currentParticipants: z.number(),
  totalJoined: z.number(),
  duration: z.number(), // in seconds
  isRecording: z.boolean(),
  documentsShared: z.number(),
  handsRaised: z.number(),
  chatMessages: z.number(),
  screenShareActive: z.boolean(),
  whiteboardActive: z.boolean(),
  breakoutRoomsActive: z.number(),
  networkQuality: z.object({
    average: z.number(),
    participants: z.array(
      z.object({
        userId: z.string(),
        quality: z.number(),
        latency: z.number(),
        packetLoss: z.number(),
      }),
    ),
  }),
  participation: z.object({
    speaking: z.array(z.string()), // userIds currently speaking
    handRaised: z.array(z.string()), // userIds with hands raised
    chatActive: z.array(z.string()), // userIds recently active in chat
  }),
})

// Repository input/output types
export type OnlineClassCreateInput = {
  title: string
  description?: string | null
  courseId?: number | null
  lecturerId: number
  scheduledAt: Date
  durationMinutes?: number
  capacity?: number
  level?: 'N5' | 'N4' | 'N3' | 'N2' | 'N1' | null
  tags?: string[]
  recordingEnabled?: boolean
  chatEnabled?: boolean
  screenShareEnabled?: boolean
  documentShareEnabled?: boolean
  raiseHandEnabled?: boolean
}

export type OnlineClassUpdateInput = {
  title?: string
  description?: string | null
  scheduledAt?: Date
  durationMinutes?: number
  capacity?: number
  level?: 'N5' | 'N4' | 'N3' | 'N2' | 'N1' | null
  tags?: string[]
  recordingEnabled?: boolean
  chatEnabled?: boolean
  screenShareEnabled?: boolean
  documentShareEnabled?: boolean
  raiseHandEnabled?: boolean
  isActive?: boolean
}

export type OnlineClassWhereInput = {
  id?: number
  title?: { contains: string; mode: 'insensitive' }
  description?: { contains: string; mode: 'insensitive' }
  lecturerId?: number
  courseId?: number
  level?: 'N5' | 'N4' | 'N3' | 'N2' | 'N1'
  isActive?: boolean
  OR?: Array<{
    title?: { contains: string; mode: 'insensitive' }
    description?: { contains: string; mode: 'insensitive' }
  }>
  sessions?: {
    some?: {
      scheduledAt?: {
        gte?: Date
        lte?: Date
        gt?: Date
      }
      endedAt?: {
        not?: null
      } | null
    }
  }
}

export type OnlineClassOrderByInput = {
  id?: 'asc' | 'desc'
  title?: 'asc' | 'desc'
  scheduledAt?: 'asc' | 'desc'
  capacity?: 'asc' | 'desc'
  createdAt?: 'asc' | 'desc'
  sessions?: {
    _count?: 'asc' | 'desc'
  }
}

// Exported Zod types
export type CreateOnlineClassType = z.infer<typeof CreateOnlineClassSchema>
export type OnlineClass = z.infer<typeof OnlineClassSchema>
export type UpdateOnlineClassType = z.infer<typeof UpdateOnlineClassSchema>
export type ClassListQueryType = z.infer<typeof ClassListQuerySchema>
export type JoinClassTokenType = z.infer<typeof JoinClassTokenSchema>
export type StartRecordingType = z.infer<typeof StartRecordingSchema>
export type ShareDocumentType = z.infer<typeof ShareDocumentSchema>
export type ParticipantActionType = z.infer<typeof ParticipantActionSchema>
export type OnlineClassResponseType = z.infer<typeof OnlineClassResponseSchema>
export type ClassAnalyticsType = z.infer<typeof ClassAnalyticsSchema>

// Enhanced Features Types
export type ScreenShareStartType = z.infer<typeof ScreenShareStartSchema>
export type DocumentPingType = z.infer<typeof DocumentPingSchema>
export type RecordingStartType = z.infer<typeof RecordingStartSchema>
export type RaiseHandRequestType = z.infer<typeof RaiseHandRequestSchema>
export type LecturerControlType = z.infer<typeof LecturerControlSchema>
export type ClassFeaturesType = z.infer<typeof ClassFeaturesSchema>
export type WhiteboardActionType = z.infer<typeof WhiteboardActionSchema>
export type BreakoutRoomType = z.infer<typeof BreakoutRoomSchema>
export type ClassStatsResponseType = z.infer<typeof ClassStatsResponseSchema>
