export const MediaStatus = {
  UPLOADING: 'UPLOADING',
  TRANSCODING: 'TRANSCODING',
  READY: 'READY',
  FAILED: 'FAILED',
} as const

export const MediaKind = {
  AUDIO: 'AUDIO',
  VIDEO: 'VIDEO',
  IMAGE: 'IMAGE',
  PDF: 'PDF',
  OTHER: 'OTHER',
} as const

export const LessonStatus = {
  PRIVATE: 'PRIVATE',
  PUBLISHED: 'PUBLISHED',
  GLOBAL_PUBLIC: 'GLOBAL_PUBLIC',
} as const
