import { Injectable } from '@nestjs/common'
import { Role } from '@prisma/client'
import {
  LecturerActivityPoint,
  LecturerAssignment,
  LecturerAssignmentStatus,
  LecturerAssignmentType,
  LecturerClass,
  LecturerClassLevel,
  LecturerFolder,
  LecturerOverview,
} from './lecturer-dashboard.model'
import { LecturerDashboardRepository } from './lecturer-dashboard.repo'

@Injectable()
export class LecturerDashboardService {
  constructor(private readonly repo: LecturerDashboardRepository) {}

  async getOverview(lecturerId: number): Promise<LecturerOverview> {
    const [user, classRows, folderPermissions] = await Promise.all([
      this.repo.getLecturerUser(lecturerId),
      this.repo.getLecturerClasses(lecturerId),
      this.repo.getRootFoldersForLecturer(lecturerId),
    ])

    const classes: LecturerClass[] = classRows.map((klass) => {
      const customerCount = klass.members.filter(
        (member) => member.user.role === Role.CUSTOMER,
      ).length
      const assistantUsers = klass.members
        .filter(
          (member) =>
            member.user.role === Role.LECTURER && member.user.id !== klass.lecturerId,
        )
        .map((member) => member.user)

      const upcomingSessions = klass.sessions.filter(
        (session) => session.scheduledAt.getTime() >= Date.now(),
      )
      const nextSession = upcomingSessions[0] || klass.sessions[0]
      const endedSessions = klass.sessions.filter((session) => !!session.endedAt).length
      const progress =
        klass.sessions.length > 0
          ? Math.round((endedSessions / klass.sessions.length) * 100)
          : 0

      return {
        id: `cls-${klass.id}`,
        code: this.toClassCode(klass.id, klass.course?.level ?? null),
        name: klass.title,
        level: this.toClassLevel(klass.course?.level ?? null),
        status: this.toClassStatus(klass.isActive, upcomingSessions.length > 0),
        studentCount: customerCount,
        capacity: klass.capacity,
        progress,
        scheduleSummary: this.toScheduleSummary(upcomingSessions),
        nextSessionAt: (nextSession?.scheduledAt ?? new Date()).toISOString(),
        room: nextSession?.janusRoomId ? `Room ${nextSession.janusRoomId}` : 'Room TBA',
        assistants: assistantUsers.map((assistant) => ({
          name: assistant.name,
          initials: this.toInitials(assistant.name),
        })),
        color: this.levelToColor(this.toClassLevel(klass.course?.level ?? null)),
      }
    })

    const classIds = classRows.map((row) => row.id)
    const [assignmentRows, activityRows, folderStats, folderShared] = await Promise.all([
      this.repo.getAssessmentRows(classIds),
      this.repo.getActivitySeriesRows(classIds, 14),
      this.repo.getFolderResourceStats(folderPermissions.map((x) => x.folder.id)),
      this.repo.getFolderSharedCount(folderPermissions.map((x) => x.folder.id)),
    ])

    const classStudentMap = new Map<number, number>()
    classes.forEach((klass, index) => {
      classStudentMap.set(classRows[index].id, klass.studentCount)
    })

    const foldersByUpdated = folderPermissions
      .map((perm) => {
        const folder = perm.folder
        const stats = folderStats.get(folder.id)
        const updatedAt = stats?.updatedAt ?? new Date()
        return {
          id: folder.id,
          updatedAt,
          folder,
          itemCount: stats?.itemCount ?? 0,
        }
      })
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())

    const pinnedSet = new Set(foldersByUpdated.slice(0, 3).map((x) => x.id))
    const folders: LecturerFolder[] = foldersByUpdated.map((item) => {
      const classLevel = this.toClassLevel(item.folder.class?.course?.level ?? null)
      return {
        id: `fld-${item.id}`,
        name: item.folder.name,
        description: `${item.folder.class?.title ?? 'Shared class'} resources`,
        itemCount: item.itemCount,
        sizeBytes: Number(item.folder.totalSizeByte),
        updatedAt: item.updatedAt.toISOString(),
        sharedWith: folderShared.get(item.id) ?? 0,
        pinned: pinnedSet.has(item.id),
        tone: this.levelToTone(classLevel),
        classCode: item.folder.classId
          ? this.toClassCode(item.folder.classId, item.folder.class?.course?.level ?? null)
          : undefined,
      }
    })

    const assignments: LecturerAssignment[] = assignmentRows.map((row) => {
      const level = this.toClassLevel(row.level)
      const totalStudents = row.classId ? classStudentMap.get(row.classId) ?? 0 : 0
      const status = this.toAssignmentStatus(
        row.visibility,
        row.dueAt,
        row.submissions,
        totalStudents,
      )
      return {
        id: `asg-${row.id}`,
        title: row.title,
        classCode: this.toClassCode(row.classId ?? 0, row.level),
        className: row.className ?? 'Unknown class',
        level,
        type: this.toAssignmentType(row.sectionType),
        status,
        dueAt: (row.dueAt ?? new Date()).toISOString(),
        submissions: row.submissions,
        totalStudents,
        averageScore:
          typeof row.averageScore === 'number'
            ? Math.round(row.averageScore * 100) / 100
            : undefined,
        points: row.points ?? 0,
      }
    })

