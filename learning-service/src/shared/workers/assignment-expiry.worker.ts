// NOTE: This worker is assessment-related and should be moved to assessment-service
// All methods are stubbed to prevent build errors since assessment models don't exist in learning schema

import { Injectable, Logger } from '@nestjs/common'
// import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../services/prisma.service'
// import { AssessmentAssignmentRepository } from '../../routes/assessment-assignment/assessment-assignment.repo'

@Injectable()
export class AssignmentExpiryWorker {
  private readonly logger = new Logger(AssignmentExpiryWorker.name)

  constructor(
    private readonly prisma: PrismaService,
    // private readonly assignmentRepository: AssessmentAssignmentRepository,
  ) {
    this.logger.warn('AssignmentExpiryWorker is disabled - assessment models not in learning schema')
  }

  // @Cron('0 * * * *') // Every hour at minute 0
  async handleAssignmentExpiry() {
    this.logger.warn('handleAssignmentExpiry is disabled - moved to assessment-service')
    // TODO: Move to assessment-service
  }

  // @Cron('0 0 * * *')
  async handleDailyAssignmentCleanup() {
    this.logger.warn('handleDailyAssignmentCleanup is disabled - moved to assessment-service')
    // TODO: Move to assessment-service
  }

  async processExpiredAssignmentsManually() {
    this.logger.warn('processExpiredAssignmentsManually is disabled - moved to assessment-service')
    // TODO: Move to assessment-service
  }

  async getOverdueAssignments() {
    this.logger.warn('getOverdueAssignments is disabled - moved to assessment-service')
    return []
    // TODO: Move to assessment-service
  }

  /**
   * Get assignments that are approaching their due date (within specified hours)
   */
  async getAssignmentsNearDue(hoursUntilDue: number = 24) {
    this.logger.warn('getAssignmentsNearDue is disabled - moved to assessment-service')
    return []
    // TODO: Move to assessment-service
  }

  async healthCheck() {
    return {
      status: 'disabled',
      timestamp: new Date().toISOString(),
      message: 'AssignmentExpiryWorker is disabled - moved to assessment-service',
    }
  }
}
