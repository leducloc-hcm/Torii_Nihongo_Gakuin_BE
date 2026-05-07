import { z } from 'zod'

export const LecturerClassLevelSchema = z.enum(['N5', 'N4', 'N3', 'N2', 'N1'])
export const LecturerClassStatusSchema = z.enum(['active', 'upcoming', 'archived'])
export const LecturerAssignmentStatusSchema = z.enum([
  'draft',
  'published',
  'grading',
  'returned',
])
export const LecturerAssignmentTypeSchema = z.enum([
  'quiz',
  'essay',
  'listening',
  'speaking',
  'reading',
  'kanji',
])
export const LecturerFolderToneSchema = z.enum([
  'sky',
  'emerald',
  'amber',
  'rose',
  'violet',
  'slate',
])
export const LecturerClassColorSchema = LecturerFolderToneSchema

export const LecturerAssistantSchema = z.object({
  name: z.string(),
  initials: z.string(),
})

export const LecturerClassSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  level: LecturerClassLevelSchema,
  status: LecturerClassStatusSchema,
  studentCount: z.number().int().nonnegative(),
  capacity: z.number().int().positive(),
  progress: z.number().int().min(0).max(100),
  scheduleSummary: z.string(),
  nextSessionAt: z.string().datetime(),
  room: z.string(),
  assistants: z.array(LecturerAssistantSchema),
  color: LecturerClassColorSchema,
})

export const LecturerFolderSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  itemCount: z.number().int().nonnegative(),
  sizeBytes: z.number().nonnegative(),
  updatedAt: z.string().datetime(),
  sharedWith: z.number().int().nonnegative(),
  pinned: z.boolean(),
  tone: LecturerFolderToneSchema,
  classCode: z.string().optional(),
})

export const LecturerAssignmentSchema = z.object({
  id: z.string(),
  title: z.string(),
  classCode: z.string(),
  className: z.string(),
  level: LecturerClassLevelSchema,
  type: LecturerAssignmentTypeSchema,
  status: LecturerAssignmentStatusSchema,
  dueAt: z.string().datetime(),
  submissions: z.number().int().nonnegative(),
  totalStudents: z.number().int().nonnegative(),
  averageScore: z.number().optional(),
  points: z.number().int().nonnegative(),
})

export const LecturerActivityPointSchema = z.object({
  date: z.string().datetime(),
  label: z.string(),
  submissions: z.number().int().nonnegative(),
  due: z.number().int().nonnegative(),
  onTimeRate: z.number().int().min(0).max(100),
})

export const LecturerActivitySummarySchema = z.object({
  weekTotal: z.number().int().nonnegative(),
  onTimeRate: z.number().int().min(0).max(100),
  weekDelta: z.number().int(),
})

export const LecturerOverviewSummarySchema = z.object({
  activeClasses: z.number().int().nonnegative(),
  totalStudents: z.number().int().nonnegative(),
  pendingGrading: z.number().int().nonnegative(),
  upcomingDeadlines: z.number().int().nonnegative(),
})

export const LecturerProfileSchema = z.object({
  name: z.string(),
  title: z.string(),
  email: z.string().email(),
  initials: z.string(),
  campus: z.string(),
})

export const LecturerOverviewSchema = z.object({
  profile: LecturerProfileSchema,
  summary: LecturerOverviewSummarySchema,
  classes: z.array(LecturerClassSchema),
  folders: z.array(LecturerFolderSchema),
  assignments: z.array(LecturerAssignmentSchema),
  activity: z.object({
    series: z.array(LecturerActivityPointSchema),
    summary: LecturerActivitySummarySchema,
  }),
})

export type LecturerClassLevel = z.infer<typeof LecturerClassLevelSchema>
export type LecturerClassStatus = z.infer<typeof LecturerClassStatusSchema>
export type LecturerAssignmentType = z.infer<typeof LecturerAssignmentTypeSchema>
export type LecturerAssignmentStatus = z.infer<typeof LecturerAssignmentStatusSchema>
export type LecturerClass = z.infer<typeof LecturerClassSchema>
export type LecturerFolder = z.infer<typeof LecturerFolderSchema>
export type LecturerAssignment = z.infer<typeof LecturerAssignmentSchema>
export type LecturerActivityPoint = z.infer<typeof LecturerActivityPointSchema>
export type LecturerActivitySummary = z.infer<typeof LecturerActivitySummarySchema>
export type LecturerOverviewSummary = z.infer<typeof LecturerOverviewSummarySchema>
export type LecturerProfile = z.infer<typeof LecturerProfileSchema>
export type LecturerOverview = z.infer<typeof LecturerOverviewSchema>
