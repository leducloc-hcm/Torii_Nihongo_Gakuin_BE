import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { AssessmentProgressRepository } from './assessment-progress.repo'
import { AssessmentAssignmentService } from '../assessment-assignment/assessment-assignment.service'
import {
  CreateAssessmentProgressDTO,
  UpdateAssessmentProgressDTO,
  QueryAssessmentProgressDTO,
  SaveAnswerProgressDTO,
  UpdateAnswerProgressDTO,
  SubmitAssessmentDTO,
  StartAssessmentDTO,
  AutoSaveProgressDTO,
} from './assessment-progress.dto'

@Injectable()
export class AssessmentProgressService {
  constructor(
    private readonly progressRepository: AssessmentProgressRepository,
    private readonly assignmentService: AssessmentAssignmentService,
  ) {}

  private calculateTimeSpent(startedAt: Date, lastSavedAt?: Date | null): number {
    const endTime = lastSavedAt ? new Date(lastSavedAt) : new Date()
    const startTime = new Date(startedAt)
    const diffMs = endTime.getTime() - startTime.getTime()
    return Math.floor(diffMs / 1000) // Convert milliseconds to seconds
  }

  private enrichProgressWithTimeSpent(progress: any): any {
    if (!progress) return progress

    const timeSpentSec = this.calculateTimeSpent(progress.startedAt, progress.lastSavedAt)

    return {
      ...progress,
      timeSpentSec,
    }
  }

  async startAssessment(startDto: StartAssessmentDTO, userId: number) {
    const { assessmentId, assignmentId } = startDto

    const assessmentExists = await this.progressRepository.checkAssessmentExists(assessmentId)
    if (!assessmentExists) {
      throw new BadRequestException(`Assessment with ID ${assessmentId} does not exist`)
    }

    const progressData: any = {
      assessment: { connect: { id: assessmentId } },
      user: { connect: { id: userId } },
      currentSection: 0,
      currentQuestion: 0,
      timeSpentSec: 0,
      isSubmitted: false,
    }

    if (assignmentId) {
      // Verify user has access to the assignment (either directly assigned or class member)
      const hasAccess = await this.assignmentService.checkUserAccess(assignmentId, userId)
      if (!hasAccess) {
        throw new ForbiddenException('You do not have access to this assignment')
      }

      progressData.assignment = { connect: { id: assignmentId } }
    }

    const progress = await this.progressRepository.create(progressData)

    return {
      message: 'Assessment started successfully',
      progress: this.enrichProgressWithTimeSpent(progress),
    }
  }

  async saveAnswer(saveDto: SaveAnswerProgressDTO, userId: number) {
    const { progressId, questionId, selectedOptionId, timeSpentSec, isFlagged } = saveDto

    const progress = await this.progressRepository.findUnique({ id: progressId })
    if (!progress) {
      throw new NotFoundException(`Progress with ID ${progressId} not found`)
    }
    if (progress.userId !== userId) {
      throw new ForbiddenException('You do not have access to this progress')
    }
    if (progress.isSubmitted) {
      throw new BadRequestException('Cannot modify answers after submission')
    }

    const existingAnswer = await this.progressRepository.findAnswerByProgressAndQuestion(progressId, questionId)

    if (existingAnswer) {
      return this.progressRepository.updateAnswer(
        { id: existingAnswer.id },
        {
          selectedOption: selectedOptionId ? { connect: { id: selectedOptionId } } : { disconnect: true },
          timeSpentSec,
          isFlagged,
          lastUpdatedAt: new Date(),
        },
      )
    } else {
      // Create new answer
      const answerData: any = {
        progress: { connect: { id: progressId } },
        question: { connect: { id: questionId } },
        timeSpentSec: timeSpentSec || 0,
        isFlagged: isFlagged || false,
      }

      if (selectedOptionId) {
        answerData.selectedOption = { connect: { id: selectedOptionId } }
      }

      return this.progressRepository.createAnswer(answerData)
    }
  }

  // ============= UPDATE ANSWER =============

  async updateAnswer(answerId: number, updateDto: UpdateAnswerProgressDTO, userId: number) {
    const answer = await this.progressRepository.findAnswer({ id: answerId })
    if (!answer) {
      throw new NotFoundException(`Answer with ID ${answerId} not found`)
    }

    // Check ownership
    if (answer.progress.userId !== userId) {
      throw new ForbiddenException('You do not have access to this answer')
    }

    // Check if progress is submitted
    if (answer.progress.isSubmitted) {
      throw new BadRequestException('Cannot modify answers after submission')
    }

    const updateData: any = {
      lastUpdatedAt: new Date(),
    }

    if (updateDto.selectedOptionId !== undefined) {
      if (updateDto.selectedOptionId === null) {
        updateData.selectedOption = { disconnect: true }
      } else {
        updateData.selectedOption = { connect: { id: updateDto.selectedOptionId } }
      }
    }

    if (updateDto.timeSpentSec !== undefined) {
      updateData.timeSpentSec = updateDto.timeSpentSec
    }

    if (updateDto.isFlagged !== undefined) {
      updateData.isFlagged = updateDto.isFlagged
    }

    return this.progressRepository.updateAnswer({ id: answerId }, updateData)
  }

  // ============= AUTO SAVE PROGRESS =============

