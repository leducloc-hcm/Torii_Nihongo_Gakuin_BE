import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { CourseRepository } from './course.repo'
import { OnlineClassRepository } from '../online-class/online-class.repo'
import {
  CreateCourseDTO,
  UpdateCourseDTO,
  QueryCourseDTO,
  CreateClassDTO,
  UpdateClassDTO,
  CreateSessionDTO,
} from './course.dto'
import { CourseWithRelations, CourseWhereInput, CourseOrderByInput } from './course.model'
import { S3Service } from 'src/shared/services/s3.service'
import { LectureProfileRepository } from 'src/routes/profile/profile.repo'
import { EnrollmentService } from '../enrollment/enrollment.service'

@Injectable()
export class CourseService {
  constructor(
    private readonly courseRepository: CourseRepository,
    private readonly onlineClassRepository: OnlineClassRepository,
    private readonly s3Service: S3Service,
    private readonly lecturerRepository: LectureProfileRepository,
    private readonly enrollmentService: EnrollmentService,
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
      const lecturerExists = await Promise.all(
        lecturerIds.map((id) => this.courseRepository.checkLecturerExists(Number(id))),
      )
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
      lecturerIds: lecturerIds.map((id) => Number(id)),
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
    const lecturerArray = await this.lecturerRepository.findLectureProfileByUserIds(
      courses.map((course) => course.lecturerIds).flat(),
    )
    return {
      data: courses.map((course) => ({
        ...course,
        lecturers: lecturerArray.filter((lecturer) => course.lecturerIds.includes(lecturer.userId)),
      })),
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
        updateCourseDto.lecturerIds.map((id) => this.courseRepository.checkLecturerExists(Number(id))),
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

    return this.courseRepository.update({
      where: { id },
      data: {
        ...courseData,
        thumbnailUrl,
        ...(lecturerIds !== undefined && {
          lecturerIds: lecturerIds === null ? [] : lecturerIds.map((id) => Number(id)),
        }),
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
    const skip = (page - 1) * Number(limit)

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
    const lecturerArray = await this.lecturerRepository.findLectureProfileByUserIds(
      courses.map((course) => course.lecturerIds).flat(),
    )
    return {
      data: courses.map((course) => ({
        ...course,
        lecturers: lecturerArray.filter((lecturer) => course.lecturerIds.includes(lecturer.userId)),
      })),
      meta: {
        pagination: {
          page,
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    }
  }
  async getMyCourses(
    userId: number,
    params: {
      page?: number
      limit?: number
      expired?: boolean
      courseType?: 'VIDEO_QUIZ' | 'VIDEO_QUIZ_LIVE' | 'LIVE_ONLY'
      sortBy?: 'createdAt' | 'expiresAt'
      sortOrder?: 'asc' | 'desc'
    } = {},
  ) {
    // Use the enrollment service to get user's enrolled courses
    const enrollmentsResult = await this.enrollmentService.findMyEnrollments(userId, params)

    // Extract course IDs from enrollments
    const courseIds = enrollmentsResult.data.map((enrollment) => enrollment.course.id)

    if (courseIds.length === 0) {
      return {
        data: [],
        meta: enrollmentsResult.meta,
      }
    }

    // Get full course details with lecturer IDs for each course
    const fullCoursesPromises = courseIds.map(async (courseId) => {
      return await this.courseRepository.findOne({ id: courseId })
    })

    const fullCourses = await Promise.all(fullCoursesPromises)

    // Filter out null values and get lecturer information for all courses
    const validCourses = fullCourses.filter((course): course is CourseWithRelations => course !== null)
    const allLecturerIds = validCourses.map((course) => course.lecturerIds || []).flat()

    const lecturerArray =
      allLecturerIds.length > 0 ? await this.lecturerRepository.findLectureProfileByUserIds(allLecturerIds) : []

    // Map enrollments to include full course info with lecturers
    const coursesWithLecturers = enrollmentsResult.data.map((enrollment) => {
      const fullCourse = validCourses.find((course) => course.id === enrollment.course.id)

      return {
        ...enrollment,
        course: {
          ...enrollment.course,
          lecturerIds: fullCourse?.lecturerIds || [],
          lecturers: lecturerArray.filter((lecturer) => (fullCourse?.lecturerIds || []).includes(lecturer.userId)),
        },
      }
    })

    return {
      data: coursesWithLecturers,
      meta: enrollmentsResult.meta,
    }
  }

  // Class Management Methods
  async getCourseClasses(courseId: number) {
    // Check if course exists
    await this.findOne(courseId)

    return this.onlineClassRepository.findByCourseId(courseId)
  }
  async getPublicCourseClasses(courseId: number) {
    // Check if course exists
    await this.findOne(courseId)

    return this.onlineClassRepository.getPublicCourseClasses(courseId)
  }

  async createCourseClass(courseId: number, createClassDto: CreateClassDTO, userId: number) {
    // Check if course exists
    await this.findOne(courseId)

    // Validate lecturer exists
    const lecturerExists = await this.courseRepository.checkLecturerExists(createClassDto.lecturerId)
    if (!lecturerExists) {
      throw new BadRequestException(`Lecturer with ID ${createClassDto.lecturerId} does not exist or is not authorized`)
    }

    return this.onlineClassRepository.create({
      title: createClassDto.title,
      description: createClassDto.description,
      capacity: createClassDto.capacity,
      course: { connect: { id: courseId } },
      lecturer: { connect: { id: createClassDto.lecturerId } },
    })
  }

  async updateCourseClass(courseId: number, classId: number, updateClassDto: UpdateClassDTO) {
    // Check if course exists
    await this.findOne(courseId)

    // Check if class belongs to the course
    const belongsToCourse = await this.onlineClassRepository.checkClassBelongsToCourse(classId, courseId)
    if (!belongsToCourse) {
      throw new NotFoundException(`Class with ID ${classId} not found in course ${courseId}`)
    }

    // Validate lecturer exists if being updated
    if (updateClassDto.lecturerId) {
      const lecturerExists = await this.courseRepository.checkLecturerExists(updateClassDto.lecturerId)
      if (!lecturerExists) {
        throw new BadRequestException(
          `Lecturer with ID ${updateClassDto.lecturerId} does not exist or is not authorized`,
        )
      }
    }

    const updateData: any = { ...updateClassDto }
    if (updateClassDto.lecturerId) {
      updateData.lecturer = { connect: { id: updateClassDto.lecturerId } }
      delete updateData.lecturerId
    }

    return this.onlineClassRepository.update(classId, updateData)
  }

  async removeCourseClass(courseId: number, classId: number) {
    // Check if course exists
    await this.findOne(courseId)

    // Check if class belongs to the course
    const belongsToCourse = await this.onlineClassRepository.checkClassBelongsToCourse(classId, courseId)
    if (!belongsToCourse) {
      throw new NotFoundException(`Class with ID ${classId} not found in course ${courseId}`)
    }

    return this.onlineClassRepository.delete(classId)
  }

  async createClassSession(courseId: number, classId: number, createSessionDto: CreateSessionDTO) {
    // Check if course exists
    await this.findOne(courseId)

    // Check if class belongs to the course
    const belongsToCourse = await this.onlineClassRepository.checkClassBelongsToCourse(classId, courseId)
    if (!belongsToCourse) {
      throw new NotFoundException(`Class with ID ${classId} not found in course ${courseId}`)
    }

    return this.onlineClassRepository.createSession(classId, {
      title: createSessionDto.title,
      scheduledAt: new Date(createSessionDto.scheduledAt),
      mode: createSessionDto.mode,
      roomKey: createSessionDto.roomKey,
    })
  }

  async getClassSessions(courseId: number, classId: number) {
    // Check if course exists
    await this.findOne(courseId)

    // Check if class belongs to the course
    const belongsToCourse = await this.onlineClassRepository.checkClassBelongsToCourse(classId, courseId)
    if (!belongsToCourse) {
      throw new NotFoundException(`Class with ID ${classId} not found in course ${courseId}`)
    }

    return this.onlineClassRepository.getClassSessions(classId)
  }
}
