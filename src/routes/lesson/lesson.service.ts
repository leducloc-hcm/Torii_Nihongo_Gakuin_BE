import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { LessonRepository } from './lesson.repo'
import { CreateLessonDTO, UpdateLessonDTO, QueryLessonDTO } from './lesson.dto'
import { LessonWithRelations, LessonWhereInput, LessonOrderByInput } from './lesson.model'
import { S3Service } from 'src/shared/services/s3.service'
import { SharedUserRepository } from 'src/shared/repositories/shared-user.repo'
import { EnrollmentRepository } from '../enrollment/enrollment.repo'

@Injectable()
export class LessonService {
  constructor(
    private readonly lessonRepository: LessonRepository,
    private readonly s3Service: S3Service,
    private readonly sharedUserRepo: SharedUserRepository,
    private readonly enrollmentRepository: EnrollmentRepository,
  ) {}

  async create(createLessonDto: CreateLessonDTO): Promise<LessonWithRelations> {
    const { moduleId, title, kind, content, videoUrl, durationSec, order, status } = createLessonDto

    // Check if module exists
    const moduleExists = await this.lessonRepository.checkModuleExists(moduleId)
    if (!moduleExists) {
      throw new BadRequestException(`Module with ID ${moduleId} does not exist`)
    }

    // If no order is provided, set it to the next available order
    let lessonOrder = order
    if (lessonOrder === undefined) {
      const maxOrder = await this.lessonRepository.getMaxOrder(moduleId)
      lessonOrder = maxOrder + 1
    }

    return this.lessonRepository.create({
      moduleId,
      title,
      kind,
      content,
      videoUrl,
      durationSec,
      order: lessonOrder,
      status,
    })
  }

  async findAll(queryDto: QueryLessonDTO) {
    const { page, limit, search, moduleId, kind, status, sortBy, sortOrder } = queryDto
    const skip = (page - 1) * limit

    // Build where clause
    const where: LessonWhereInput = {}

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (moduleId) {
      where.moduleId = moduleId
    }

    if (kind) {
      where.kind = kind
    }

    if (status) {
      where.status = status
    }

    // Build orderBy clause
    const orderBy: LessonOrderByInput = {}
    if (sortBy === 'order') {
      orderBy.order = sortOrder
    } else if (sortBy === 'title') {
      orderBy.title = sortOrder
    } else if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder
    }

    const { lessons, total } = await this.lessonRepository.findAll({
      skip,
      take: limit,
      where,
      orderBy,
    })

    return {
      data: lessons,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async findOne(id: number): Promise<LessonWithRelations> {
    const lesson = await this.lessonRepository.findOne({ id })

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${id} not found`)
    }

    return lesson
  }

  async update(id: number, updateLessonDto: UpdateLessonDTO): Promise<LessonWithRelations> {
    // Check if lesson exists
    await this.findOne(id)

    return this.lessonRepository.update({
      where: { id },
      data: updateLessonDto,
    })
  }

  async remove(id: number): Promise<LessonWithRelations> {
    // Check if lesson exists
    const lesson = await this.findOne(id)

    // Delete the lesson (cascade will handle related entities)
    await this.lessonRepository.delete({ id })

    return lesson
  }

  async findByModule(moduleId: number, queryDto: Omit<QueryLessonDTO, 'moduleId'>) {
    const { page, limit, search, kind, status, sortBy, sortOrder } = queryDto
    const skip = (page - 1) * limit

    // Build where clause (excluding moduleId since it's passed separately)
    const where: Omit<LessonWhereInput, 'moduleId'> = {}

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (kind) {
      where.kind = kind
    }

    if (status) {
      where.status = status
    }

    // Build orderBy clause
    const orderBy: LessonOrderByInput = {}
    if (sortBy === 'order') {
      orderBy.order = sortOrder
    } else if (sortBy === 'title') {
      orderBy.title = sortOrder
    } else if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder
    }

    const { lessons, total } = await this.lessonRepository.findByModule(moduleId, {
      skip,
      take: limit,
      where,
      orderBy,
    })

    return {
      data: lessons,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async reorderLessons(moduleId: number, lessonOrders: { id: number; order: number }[]): Promise<void> {
    // Check if module exists
    const moduleExists = await this.lessonRepository.checkModuleExists(moduleId)
    if (!moduleExists) {
      throw new BadRequestException(`Module with ID ${moduleId} does not exist`)
    }

    // Validate that all lesson IDs exist and belong to the module
    const lessonIds = lessonOrders.map((l) => l.id)
    const { lessons } = await this.lessonRepository.findByModule(moduleId, {
      take: 1000, // Large number to get all lessons
    })

    const existingLessonIds = lessons.map((l) => l.id)
    const invalidIds = lessonIds.filter((id) => !existingLessonIds.includes(id))

    if (invalidIds.length > 0) {
      throw new BadRequestException(`Lesson IDs [${invalidIds.join(', ')}] do not exist in module ${moduleId}`)
    }

    await this.lessonRepository.reorderLessons(moduleId, lessonOrders)
  }

  async getPublishedLessons(queryDto: Omit<QueryLessonDTO, 'status'>) {
    const { page, limit, search, moduleId, kind, sortBy, sortOrder } = queryDto
    const skip = (page - 1) * limit

    // Build where clause (excluding status since it's set to PUBLISHED)
    const where: Omit<LessonWhereInput, 'status'> = {}

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (moduleId) {
      where.moduleId = moduleId
    }

    if (kind) {
      where.kind = kind
    }

    // Build orderBy clause
    const orderBy: LessonOrderByInput = {}
    if (sortBy === 'order') {
      orderBy.order = sortOrder
    } else if (sortBy === 'title') {
      orderBy.title = sortOrder
    } else if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder
    }

    const { lessons, total } = await this.lessonRepository.getPublishedLessons({
      skip,
      take: limit,
      where,
      orderBy,
    })

    return {
      data: lessons,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async findByCourse(courseId: number, queryDto: Omit<QueryLessonDTO, 'moduleId'>) {
    const { page, limit, search, kind, status, sortBy, sortOrder } = queryDto
    const skip = (page - 1) * limit

    // Build where clause (excluding moduleId since it's determined by courseId)
    const where: Omit<LessonWhereInput, 'moduleId'> = {}

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (kind) {
      where.kind = kind
    }

    if (status) {
      where.status = status
    }

    // Build orderBy clause
    const orderBy: LessonOrderByInput = {}
    if (sortBy === 'order') {
      orderBy.order = sortOrder
    } else if (sortBy === 'title') {
      orderBy.title = sortOrder
    } else if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder
    }

    const { lessons, total } = await this.lessonRepository.findByCourse(courseId, {
      skip,
      take: limit,
      where,
      orderBy,
    })

    return {
      data: lessons,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }
  async generateStreamUrl(lessonId: number, userId: number) {
    const user = await this.sharedUserRepo.findUnique({ id: userId })
    if (!user) {
      throw new NotFoundException('User not found')
    }
    const lesson = await this.lessonRepository.findOne({ id: lessonId })
    if (!lesson) {
      throw new NotFoundException('Lesson not found')
    }
    const enrollment = await this.enrollmentRepository.findByUserAndCourse(userId, lesson.module.course.id)
    if (!enrollment) {
      throw new BadRequestException('User is not enrolled in the course for this lesson')
    }
    if (lesson.status !== 'PUBLISHED') {
      throw new BadRequestException('Lesson is not published')
    }
    const streamInfo = await this.s3Service.generatePresignedStreamUrl(
      enrollment.course.id,
      lesson.module.id,
      lesson.id,
    )
    return streamInfo
  }
}
