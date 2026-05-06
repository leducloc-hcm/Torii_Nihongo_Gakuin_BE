export const MediaStatus = {
  UPLOADING: 'UPLOADING',
  TRANSCODING: 'TRANSCODING',
  READY: 'READY',
  FAILED: 'FAILED',
} as const

export type MediaStatusType = (typeof MediaStatus)[keyof typeof MediaStatus]

export const MediaKind = {
  AUDIO: 'AUDIO',
  VIDEO: 'VIDEO',
  IMAGE: 'IMAGE',
  PDF: 'PDF',
  OTHER: 'OTHER',
} as const

export type MediaKindType = (typeof MediaKind)[keyof typeof MediaKind]

export const LessonStatus = {
  PRIVATE: 'PRIVATE',
  PUBLISHED: 'PUBLISHED',
  GLOBAL_PUBLIC: 'GLOBAL_PUBLIC',
} as const

export type LessonStatusType = (typeof LessonStatus)[keyof typeof LessonStatus]
