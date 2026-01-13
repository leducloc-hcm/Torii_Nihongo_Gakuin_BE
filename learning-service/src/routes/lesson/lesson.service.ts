import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { LessonRepository } from './lesson.repo'
import { CreateLessonDTO, UpdateLessonDTO, QueryLessonDTO } from './lesson.dto'
import { LessonWithRelations, LessonWhereInput, LessonOrderByInput } from './lesson.model'
import { S3Service } from 'src/shared/services/s3.service'
import { SharedUserRepository } from 'src/shared/repositories/shared-user.repo'
import { EnrollmentRepository } from '../enrollment/enrollment.repo'
import { LessonStatus } from 'src/shared/constants/media.constant'

@Injectable()
export class LessonService {
  constructor(
    private readonly lessonRepository: LessonRepository,
    private readonly s3Service: S3Service,
    private readonly sharedUserRepo: SharedUserRepository,
    private readonly enrollmentRepository: EnrollmentRepository,
  ) {}

  async create(createLessonDto: CreateLessonDTO): Promise<LessonWithRelations> {
    const { moduleId, title, kind, content, durationSec, order, status } = createLessonDto

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
      durationSec,
      order: lessonOrder,
      status,
    })
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
    if (lesson.status !== LessonStatus.PUBLISHED && lesson.status !== LessonStatus.GLOBAL_PUBLIC) {
      throw new BadRequestException('Lesson is not published')
    }
    const streamInfo = await this.lessonRepository.generatePublicStreamUrl(lessonId)
    return streamInfo
  }
  async generateUploadUrl(body: { lessonId: number; filename: string; contentType: string }, userId: number) {
    const user = await this.sharedUserRepo.findUnique({ id: userId })
    if (!user) {
      throw new NotFoundException('User not found')
    }
    const lesson = await this.lessonRepository.findOne({ id: body.lessonId })
    if (!lesson) {
      throw new NotFoundException('Lesson not found')
    }
    const result = await this.lessonRepository.generateUploadUrl(body.lessonId, body.filename, body.contentType)
    return {
      message: 'Presigned upload URL generated successfully',
      data: result,
    }
  }

  async generateMaterialUploadUrl(body: { lessonId: number; filename: string; contentType: string }, userId: number) {
    const user = await this.sharedUserRepo.findUnique({ id: userId })
    if (!user) {
      throw new NotFoundException('User not found')
    }
    const lesson = await this.lessonRepository.findOne({ id: body.lessonId })
    if (!lesson) {
      throw new NotFoundException('Lesson not found')
    }
    const result = await this.lessonRepository.generateMaterialUploadUrl(body.lessonId, body.filename, body.contentType)
    return {
      message: 'Presigned material upload URL generated successfully',
      data: result,
    }
  }

  async getPublicStreamUrl(lessonId: number) {
    const lesson = await this.lessonRepository.findOne({ id: lessonId })
    if (!lesson) {
      throw new NotFoundException('Lesson not found')
    }
    if (lesson.status !== LessonStatus.GLOBAL_PUBLIC) {
      throw new BadRequestException('Lesson is not public for global access')
    }
    const streamInfo = await this.lessonRepository.generatePublicStreamUrl(lessonId)
    return streamInfo
  }
}
