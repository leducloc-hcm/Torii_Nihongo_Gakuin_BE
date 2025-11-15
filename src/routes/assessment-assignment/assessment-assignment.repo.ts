import { Injectable } from '@nestjs/common'
import { AssignmentStatus } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'

@Injectable()
export class AssessmentAssignmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly defaultInclude = {
    assessment: {
      select: {
        id: true,
        title: true,
        level: true,
        type: true,
      },
    },
    assignedBy: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
    assignedTo: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
    class: {
      select: {
        id: true,
        title: true,
      },
    },
    _count: {
      select: {
        progresses: true,
      },
    },
  }

  async create(data: any) {
    return await this.prisma.assessmentAssignment.create({
      data,
      include: this.defaultInclude,
    })
  }
  async updateStatus(id: number, status: AssignmentStatus) {
    return await this.prisma.assessmentAssignment.update({
      where: { id },
      data: { status },
    })
  }

  async findMany(params: { skip?: number; take?: number; where?: any; orderBy?: any; include?: any }) {
    const { skip, take, where, orderBy, include } = params

    return await this.prisma.assessmentAssignment.findMany({
      skip,
      take,
      where,
      orderBy,
      include: include || this.defaultInclude,
    })
  }

  async findUnique(where: any, include?: any) {
    return await this.prisma.assessmentAssignment.findUnique({
      where,
      include: include || this.defaultInclude,
    })
  }

  async findManyWithPagination(params: { page?: number; limit?: number; where?: any; orderBy?: any }): Promise<{
    data: any[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }> {
    const { page = 1, limit = 10, where, orderBy } = params

    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      this.prisma.assessmentAssignment.findMany({
        skip,
        take: limit,
        where,
        orderBy,
        include: this.defaultInclude,
      }),
      this.prisma.assessmentAssignment.count({ where }),
    ])

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    }
  }

  async update(where: any, data: any) {
    return await this.prisma.assessmentAssignment.update({
      where,
      data,
      include: this.defaultInclude,
    })
  }

  async delete(where: any) {
    return await this.prisma.assessmentAssignment.delete({
      where,
    })
  }

  async count(where?: any): Promise<number> {
    return await this.prisma.assessmentAssignment.count({ where })
  }

  async checkExists(id: number): Promise<boolean> {
    const count = await this.prisma.assessmentAssignment.count({
      where: { id },
    })
    return count > 0
  }

  async checkAssessmentExists(assessmentId: number): Promise<boolean> {
    const count = await this.prisma.assessmentPaper.count({
      where: { id: assessmentId },
    })
    return count > 0
  }

  async checkUserExists(userId: number): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { id: userId },
    })
    return count > 0
  }

  async checkClassExists(classId: number): Promise<boolean> {
    const count = await this.prisma.class.count({
      where: { id: classId },
    })
    return count > 0
  }

  async isUserInClass(classId: number, userId: number): Promise<boolean> {
    const count = await this.prisma.classMember.count({
      where: { classId, userId },
    })
    return count > 0
  }

  async getStats(where?: any) {
    const now = new Date()

    const [total, pending, inProgress, submitted, expired, overdue] = await Promise.all([
      this.prisma.assessmentAssignment.count({ where }),
      this.prisma.assessmentAssignment.count({
        where: { ...where, status: 'PENDING' },
      }),
      this.prisma.assessmentAssignment.count({
        where: { ...where, status: 'IN_PROGRESS' },
      }),
      this.prisma.assessmentAssignment.count({
        where: { ...where, status: 'SUBMITTED' },
      }),
      this.prisma.assessmentAssignment.count({
        where: { ...where, status: 'EXPIRED' },
      }),
      this.prisma.assessmentAssignment.count({
        where: {
          ...where,
          dueAt: { lt: now },
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
      }),
    ])

    return {
      total,
      pending,
      inProgress,
      submitted,
      expired,
      overdue,
    }
  }

  async getMyAssignments(params: {
    userId: number
    page?: number
    limit?: number
    status?: string
    upcoming?: boolean
    overdue?: boolean
    sortBy?: string
    sortOrder?: string
  }) {
    const { userId, page = 1, limit = 10, status, upcoming, overdue, sortBy = 'dueAt', sortOrder = 'asc' } = params

    const skip = (page - 1) * limit
    const now = new Date()

    // Build where clause
    const where: any = {
      OR: [
        { assignedToId: userId },
        {
          class: {
            members: {
              some: {
                userId: userId,
              },
            },
          },
        },
      ],
    }

    if (status) {
      where.status = status
    }

    if (upcoming) {
      where.startAt = { gte: now }
    }

    if (overdue) {
      where.dueAt = { lt: now }
      where.status = { in: ['PENDING', 'IN_PROGRESS'] }
    }

    const orderBy: any = {}
    if (sortBy && sortOrder) {
      orderBy[sortBy] = sortOrder
    }

    const [data, total] = await Promise.all([
      this.prisma.assessmentAssignment.findMany({
        skip,
        take: limit,
        where,
        orderBy,
        include: {
          ...this.defaultInclude,
          progresses: {
            where: { userId },
            select: {
              id: true,
              isSubmitted: true,
              completedAt: true,
              timeSpentSec: true,
            },
          },
        },
      }),
      this.prisma.assessmentAssignment.count({ where }),
    ])

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    }
  }

  async getUserProgress(assignmentId: number, userId: number) {
    return await this.prisma.assessmentProgress.findFirst({
      where: {
        assignmentId,
        userId,
      },
      include: {
        answers: {
          include: {
            question: {
              select: {
                id: true,
                type: true,
                stem: true,
              },
            },
            selectedOption: true,
          },
        },
      },
    })
  }

  /**
   * Get all progresses for an assignment
   */
  async getAssignmentProgresses(assignmentId: number) {
    return await this.prisma.assessmentProgress.findMany({
      where: { assignmentId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            answers: true,
          },
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
    })
  }

  // ============= STUDENT PROGRESS TRACKING =============

  /**
   * Get all students in class and their assignment progress
   * Includes attempt count, submission dates, and status
   */
  async getStudentsProgressForAssignment(assignmentId: number) {
    const assignment = await this.findUnique({ id: assignmentId })
    if (!assignment) {
      throw new Error('Assignment not found')
    }

    let students: any[] = []

    // Get students based on assignment type
    if (assignment.assignedToId) {
      // Individual assignment
      const user = await this.prisma.user.findUnique({
        where: { id: assignment.assignedToId },
        select: {
          id: true,
          name: true,
          email: true,
        },
      })
      if (user) students = [user]
    } else if (assignment.classId) {
      // Class assignment
      const classMembers = await this.prisma.classMember.findMany({
        where: { classId: assignment.classId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })
      students = classMembers.map((member) => member.user)
    }

    // Get progress for each student
    const studentsWithProgress = await Promise.all(
      students.map(async (student) => {
        // Count total attempts
        const totalAttempts = await this.prisma.assessmentProgress.count({
          where: {
            assignmentId,
            userId: student.id,
          },
        })

        // Count submitted attempts
        const submittedAttempts = await this.prisma.assessmentProgress.count({
          where: {
            assignmentId,
            userId: student.id,
            isSubmitted: true,
          },
        })

        // Get latest progress
        const latestProgress = await this.prisma.assessmentProgress.findFirst({
          where: {
            assignmentId,
            userId: student.id,
          },
          orderBy: {
            startedAt: 'desc',
          },
          include: {
            attempts: {
              select: {
                id: true,
                score: true,
                submittedAt: true,
              },
              orderBy: {
                submittedAt: 'desc',
              },
              take: 1,
            },
          },
        })

        // Get all attempts with scores
        const attempts = await this.prisma.assessmentAttempt.findMany({
          where: {
            progress: {
              assignmentId,
              userId: student.id,
            },
          },
          select: {
            id: true,
            score: true,
            submittedAt: true,
            userId: true,
            assessmentId: true,
          },
          orderBy: {
            submittedAt: 'desc',
          },
        })

        let status = 'NOT_STARTED'
        if (totalAttempts > 0) {
          if (submittedAttempts > 0) {
            status = 'SUBMITTED'
          } else {
            status = 'IN_PROGRESS'
          }
        }

        return {
          student,
          status,
          totalAttempts,
          submittedAttempts,
          latestProgress: latestProgress
            ? {
                id: latestProgress.id,
                startedAt: latestProgress.startedAt,
                completedAt: latestProgress.completedAt,
                isSubmitted: latestProgress.isSubmitted,
                latestScore: attempts.length > 0 ? attempts[0].score : null,
              }
            : null,
          attempts: attempts.map((attempt) => ({
            id: attempt.id,
            score: attempt.score,
            submittedAt: attempt.submittedAt,
            userId: attempt.userId,
          })),
        }
      }),
    )

    return {
      assignment: {
        id: assignment.id,
        note: assignment.note,
        dueAt: assignment.dueAt,
        maxAttempts: assignment.maxAttempts,
        assessment: assignment.assessment,
      },
      students: studentsWithProgress,
      summary: {
        totalStudents: students.length,
        notStarted: studentsWithProgress.filter((s) => s.status === 'NOT_STARTED').length,
        inProgress: studentsWithProgress.filter((s) => s.status === 'IN_PROGRESS').length,
        submitted: studentsWithProgress.filter((s) => s.status === 'SUBMITTED').length,
      },
    }
  }

  /**
   * Get detailed progress for a specific student
   * Shows all attempts, detailed scores, and answer breakdown
   */
  async getStudentDetailedProgressForAssignment(assignmentId: number, studentId: number) {
    const assignment = await this.findUnique({ id: assignmentId })
    if (!assignment) {
      throw new Error('Assignment not found')
    }

    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    if (!student) {
      throw new Error('Student not found')
    }

    // Get all progress records for this student
    const progresses = await this.prisma.assessmentProgress.findMany({
      where: {
        assignmentId,
        userId: studentId,
      },
      include: {
        answers: {
          include: {
            question: {
              select: {
                id: true,
                stem: true,
                type: true,
              },
            },
            selectedOption: {
              select: {
                id: true,
                content: true,
                isCorrect: true,
              },
            },
          },
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
    })

    // Get all attempts for this student's progresses
    const allAttempts = await this.prisma.assessmentAttempt.findMany({
      where: {
        progress: {
          assignmentId,
          userId: studentId,
        },
      },
      select: {
        id: true,
        score: true,
        submittedAt: true,
        userId: true,
        assessmentId: true,
        progressId: true,
      },
      orderBy: {
        submittedAt: 'desc',
      },
    })

    // Calculate statistics
    const totalAttempts = progresses.length
    const submittedAttempts = progresses.filter((p) => p.isSubmitted).length
    const bestScore = allAttempts.length > 0 ? Math.max(...allAttempts.map((a) => a.score || 0)) : null
    const latestScore = allAttempts.length > 0 ? allAttempts[0]?.score || null : null
    const averageScore =
      allAttempts.length > 0 ? allAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / allAttempts.length : null

    return {
      assignment: {
        id: assignment.id,
        note: assignment.note,
        dueAt: assignment.dueAt,
        maxAttempts: assignment.maxAttempts,
        assessment: assignment.assessment,
      },
      student,

      attempts: allAttempts.map((attempt) => ({
        id: attempt.id,
        score: attempt.score,
        submittedAt: attempt.submittedAt,
        progressId: attempt.progressId,
      })),
      progresses: progresses.map((progress) => ({
        id: progress.id,
        startedAt: progress.startedAt,
        completedAt: progress.completedAt,
        isSubmitted: progress.isSubmitted,
        timeSpentSec: progress.timeSpentSec,
        answersCount: progress.answers.length,
      })),
    }
  }
}
