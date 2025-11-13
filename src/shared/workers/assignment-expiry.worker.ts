import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../services/prisma.service'
import { AssessmentAssignmentRepository } from '../../routes/assessment-assignment/assessment-assignment.repo'

@Injectable()
export class AssignmentExpiryWorker {
  private readonly logger = new Logger(AssignmentExpiryWorker.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly assignmentRepository: AssessmentAssignmentRepository,
  ) {}

  @Cron('0 * * * *') // Every hour at minute 0
  async handleAssignmentExpiry() {
    try {
      const now = new Date()
      // Tìm các assignment đã hết hạn nhưng vẫn có status là PENDING hoặc IN_PROGRESS
      // CHỈ lock những assignment có lockAfterDue = true
      const expiredAssignments = await this.prisma.assessmentAssignment.findMany({
        where: {
          dueAt: {
            lt: now, // Due date đã qua
          },
          status: {
            in: ['PENDING', 'IN_PROGRESS'], // Chỉ update những status chưa SUBMITTED hoặc EXPIRED
          },
          lockAfterDue: true, // CHỈ lock những assignment có lockAfterDue = true
        },
        include: {
          assessment: {
            select: {
              id: true,
              title: true,
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
            },
          },
          progresses: {
            select: {
              id: true,
              isSubmitted: true,
              startedAt: true,
            },
          },
        },
      })

      // Bulk update status thành EXPIRED
      const assignmentIds = expiredAssignments.map((a) => a.id)
      const updateResult = await this.prisma.assessmentAssignment.updateMany({
        where: {
          id: {
            in: assignmentIds,
          },
        },
        data: {
          status: 'EXPIRED',
        },
      })
    } catch (error) {
      this.logger.error('❌ Error processing assignment expiry check:', error)
    }
  }

  @Cron('0 0 * * *')
  async handleDailyAssignmentCleanup() {
    try {
      this.logger.log('🧹 Running daily assignment cleanup and statistics...')

      const now = new Date()
      const yesterday = new Date()
      yesterday.setDate(now.getDate() - 1)

      const expiredCount = await this.prisma.assessmentAssignment.count({
        where: {
          status: 'EXPIRED',
          updatedAt: {
            gte: yesterday,
          },
        },
      })

      const totalDueCount = await this.prisma.assessmentAssignment.count({
        where: {
          dueAt: {
            gte: yesterday,
            lt: now,
          },
        },
      })

      const tomorrow = new Date()
      tomorrow.setDate(now.getDate() + 1)

      const approachingDue = await this.prisma.assessmentAssignment.count({
        where: {
          dueAt: {
            gte: now,
            lt: tomorrow,
          },
          status: {
            in: ['PENDING', 'IN_PROGRESS'],
          },
          lockAfterDue: true,
        },
      })
    } catch (error) {
      this.logger.error('❌ Error in daily assignment cleanup:', error)
    }
  }

  async processExpiredAssignmentsManually() {
    await this.handleAssignmentExpiry()
  }

  async getOverdueAssignments() {
    const now = new Date()

    return await this.prisma.assessmentAssignment.findMany({
      where: {
        dueAt: {
          lt: now,
        },
        status: {
          in: ['PENDING', 'IN_PROGRESS'],
        },
        lockAfterDue: true,
      },
      include: {
        assessment: {
          select: {
            id: true,
            title: true,
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
          },
        },
        progresses: {
          select: {
            id: true,
            isSubmitted: true,
            startedAt: true,
          },
        },
      },
      orderBy: {
        dueAt: 'asc',
      },
    })
  }

  /**
   * Get assignments that are approaching their due date (within specified hours)
   */
  async getAssignmentsNearDue(hoursUntilDue: number = 24) {
    const now = new Date()
    const warningTime = new Date()
    warningTime.setHours(warningTime.getHours() + hoursUntilDue)

    return await this.prisma.assessmentAssignment.findMany({
      where: {
        dueAt: {
          gte: now,
          lte: warningTime,
        },
        status: {
          in: ['PENDING', 'IN_PROGRESS'],
        },
        lockAfterDue: true,
      },
      include: {
        assessment: {
          select: {
            id: true,
            title: true,
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
          },
        },
        progresses: {
          select: {
            id: true,
            isSubmitted: true,
            startedAt: true,
          },
        },
      },
      orderBy: {
        dueAt: 'asc',
      },
    })
  }

  async healthCheck() {
    try {
      const [overdueAssignments, nearDueCount] = await Promise.all([
        this.getOverdueAssignments(),
        this.getAssignmentsNearDue(24),
      ])

      const now = new Date()
      const last24h = new Date()
      last24h.setDate(now.getDate() - 1)

      const processedLast24h = await this.prisma.assessmentAssignment.count({
        where: {
          status: 'EXPIRED',
          updatedAt: {
            gte: last24h,
          },
        },
      })

      return {
        status: 'healthy',
        timestamp: now.toISOString(),
        overdueAssignments: overdueAssignments.length,
        assignmentsNearDue24h: nearDueCount.length,
        processedLast24h,
        lastCheck: 'Worker runs every hour to check for expired assignments',
        lockOnlyPolicy: 'Only assignments with lockAfterDue=true are automatically expired',
      }
    } catch (error) {
      this.logger.error('Health check failed:', error)
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
      }
    }
  }
}
