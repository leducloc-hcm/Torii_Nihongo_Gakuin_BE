import { Injectable } from '@nestjs/common'
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

    const [total, pending, inProgress, submitted, graded, overdue] = await Promise.all([
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
        where: { ...where, status: 'GRADED' },
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
      graded,
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
}