  async autoSave(autoSaveDto: AutoSaveProgressDTO, userId: number) {
    const { progressId, currentSection, currentQuestion, timeSpentSec } = autoSaveDto

    const progress = await this.progressRepository.findUnique({ id: progressId })
    if (!progress) {
      throw new NotFoundException(`Progress with ID ${progressId} not found`)
    }
    if (progress.userId !== userId) {
      throw new ForbiddenException('You do not have access to this progress')
    }
    if (progress.isSubmitted) {
      throw new BadRequestException('Cannot modify submitted assessment')
    }

    const updateData: any = {}
    if (currentSection !== undefined) updateData.currentSection = currentSection
    if (currentQuestion !== undefined) updateData.currentQuestion = currentQuestion
    if (timeSpentSec !== undefined) updateData.timeSpentSec = timeSpentSec

    return this.progressRepository.update({ id: progressId }, updateData)
  }

  // ============= SUBMIT ASSESSMENT =============

  async submitAssessment(submitDto: SubmitAssessmentDTO, userId: number) {
    const { progressId } = submitDto

    const progress = await this.progressRepository.findUnique({ id: progressId })
    if (!progress) {
      throw new NotFoundException(`Progress with ID ${progressId} not found`)
    }
    if (progress.userId !== userId) {
      throw new ForbiddenException('You do not have access to this progress')
    }
    if (progress.isSubmitted) {
      throw new BadRequestException('Assessment already submitted')
    }

    // Mark as submitted
    const updated = await this.progressRepository.update(
      { id: progressId },
      {
        isSubmitted: true,
        completedAt: new Date(),
      },
    )

    return {
      message: 'Assessment submitted successfully',
      progress: updated,
    }
  }

  // ============= GET PROGRESS =============

  async getMyProgress(assessmentId: number, userId: number) {
    const progress = await this.progressRepository.getProgressByUserAndAssessment(userId, assessmentId)
    if (!progress) {
      return {
        hasStarted: false,
        message: 'You have not started this assessment yet',
      }
    }

    return {
      hasStarted: true,
      progress: this.enrichProgressWithTimeSpent(progress),
    }
  }

  async getProgressById(progressId: number, userId: number) {
    const progress = await this.progressRepository.findUnique({ id: progressId })
    if (!progress) {
      throw new NotFoundException(`Progress with ID ${progressId} not found`)
    }
    if (progress.userId !== userId) {
      throw new ForbiddenException('You do not have access to this progress')
    }

    return this.enrichProgressWithTimeSpent(progress)
  }

  async getAllMyProgresses(userId: number, queryDto: QueryAssessmentProgressDTO) {
    const { page, limit, assessmentId, assignmentId, isSubmitted, sortBy, sortOrder } = queryDto

    const where: any = { userId }
    if (assessmentId) where.assessmentId = assessmentId
    if (assignmentId) where.assignmentId = assignmentId
    if (isSubmitted !== undefined) where.isSubmitted = isSubmitted

    const orderBy: any = {}
    if (sortBy && sortOrder) {
      orderBy[sortBy] = sortOrder
    }

    const result = await this.progressRepository.findManyWithPagination({
      page,
      limit,
      where,
      orderBy,
    })

    // Enrich each progress item with computed timeSpentSec
    return {
      ...result,
      items: result.items.map((progress) => this.enrichProgressWithTimeSpent(progress)),
    }
  }

  // ============= GET ANSWERS =============

  async getMyAnswers(progressId: number, userId: number) {
    const progress = await this.progressRepository.findUnique({ id: progressId })
    if (!progress) {
      throw new NotFoundException(`Progress with ID ${progressId} not found`)
    }
    if (progress.userId !== userId) {
      throw new ForbiddenException('You do not have access to this progress')
    }

    return this.progressRepository.findManyAnswers(progressId)
  }

  // ============= DELETE PROGRESS =============

  async deleteProgress(progressId: number, userId: number) {
    const progress = await this.progressRepository.findUnique({ id: progressId })
    if (!progress) {
      throw new NotFoundException(`Progress with ID ${progressId} not found`)
    }
    if (progress.userId !== userId) {
      throw new ForbiddenException('You can only delete your own progress')
    }
    if (progress.isSubmitted) {
      throw new BadRequestException('Cannot delete submitted assessment')
    }

    await this.progressRepository.delete({ id: progressId })
    return { message: 'Progress deleted successfully' }
  }

  // ============= STATS & ADMIN =============

  async getUserStats(userId: number) {
    const [completedCount, inProgressCount] = await Promise.all([
      this.progressRepository.getCompletedCount(userId),
      this.progressRepository.getInProgressCount(userId),
    ])

    return {
      completed: completedCount,
      inProgress: inProgressCount,
      total: completedCount + inProgressCount,
    }
  }

  async getAssessmentStats(assessmentId: number) {
    const progresses = await this.progressRepository.getAssessmentProgresses(assessmentId)
    const averageTime = await this.progressRepository.getAverageTimeSpent(assessmentId)

    return {
      total: progresses.length,
      completed: progresses.filter((p) => p.isSubmitted).length,
      inProgress: progresses.filter((p) => !p.isSubmitted).length,
      averageTimeSpentSec: Math.round(averageTime),
    }
  }

  // ============= ADMIN ENDPOINTS =============

  async getAllProgresses(queryDto: QueryAssessmentProgressDTO) {
    const { page, limit, userId, assessmentId, assignmentId, isSubmitted, sortBy, sortOrder } = queryDto

    const where: any = {}
    if (userId) where.userId = userId
    if (assessmentId) where.assessmentId = assessmentId
    if (assignmentId) where.assignmentId = assignmentId
    if (isSubmitted !== undefined) where.isSubmitted = isSubmitted

    const orderBy: any = {}
    if (sortBy && sortOrder) {
      orderBy[sortBy] = sortOrder
    }

    return this.progressRepository.findManyWithPagination({
      page,
      limit,
      where,
      orderBy,
    })
  }
}
