import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'

type AssignmentRow = {
  id: number
  title: string
  level: string | null
  visibility: 'PUBLIC' | 'PRIVATE' | 'UNLISTED'
  dueAt: Date | null
  classId: number | null
  className: string | null
  sectionType: string | null
  points: number | null
  submissions: number
  averageScore: number | null
}

type ActivityRow = {
  dayDate: Date
  submissions: number
  dueCount: number
  onTimeCount: number
  onTimeTotal: number
}

@Injectable()
export class LecturerDashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getLecturerUser(lecturerId: number) {
    return this.prisma.user.findUnique({
      where: { id: lecturerId },
      include: { lecturerProfile: true },
    })
  }

  async getLecturerClasses(lecturerId: number) {
    return this.prisma.class.findMany({
      where: {
        OR: [
          { lecturerId, isActive: true },
          {
            sessions: {
              some: {
                substituteLecturerId: lecturerId,
              },
            },
            isActive: true,
          },
        ],
      },
      include: {
        course: {
          select: {
            id: true,
            level: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        },
        sessions: {
          orderBy: { scheduledAt: 'asc' },
          select: {
            id: true,
            scheduledAt: true,
            endedAt: true,
            janusRoomId: true,
            substituteLecturer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  async getRootFoldersForLecturer(lecturerId: number) {
    return this.prisma.folderPermission.findMany({
      where: {
        userId: lecturerId,
        folder: {
          classId: { not: null },
          parentId: null,
        },
      },
      include: {
        folder: {
          include: {
            class: {
              include: {
                course: {
                  select: {
                    level: true,
                  },
                },
              },
            },
          },
        },
      },
    })
  }

  async getFolderResourceStats(folderIds: number[]) {
    if (!folderIds.length) return new Map<number, { itemCount: number; updatedAt: Date | null }>()

    const grouped = await this.prisma.resource.groupBy({
      by: ['folderId'],
      where: {
        folderId: {
          in: folderIds,
        },
      },
      _count: {
        _all: true,
      },
      _max: {
        updatedAt: true,
      },
    })

    const map = new Map<number, { itemCount: number; updatedAt: Date | null }>()
    grouped.forEach((row) => {
      if (!row.folderId) return
      map.set(row.folderId, {
        itemCount: row._count._all,
        updatedAt: row._max.updatedAt,
      })
    })
    return map
  }

  async getFolderSharedCount(folderIds: number[]) {
    if (!folderIds.length) return new Map<number, number>()
    const grouped = await this.prisma.folderPermission.groupBy({
      by: ['folderId'],
      where: {
        folderId: { in: folderIds },
      },
      _count: {
        _all: true,
      },
    })

    const map = new Map<number, number>()
    grouped.forEach((row) => {
      map.set(row.folderId, row._count._all)
    })
    return map
  }

  async getAssessmentRows(classIds: number[]): Promise<AssignmentRow[]> {
    if (!classIds.length) return []

    return this.prisma.$queryRaw<AssignmentRow[]>`
      SELECT
        a.id::int AS "id",
        a.title AS "title",
        a.level::text AS "level",
        a.visibility::text AS "visibility",
        a.due_at AS "dueAt",
        a.class_id::int AS "classId",
        c.title AS "className",
        MIN(s.type::text) AS "sectionType",
        COALESCE(sp.max_total, 0)::int AS "points",
        COUNT(att.id)::int AS "submissions",
        AVG(att.earned_score)::float AS "averageScore"
      FROM assessment.assessments a
      LEFT JOIN assessment.score_profiles sp ON sp.id = a.score_profile_id
      LEFT JOIN assessment.sections s ON s.assessment_id = a.id
      LEFT JOIN assessment.attempts att
        ON att.assessment_id = a.id
       AND att.submitted_at IS NOT NULL
      LEFT JOIN learning."Class" c ON c.id = a.class_id
      WHERE a.class_id IN (${Prisma.join(classIds)})
      GROUP BY
        a.id, a.title, a.level, a.visibility, a.due_at, a.class_id, c.title, sp.max_total
      ORDER BY a.due_at ASC NULLS LAST, a.id DESC
    `
  }

  async getActivitySeriesRows(classIds: number[], days: number): Promise<ActivityRow[]> {
    if (!classIds.length) return []
    const daySpan = Math.max(1, days)
    const startOffset = daySpan - 1

    return this.prisma.$queryRaw<ActivityRow[]>`
      WITH days AS (
        SELECT generate_series(
          date_trunc('day', now()) - (${startOffset} * interval '1 day'),
          date_trunc('day', now()),
          interval '1 day'
        )::date AS day_date
      ),
      submissions AS (
        SELECT
          date_trunc('day', att.submitted_at)::date AS day_date,
          COUNT(*)::int AS submissions
        FROM assessment.attempts att
        JOIN assessment.assessments a ON a.id = att.assessment_id
        WHERE a.class_id IN (${Prisma.join(classIds)})
          AND att.submitted_at IS NOT NULL
          AND att.submitted_at >= (date_trunc('day', now()) - (${startOffset} * interval '1 day'))
        GROUP BY date_trunc('day', att.submitted_at)::date
      ),
      due_assessments AS (
        SELECT
          date_trunc('day', a.due_at)::date AS day_date,
          COUNT(*)::int AS due_count
        FROM assessment.assessments a
        WHERE a.class_id IN (${Prisma.join(classIds)})
          AND a.due_at IS NOT NULL
          AND a.due_at >= (date_trunc('day', now()) - (${startOffset} * interval '1 day'))
        GROUP BY date_trunc('day', a.due_at)::date
      ),
      first_submissions AS (
        SELECT DISTINCT ON (att.assessment_id, att.user_id)
          att.assessment_id,
          att.user_id,
          att.submitted_at
        FROM assessment.attempts att
        JOIN assessment.assessments a ON a.id = att.assessment_id
        WHERE a.class_id IN (${Prisma.join(classIds)})
          AND att.submitted_at IS NOT NULL
        ORDER BY att.assessment_id, att.user_id, att.submitted_at ASC
      ),
      due_vs_on_time AS (
        SELECT
          date_trunc('day', a.due_at)::date AS day_date,
          COUNT(fs.assessment_id)::int AS on_time_total,
          SUM(CASE WHEN fs.submitted_at <= a.due_at THEN 1 ELSE 0 END)::int AS on_time_count
        FROM assessment.assessments a
        LEFT JOIN first_submissions fs ON fs.assessment_id = a.id
        WHERE a.class_id IN (${Prisma.join(classIds)})
          AND a.due_at IS NOT NULL
          AND a.due_at >= (date_trunc('day', now()) - (${startOffset} * interval '1 day'))
        GROUP BY date_trunc('day', a.due_at)::date
      )
      SELECT
        d.day_date AS "dayDate",
        COALESCE(s.submissions, 0)::int AS "submissions",
        COALESCE(da.due_count, 0)::int AS "dueCount",
        COALESCE(dot.on_time_count, 0)::int AS "onTimeCount",
        COALESCE(dot.on_time_total, 0)::int AS "onTimeTotal"
      FROM days d
      LEFT JOIN submissions s ON s.day_date = d.day_date
      LEFT JOIN due_assessments da ON da.day_date = d.day_date
      LEFT JOIN due_vs_on_time dot ON dot.day_date = d.day_date
      ORDER BY d.day_date ASC
    `
  }
}
