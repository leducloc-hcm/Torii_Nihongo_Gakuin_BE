import { z } from 'zod'

export const AssignmentStatusEnum = z.enum(['PENDING', 'IN_PROGRESS', 'SUBMITTED', 'EXPIRED', 'GRADED'])

export const AssessmentAssignmentSchema = z.object({
  id: z.number().int().positive(),
  assessmentId: z.number().int().positive(),
  assignedById: z.number().int().positive(),
  assignedToId: z.number().int().positive().nullable().optional(),
  classId: z.number().int().positive().nullable().optional(),
  note: z.string().max(1000).nullable().optional(),
  startAt: z.coerce.date().nullable().optional(),
  dueAt: z.coerce.date().nullable().optional(),
  lockAfterDue: z.boolean().default(false),
  maxAttempts: z.number().int().positive().nullable().optional(),
  status: AssignmentStatusEnum,
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const CreateAssessmentAssignmentSchema = z
  .object({
    assessmentId: z.number().int().positive({ message: 'Assessment ID is required' }),
    assignedToId: z.number().int().positive().nullable().optional(),
    classId: z.number().int().positive().nullable().optional(),
    note: z.string().max(1000).nullable().optional(),
    startAt: z.coerce.date().nullable().optional(),
    dueAt: z.coerce.date().nullable().optional(),
    lockAfterDue: z.boolean().default(false),
    maxAttempts: z.number().int().positive().nullable().optional(),
  })
  .refine((data) => data.assignedToId || data.classId, {
    message: 'Must assign to either a user (assignedToId) or a class (classId)',
    path: ['assignedToId', 'classId'],
  })
  .refine(
    (data) => {
      if (data.startAt && data.dueAt) {
        return data.dueAt > data.startAt
      }
      return true
    },
    {
      message: 'Due date must be after start date',
      path: ['dueAt'],
    },
  )

export const UpdateAssessmentAssignmentSchema = z
  .object({
    note: z.string().max(1000).nullable().optional(),
    startAt: z.coerce.date().nullable().optional(),
    dueAt: z.coerce.date().nullable().optional(),
    lockAfterDue: z.boolean().optional(),
    maxAttempts: z.number().int().positive().nullable().optional(),
    status: AssignmentStatusEnum.optional(),
  })
  .refine(
    (data) => {
      if (data.startAt && data.dueAt) {
        return data.dueAt > data.startAt
      }
      return true
    },
    {
      message: 'Due date must be after start date',
      path: ['dueAt'],
    },
  )

export const QueryAssessmentAssignmentSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  assessmentId: z.coerce.number().int().positive().optional(),
  assignedById: z.coerce.number().int().positive().optional(),
  assignedToId: z.coerce.number().int().positive().optional(),
  classId: z.coerce.number().int().positive().optional(),
  status: AssignmentStatusEnum.optional(),
  isPastDue: z.coerce.boolean().optional(),
  sortBy: z.enum(['createdAt', 'dueAt', 'startAt', 'status']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
})

export const AssignmentStatsSchema = z.object({
  total: z.number().int(),
  pending: z.number().int(),
  inProgress: z.number().int(),
  submitted: z.number().int(),
  expired: z.number().int(),
  overdue: z.number().int(),
})

export const MyAssignmentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  status: AssignmentStatusEnum.optional(),
  upcoming: z.coerce.boolean().optional(),
  overdue: z.coerce.boolean().optional(),
  sortBy: z.enum(['dueAt', 'startAt', 'createdAt']).optional().default('dueAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
})

export type AssessmentAssignment = z.infer<typeof AssessmentAssignmentSchema>
export type CreateAssessmentAssignment = z.infer<typeof CreateAssessmentAssignmentSchema>
export type UpdateAssessmentAssignment = z.infer<typeof UpdateAssessmentAssignmentSchema>
export type QueryAssessmentAssignment = z.infer<typeof QueryAssessmentAssignmentSchema>
export type AssignmentStats = z.infer<typeof AssignmentStatsSchema>
export type MyAssignmentsQuery = z.infer<typeof MyAssignmentsQuerySchema>

export type AssessmentAssignmentWhereInput = any
export type AssessmentAssignmentWhereUniqueInput = any
export type AssessmentAssignmentOrderByInput = any
export type AssessmentAssignmentInclude = any
