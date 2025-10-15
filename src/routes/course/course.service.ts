import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { CourseRepository } from './course.repo'
import { CreateCourseDTO, UpdateCourseDTO, QueryCourseDTO } from './course.dto'
import { CourseWithRelations, CourseWhereInput, CourseOrderByInput } from './course.model'
import { S3Service } from 'src/shared/services/s3.service'

@Injectable()
export class CourseService {
  constructor(
    private readonly courseRepository: CourseRepository,
    private readonly s3Service: S3Service,
  ) {}

  async create(
    createCourseDto: CreateCourseDTO,
    userId: number,
    thumbnailFile?: Express.Multer.File,
  ): Promise<CourseWithRelations> {
    const { slug, lecturerIds, ...courseData } = createCourseDto

    // Check if slug already exists
    const slugExists = await this.courseRepository.checkSlugExists(slug)
    if (slugExists) {
      throw new ConflictException(`Course with slug '${slug}' already exists`)
    }

    // Validate lecturer exists if provided
    if (lecturerIds) {
      const lecturerExists = await Promise.all(lecturerIds.map((id) => this.courseRepository.checkLecturerExists(id)))
      if (lecturerExists.some((exists) => !exists)) {
        throw new BadRequestException(`Lecturers with IDs ${lecturerIds.join(', ')} do not exist or are not authorized`)
      }
    }

    // Handle thumbnail upload if provided
    let thumbnailUrl = ''
    if (thumbnailFile) {
      // TODO: Upload to S3 and get URL
      thumbnailUrl = (await this.s3Service.uploadFileToS3(thumbnailFile)).url
    }

    return this.courseRepository.create({
      slug,
      ...courseData,
      thumbnailUrl,
      lecturerIds,
      createdBy: userId,
    })
  }

  async findAll(queryDto: QueryCourseDTO) {
    const { page, limit, search, level, courseType, status, sortBy, sortOrder } = queryDto
    const skip = (page - 1) * Number(limit)

    // Build where clause
    const where: CourseWhereInput = {}

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (level) {
      where.level = level
    }

    if (courseType) {
      where.courseType = courseType
    }

    if (status) {
      where.status = status
    }

    // Build orderBy clause
    const orderBy: CourseOrderByInput = {}
    if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder
    } else if (sortBy === 'title') {
      orderBy.title = sortOrder
    } else if (sortBy === 'price') {
      orderBy.price = sortOrder
    } else if (sortBy === 'level') {
      orderBy.level = sortOrder
    }

    const { courses, total } = await this.courseRepository.findAll({
      skip,
      take: Number(limit),
      where,
      orderBy,
    })

    return {
      data: courses,
      meta: {
        page,
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    }
  }

  async findOne(id: number, includeReviews = false): Promise<CourseWithRelations> {
    const course = await this.courseRepository.findOne({ id }, includeReviews)

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`)
    }

    return course
  }

  async findBySlug(slug: string, includeReviews = false): Promise<CourseWithRelations> {
    const course = await this.courseRepository.findBySlug(slug, includeReviews)

    if (!course) {
      throw new NotFoundException(`Course with slug '${slug}' not found`)
    }

    return course
  }

  async update(
    id: number,
    updateCourseDto: UpdateCourseDTO,
    thumbnailFile?: Express.Multer.File,
  ): Promise<CourseWithRelations> {
    // Check if course exists
    const existingCourse = await this.findOne(id)

    // If slug is being updated, check if it's already taken
    if (updateCourseDto.slug && updateCourseDto.slug !== existingCourse.slug) {
      const slugExists = await this.courseRepository.checkSlugExists(updateCourseDto.slug, id)
      if (slugExists) {
        throw new ConflictException(`Course with slug '${updateCourseDto.slug}' already exists`)
      }
    }

    // Validate lecturers exist if provided
    if (updateCourseDto.lecturerIds) {
      const lecturerExists = await Promise.all(
        updateCourseDto.lecturerIds.map((id) => this.courseRepository.checkLecturerExists(id)),
      )
      if (lecturerExists.some((exists) => !exists)) {
        throw new BadRequestException(
          `Lecturers with IDs ${updateCourseDto.lecturerIds.join(', ')} do not exist or are not authorized`,
        )
      }
    }

    // Handle thumbnail upload if provided
    let thumbnailUrl = ''
    if (thumbnailFile) {
      // TODO: Upload to S3 and get URL
      thumbnailUrl = (await this.s3Service.uploadFileToS3(thumbnailFile)).url
      console.log('Thumbnail file received:', thumbnailFile.originalname)
    }

    const { lecturerIds, ...courseData } = updateCourseDto

    let lecturerUpdate = {}
    if (lecturerIds !== undefined) {
      if (lecturerIds === null) {
        lecturerUpdate = { lecturer: { disconnect: true } }
      } else {
        lecturerUpdate = { lecturer: { connect: { id: lecturerIds } } }
      }
    }

    return this.courseRepository.update({
      where: { id },
      data: {
        ...courseData,
        thumbnailUrl,
        ...lecturerUpdate,
      },
    })
  }

  async remove(id: number): Promise<CourseWithRelations> {
    // Check if course exists
    const course = await this.findOne(id)

    // Delete the course (cascade will handle related entities)
    await this.courseRepository.delete({ id })

    return course
  }

  async getPublishedCourses(queryDto: Omit<QueryCourseDTO, 'status'>) {
    const { page, limit, search, level, courseType, sortBy, sortOrder } = queryDto
    const skip = (page - 1) * limit

    // Build where clause (excluding status since it's set to PUBLISHED)
    const where: Omit<CourseWhereInput, 'status'> = {}

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (level) {
      where.level = level
    }

    if (courseType) {
      where.courseType = courseType
    }

    // Build orderBy clause
    const orderBy: CourseOrderByInput = {}
    if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder
    } else if (sortBy === 'title') {
      orderBy.title = sortOrder
    } else if (sortBy === 'price') {
      orderBy.price = sortOrder
    } else if (sortBy === 'level') {
      orderBy.level = sortOrder
    }

    const { courses, total } = await this.courseRepository.getPublishedCourses({
      skip,
      take: Number(limit),
      where,
      orderBy,
    })

    return {
      data: courses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }
}
