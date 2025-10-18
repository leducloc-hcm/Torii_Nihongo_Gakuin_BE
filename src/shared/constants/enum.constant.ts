// Enum constants to replace Prisma types
// Based on Prisma schema enums

export const JLPTLevel = {
  N1: 'N1',
  N2: 'N2',
  N3: 'N3',
  N4: 'N4',
  N5: 'N5',
} as const

export const Role = {
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
  LECTURER: 'LECTURER',
  CUSTOMER: 'CUSTOMER',
} as const

export const VerifyStatus = {
  UNVERIFIED: 'UNVERIFIED',
  VERIFIED: 'VERIFIED',
} as const

export const CourseStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const

export const QuestionType = {
  VOCAB: 'VOCAB',
  KANJI: 'KANJI',
  GRAMMAR: 'GRAMMAR',
  SYNONYM: 'SYNONYM',
  ORDER: 'ORDER',
  READING: 'READING',
  LISTENING: 'LISTENING',
} as const

export const QuestionGroupType = {
  READING_PASSAGE: 'READING_PASSAGE',
  LISTENING_AUDIO: 'LISTENING_AUDIO',
  VOCAB_SET: 'VOCAB_SET',
  GRAMMAR_SET: 'GRAMMAR_SET',
  MIXED_SET: 'MIXED_SET',
} as const

export const QuestionSubtype = {
  SINGLE_KANJI: 'SINGLE_KANJI',
  COMPOUND_WORD: 'COMPOUND_WORD',
  FILL_BLANK: 'FILL_BLANK',
  TRANSFORM: 'TRANSFORM',
  SIMILAR_MEANING: 'SIMILAR_MEANING',
  OPPOSITE_MEANING: 'OPPOSITE_MEANING',
  SENTENCE_ARRANGEMENT: 'SENTENCE_ARRANGEMENT',
  WORD_ARRANGEMENT: 'WORD_ARRANGEMENT',
} as const

export const Difficulty = {
  EASY: 'EASY',
  MEDIUM: 'MEDIUM',
  HARD: 'HARD',
} as const

export const Visibility = {
  PRIVATE: 'PRIVATE',
  PUBLIC: 'PUBLIC',
} as const

export const CourseType = {
  VIDEO_QUIZ: 'VIDEO_QUIZ',
  LIVE_CLASS: 'LIVE_CLASS',
} as const

export const LessonKind = {
  VIDEO: 'VIDEO',
  ARTICLE: 'ARTICLE',
  QUIZ: 'QUIZ',
  LIVE: 'LIVE',
} as const

export const LiveMode = {
  MODE2D: 'MODE2D',
  MODE3D: 'MODE3D',
} as const

export const AttendanceStatus = {
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  LATE: 'LATE',
  EXCUSED: 'EXCUSED',
} as const

export const PaymentStatus = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const

export const OrderItemType = {
  COURSE: 'COURSE',
  CLASS: 'CLASS',
} as const

export const PromoKind = {
  PERCENTAGE: 'PERCENTAGE',
  FIXED: 'FIXED',
} as const

export const RewardType = {
  POINTS: 'POINTS',
  BADGE: 'BADGE',
  DISCOUNT: 'DISCOUNT',
  ITEM: 'ITEM',
} as const

export const ReactionKind = {
  LIKE: 'LIKE',
  DISLIKE: 'DISLIKE',
  LOVE: 'LOVE',
} as const

export const ChatRole = {
  USER: 'USER',
  ASSISTANT: 'ASSISTANT',
  SYSTEM: 'SYSTEM',
} as const

export const VerificationCodeType = {
  EMAIL_VERIFICATION: 'EMAIL_VERIFICATION',
  PASSWORD_RESET: 'PASSWORD_RESET',
  LOGIN_OTP: 'LOGIN_OTP',
  TOTP_SETUP: 'TOTP_SETUP',
} as const

export const ReadingLength = {
  SHORT: 'SHORT',
  MEDIUM: 'MEDIUM',
  LONG: 'LONG',
} as const

export const NotificationType = {
  COURSE_ENROLLMENT: 'COURSE_ENROLLMENT',
  LESSON_COMPLETE: 'LESSON_COMPLETE',
  QUIZ_SCORE: 'QUIZ_SCORE',
  CLASS_REMINDER: 'CLASS_REMINDER',
  ASSIGNMENT_DUE: 'ASSIGNMENT_DUE',
  GRADE_POSTED: 'GRADE_POSTED',
  MESSAGE_RECEIVED: 'MESSAGE_RECEIVED',
  SYSTEM_UPDATE: 'SYSTEM_UPDATE',
  PROMOTIONAL: 'PROMOTIONAL',
  ACHIEVEMENT: 'ACHIEVEMENT',
  PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
} as const

export const NotificationStatus = {
  UNREAD: 'UNREAD',
  READ: 'READ',
  ARCHIVED: 'ARCHIVED',
} as const

export const NotificationPriority = {
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const

// Type definitions
export type JLPTLevelType = (typeof JLPTLevel)[keyof typeof JLPTLevel]
export type RoleType = (typeof Role)[keyof typeof Role]
export type VerifyStatusType = (typeof VerifyStatus)[keyof typeof VerifyStatus]
export type CourseStatusType = (typeof CourseStatus)[keyof typeof CourseStatus]
export type QuestionTypeType = (typeof QuestionType)[keyof typeof QuestionType]
export type QuestionGroupTypeType = (typeof QuestionGroupType)[keyof typeof QuestionGroupType]
export type QuestionSubtypeType = (typeof QuestionSubtype)[keyof typeof QuestionSubtype]
export type DifficultyType = (typeof Difficulty)[keyof typeof Difficulty]
export type VisibilityType = (typeof Visibility)[keyof typeof Visibility]
export type CourseTypeType = (typeof CourseType)[keyof typeof CourseType]
export type LessonKindType = (typeof LessonKind)[keyof typeof LessonKind]
export type LiveModeType = (typeof LiveMode)[keyof typeof LiveMode]
export type AttendanceStatusType = (typeof AttendanceStatus)[keyof typeof AttendanceStatus]
export type PaymentStatusType = (typeof PaymentStatus)[keyof typeof PaymentStatus]
export type OrderItemTypeType = (typeof OrderItemType)[keyof typeof OrderItemType]
export type PromoKindType = (typeof PromoKind)[keyof typeof PromoKind]
export type RewardTypeType = (typeof RewardType)[keyof typeof RewardType]
export type ReactionKindType = (typeof ReactionKind)[keyof typeof ReactionKind]
export type ChatRoleType = (typeof ChatRole)[keyof typeof ChatRole]
export type VerificationCodeTypeType = (typeof VerificationCodeType)[keyof typeof VerificationCodeType]
export type ReadingLengthType = (typeof ReadingLength)[keyof typeof ReadingLength]
export type NotificationTypeType = (typeof NotificationType)[keyof typeof NotificationType]
export type NotificationStatusType = (typeof NotificationStatus)[keyof typeof NotificationStatus]
export type NotificationPriorityType = (typeof NotificationPriority)[keyof typeof NotificationPriority]