    const summary = {
      activeClasses: classes.filter((item) => item.status === 'active').length,
      totalStudents: classes
        .filter((item) => item.status === 'active')
        .reduce((sum, item) => sum + item.studentCount, 0),
      pendingGrading: assignments
        .filter((item) => item.status === 'grading')
        .reduce((sum, item) => sum + item.submissions, 0),
      upcomingDeadlines: assignments.filter((item) => item.status === 'published').length,
    }

    const series: LecturerActivityPoint[] = activityRows.map((row) => {
      const onTimeRate =
        row.onTimeTotal > 0
          ? Math.round((row.onTimeCount / row.onTimeTotal) * 100)
          : 0
      return {
        date: row.dayDate.toISOString(),
        label: row.dayDate.toLocaleDateString('en-US', {
          weekday: 'short',
          day: 'numeric',
        }),
        submissions: row.submissions,
        due: row.dueCount,
        onTimeRate,
      }
    })

    const last7 = series.slice(-7)
    const prev7 = series.slice(-14, -7)
    const weekTotal = last7.reduce((sum, point) => sum + point.submissions, 0)
    const prevTotal = prev7.reduce((sum, point) => sum + point.submissions, 0)
    const weekDelta =
      prevTotal > 0 ? Math.round(((weekTotal - prevTotal) / prevTotal) * 100) : 0
    const onTimeRate = last7.length
      ? Math.round(last7.reduce((sum, point) => sum + point.onTimeRate, 0) / last7.length)
      : 0

    return {
      profile: {
        name: user?.name ?? 'Lecturer',
        title: user?.lecturerProfile?.bio
          ? 'Senior Japanese Lecturer'
          : 'Japanese Lecturer',
        email: user?.email ?? 'unknown@torii.local',
        initials: this.toInitials(user?.name ?? 'Lecturer'),
        campus: user?.lecturerProfile?.location ?? 'Torii Nihongo Campus',
      },
      summary,
      classes,
      folders,
      assignments,
      activity: {
        series,
        summary: {
          weekTotal,
          onTimeRate,
          weekDelta,
        },
      },
    }
  }

  private toClassLevel(value: string | null | undefined): LecturerClassLevel {
    const input = (value ?? '').toUpperCase()
    if (input === 'N4' || input === 'N3' || input === 'N2' || input === 'N1') {
      return input
    }
    return 'N5'
  }

  private toClassCode(classId: number, levelRaw: string | null | undefined) {
    const level = this.toClassLevel(levelRaw)
    return `JP-${level}-C${String(classId).padStart(2, '0')}`
  }

  private toInitials(name: string) {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('')
  }

  private toClassStatus(
    isActive: boolean,
    hasUpcomingSession: boolean,
  ): 'active' | 'upcoming' | 'archived' {
    if (isActive && hasUpcomingSession) return 'active'
    if (hasUpcomingSession) return 'upcoming'
    return isActive ? 'active' : 'archived'
  }

  private toScheduleSummary(
    upcomingSessions: Array<{
      scheduledAt: Date
    }>,
  ) {
    if (!upcomingSessions.length) return 'No upcoming sessions'
    const nextTwo = upcomingSessions.slice(0, 2)
    return nextTwo
      .map((session) =>
        session.scheduledAt.toLocaleString('en-US', {
          weekday: 'short',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
      )
      .join(' · ')
  }

  private levelToTone(level: LecturerClassLevel) {
    const map: Record<LecturerClassLevel, LecturerFolder['tone']> = {
      N5: 'sky',
      N4: 'emerald',
      N3: 'amber',
      N2: 'violet',
      N1: 'rose',
    }
    return map[level] ?? 'slate'
  }

  private levelToColor(level: LecturerClassLevel): LecturerClass['color'] {
    const map: Record<LecturerClassLevel, LecturerClass['color']> = {
      N5: 'sky',
      N4: 'emerald',
      N3: 'amber',
      N2: 'violet',
      N1: 'rose',
    }
    return map[level] ?? 'slate'
  }

  private toAssignmentType(sectionType: string | null): LecturerAssignmentType {
    const type = (sectionType ?? '').toUpperCase()
    if (type === 'GRAMMAR') return 'quiz'
    if (type === 'LISTENING') return 'listening'
    if (type === 'READING') return 'reading'
    if (type === 'VOCAB') return 'kanji'
    return 'essay'
  }

  private toAssignmentStatus(
    visibility: 'PUBLIC' | 'PRIVATE' | 'UNLISTED',
    dueAt: Date | null,
    submissions: number,
    totalStudents: number,
  ): LecturerAssignmentStatus {
    const now = Date.now()
    if (visibility !== 'PUBLIC') return 'draft'
    if (!dueAt || dueAt.getTime() >= now) return 'published'
    if (submissions > 0 && submissions >= Math.max(1, totalStudents)) return 'returned'
    if (submissions > 0) return 'grading'
    return 'grading'
  }
}
