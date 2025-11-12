import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { AssessmentAssignmentRepository } from './assessment-assignment.repo'
import {
  CreateAssessmentAssignmentDTO,
  UpdateAssessmentAssignmentDTO,
  QueryAssessmentAssignmentDTO,
  MyAssignmentsQueryDTO,
} from './assessment-assignment.dto'

@Injectable()
export class AssessmentAssignmentService {
  constructor(private readonly assignmentRepository: AssessmentAssignmentRepository) {}

  async create(createDto: CreateAssessmentAssignmentDTO, assignedById: number) {
    const { assessmentId, assignedToId, classId, ...assignmentData } = createDto

    // Validate assessment exists
    const assessmentExists = await this.assignmentRepository.checkAssessmentExists(assessmentId)
    if (!assessmentExists) {
      throw new BadRequestException(`Assessment with ID ${assessmentId} does not exist`)
    }

    // Validate assignedTo user exists (if provided)
    if (assignedToId) {
      const userExists = await this.assignmentRepository.checkUserExists(assignedToId)
      if (!userExists) {
        throw new BadRequestException(`User with ID ${assignedToId} does not exist`)
      }
    }

    // Validate class exists (if provided)
    if (classId) {
      const classExists = await this.assignmentRepository.checkClassExists(classId)
      if (!classExists) {
        throw new BadRequestException(`Class with ID ${classId} does not exist`)
      }
    }

    const data: any = {
      ...assignmentData,
      assessmentId,
      assignedById,
      assignedToId: assignedToId || null,
      classId: classId || null,
      status: 'PENDING',
    }

    return this.assignmentRepository.create(data)
  }

  async findAll(queryDto: QueryAssessmentAssignmentDTO) {
    const { page, limit, assessmentId, assignedById, assignedToId, classId, status, isPastDue, sortBy, sortOrder } =
      queryDto

    const pageNum = Number(page) || 1
    const limitNum = Number(limit) || 10

    const where: any = {}

    if (assessmentId) where.assessmentId = assessmentId
    if (assignedById) where.assignedById = assignedById
    if (assignedToId) where.assignedToId = assignedToId
    if (classId) where.classId = classId
    if (status) where.status = status

    if (isPastDue !== undefined) {
      const now = new Date()
      if (isPastDue) {
        where.dueAt = { lt: now }
        where.status = { in: ['PENDING', 'IN_PROGRESS'] }
      } else {
        where.OR = [{ dueAt: null }, { dueAt: { gte: now } }]
      }
    }

    const orderBy: any = {}
    if (sortBy && sortOrder) {
      orderBy[sortBy] = sortOrder
    }

    return this.assignmentRepository.findManyWithPagination({
      page: pageNum,
      limit: limitNum,
      where,
      orderBy,
    })
  }

  async findOne(id: number) {
    const assignment = await this.assignmentRepository.findUnique({ id })
    if (!assignment) {
      throw new NotFoundException(`Assignment with ID ${id} not found`)
    }
    return assignment
  }

  async update(id: number, updateDto: UpdateAssessmentAssignmentDTO, userId: number) {
    const exists = await this.assignmentRepository.checkExists(id)
    if (!exists) {
      throw new NotFoundException(`Assignment with ID ${id} not found`)
    }

    // Get existing assignment to check ownership
    const existing = await this.assignmentRepository.findUnique({ id })
    if (!existing) {
      throw new NotFoundException(`Assignment with ID ${id} not found`)
    }
    if (existing.assignedById !== userId) {
      throw new ForbiddenException('You can only update assignments you created')
    }

    // Validate dates if provided
    if (updateDto.startAt && updateDto.dueAt) {
      if (updateDto.dueAt <= updateDto.startAt) {
        throw new BadRequestException('Due date must be after start date')
      }
    }

    return this.assignmentRepository.update({ id }, updateDto)
  }

  async remove(id: number, userId: number) {
    const exists = await this.assignmentRepository.checkExists(id)
    if (!exists) {
      throw new NotFoundException(`Assignment with ID ${id} not found`)
    }

    // Check ownership
    const existing = await this.assignmentRepository.findUnique({ id })
    if (!existing) {
      throw new NotFoundException(`Assignment with ID ${id} not found`)
    }
    if (existing.assignedById !== userId) {
      throw new ForbiddenException('You can only delete assignments you created')
    }

    return this.assignmentRepository.delete({ id })
  }

  async getStats(filters?: { assignedById?: number; classId?: number }) {
    const where: any = {}
    if (filters?.assignedById) where.assignedById = filters.assignedById
    if (filters?.classId) where.classId = filters.classId

    return this.assignmentRepository.getStats(where)
  }

  async getMyAssignments(userId: number, queryDto: MyAssignmentsQueryDTO) {
    const { page, limit, status, upcoming, overdue, sortBy, sortOrder } = queryDto

    // Convert page and limit to numbers to ensure Prisma receives correct types
    const pageNum = Number(page) || 1
    const limitNum = Number(limit) || 10

    return this.assignmentRepository.getMyAssignments({
      userId,
      page: pageNum,
      limit: limitNum,
      status,
      upcoming,
      overdue,
      sortBy,
      sortOrder,
    })
  }

  async getCreatedByMe(userId: number, queryDto: QueryAssessmentAssignmentDTO) {
    return this.findAll({
      ...queryDto,
      assignedById: userId,
    })
  }

  async getUserProgress(assignmentId: number, userId: number) {
    const assignmentExists = await this.assignmentRepository.checkExists(assignmentId)
    if (!assignmentExists) {
      throw new NotFoundException(`Assignment with ID ${assignmentId} not found`)
    }

    const progress = await this.assignmentRepository.getUserProgress(assignmentId, userId)
    if (!progress) {
      return {
        hasStarted: false,
        message: 'User has not started this assignment yet',
      }
    }

    return {
      hasStarted: true,
      progress,
    }
  }

  async getAssignmentProgresses(assignmentId: number, requesterId: number) {
    const assignment = await this.assignmentRepository.findUnique({ id: assignmentId })
    if (!assignment) {
      throw new NotFoundException(`Assignment with ID ${assignmentId} not found`)
    }

    // Only the creator can view all progresses
    if (assignment.assignedById !== requesterId) {
      throw new ForbiddenException('You can only view progresses for assignments you created')
    }

    const progresses = await this.assignmentRepository.getAssignmentProgresses(assignmentId)

    // Calculate statistics
    const stats = {
      total: progresses.length,
      started: progresses.filter((p) => p.startedAt).length,
      submitted: progresses.filter((p) => p.isSubmitted).length,
      notStarted: 0, // Would need to calculate based on assigned users
    }

    return {
      progresses,
      stats,
    }
  }

  async checkUserAccess(assignmentId: number, userId: number): Promise<boolean> {
    const assignment = await this.assignmentRepository.findUnique({ id: assignmentId })
    if (!assignment) {
      return false
    }

    // Check if directly assigned
    if (assignment.assignedToId === userId) {
      return true
    }

    // Check if assigned via class
    if (assignment.classId) {
      // Verify the user is actually a member of the target class
      const isMember = await this.assignmentRepository.isUserInClass(assignment.classId, userId)
      return isMember
    }

    return false
  }

  async isOverdue(assignmentId: number): Promise<boolean> {
    const assignment = await this.assignmentRepository.findUnique({ id: assignmentId })
    if (!assignment || !assignment.dueAt) {
      return false
    }

    const now = new Date()
    return assignment.dueAt < now && !['SUBMITTED', 'GRADED'].includes(assignment.status)
  }

  async getUpcoming(userId: number, days: number = 7) {
    const now = new Date()
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + days)

    return this.assignmentRepository.getMyAssignments({
      userId,
      upcoming: true,
      limit: 100,
      sortBy: 'dueAt',
      sortOrder: 'asc',
    })
  }

  async getOverdue(userId: number) {
    return this.assignmentRepository.getMyAssignments({
      userId,
      overdue: true,
      limit: 100,
      sortBy: 'dueAt',
      sortOrder: 'asc',
    })
  }
}
