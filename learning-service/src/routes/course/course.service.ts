import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { CourseRepository } from "./course.repo";
import { OnlineClassRepository } from "../online-class/online-class.repo";
import { ClassFolderService } from "../online-class/class-folder.service";
import {
  CreateCourseDTO,
  UpdateCourseDTO,
  QueryCourseDTO,
  CreateClassDTO,
  UpdateClassDTO,
  CreateSessionDTO,
  UpdateSessionDTO,
} from "./course.dto";
import {
  CourseWithRelations,
  CourseWhereInput,
  CourseOrderByInput,
  UpdateCourseStatusTypeForAdmin,
} from "./course.model";
import { LectureProfileRepository } from "src/routes/profile/profile.repo";
import { EnrollmentService } from "../enrollment/enrollment.service";
import { S3Service } from "src/shared/services/s3.service";
import { PrismaService } from "src/shared/services/prisma.service";
import { ActivityLogService } from "../activity-log/activity-log.service";
import { NotificationService } from "../notification/notification.service";

@Injectable()
export class CourseService {
  constructor(
    private readonly courseRepository: CourseRepository,
    private readonly onlineClassRepository: OnlineClassRepository,
    private readonly lecturerRepository: LectureProfileRepository,
    private readonly enrollmentService: EnrollmentService,
    private readonly classFolderService: ClassFolderService,
    private readonly s3Service: S3Service,
    private readonly prisma: PrismaService,
    private readonly activityLogService: ActivityLogService,
    private readonly notificationService: NotificationService,
  ) {}

  /** Guest-facing lecturer profile URL path (Next.js `/lecturers/[profileId]`). */
  private attachLecturerPublicProfilePaths<L extends object>(
    lecturers: L[],
  ): (L & { publicProfilePath: string })[] {
    return lecturers.map((lecturer) => {
      const id = (lecturer as { id?: number }).id;
      return {
        ...lecturer,
        publicProfilePath: typeof id === "number" ? `/lecturers/${id}` : "",
      };
    });
  }

  async searchPublishedForMcp(query?: string, level?: string, limit = 10) {
    const where: CourseWhereInput = {
      status: "PUBLISHED",
    };

    if (level) {
      where.level = level as any;
    }

    if (query) {
      where.OR = [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ];
    }

    const { courses } = await this.courseRepository.findAll({
      where,
      take: Number(limit),
      orderBy: { createdAt: "desc" },
    });

    return courses.map((course) => ({
      id: course.id,
      slug: course.slug,
      title: course.title,
      subtitle: course.subtitle,
      description: course.description,
      level: course.level,
      courseType: course.courseType,
      thumbnailUrl: course.thumbnailUrl,
      price: course.price,
      status: course.status,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
      moduleCount: course._count?.modules ?? 0,
      lessonCount:
        course.modules?.reduce((sum: number, module: any) => {
          return sum + (module._count?.lessons ?? 0);
        }, 0) ?? 0,
    }));
  }

  async getPublishedCourseDetailForMcp(params: {
    query?: string;
    courseId?: number;
    level?: string;
  }) {
    const { query, courseId, level } = params;

    let resolvedCourseId = courseId;
    if (!resolvedCourseId && query) {
      const [firstMatch] = await this.searchPublishedForMcp(query, level, 1);
      resolvedCourseId = firstMatch?.id;
    }

    if (!resolvedCourseId) {
      return null;
    }

    const course = await this.courseRepository.findOneWithLessons({
      id: resolvedCourseId,
    });

    if (!course) {
      return null;
    }

    if (course.status !== "PUBLISHED") {
      return null;
    }

    if (level && course.level !== level) {
      return null;
    }

    const lessonCount =
      course.modules?.reduce((sum: number, module: any) => {
        return sum + (module.lessons?.length ?? 0);
      }, 0) ?? 0;

    return {
      ...course,
      lesson_count: lessonCount,
    };
  }

  async searchPublishedLiveCoursesForMcp(params: {
    query?: string;
    limit?: number;
    level?: string;
    daysOfWeek?: number[];
    timeRange?: string;
  }) {
    const { query, limit = 10, level, daysOfWeek, timeRange } = params;

    const where: CourseWhereInput = {
      status: "PUBLISHED",
      courseType: "LIVE_ONLY",
    };

    if (level) {
      where.level = level as any;
    }

    if (query) {
      where.OR = [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ];
    }

    const { courses } = await this.courseRepository.findAll({
      where,
      take: Number(limit),
      orderBy: { createdAt: "desc" },
    });

    let hourStart: number | undefined;
    let hourEnd: number | undefined;
    if (timeRange) {
      const normalized = timeRange.toLowerCase();
      if (normalized === "morning" || normalized === "sang") {
        hourStart = 6;
        hourEnd = 12;
      } else if (normalized === "afternoon" || normalized === "chieu") {
        hourStart = 12;
        hourEnd = 18;
      } else if (normalized === "evening" || normalized === "toi") {
        hourStart = 18;
        hourEnd = 24;
      } else if (normalized.includes("-")) {
        const [startRaw, endRaw] = normalized.split("-");
        const start = Number(startRaw?.split(":")[0]);
        const end = Number(endRaw?.split(":")[0]);
        if (!Number.isNaN(start) && !Number.isNaN(end)) {
          hourStart = start;
          hourEnd = end;
        }
      }
    }

    const response: any[] = [];
    for (const course of courses) {
      const classes = await this.onlineClassRepository.getPublicCourseClasses(
        course.id,
      );

      const schedules: any[] = [];
      for (const classItem of classes) {
        for (const session of classItem.sessions ?? []) {
          const start = session.scheduledAt
            ? new Date(session.scheduledAt)
            : undefined;

          if (start && daysOfWeek && daysOfWeek.length > 0) {
            const day = start.getDay();
            const normalizedDay = day === 0 ? 7 : day;
            if (!daysOfWeek.includes(normalizedDay)) {
              continue;
            }
          }

          if (
            start &&
            hourStart !== undefined &&
            hourEnd !== undefined &&
            (start.getHours() < hourStart || start.getHours() >= hourEnd)
          ) {
            continue;
          }

          schedules.push({
            class_id: classItem.id,
            class_title: classItem.title,
            class_description: classItem.description,
            class_start_date: classItem.startDate,
            class_end_date: classItem.endDate,
            capacity: classItem.capacity,
            isActive: classItem.isActive,
            session_id: session.id,
            session_title: session.title,
            start_time: session.scheduledAt,
            end_time: session.endedAt,
            member_count: classItem._count?.members ?? 0,
          });
        }
      }

      if ((daysOfWeek?.length || timeRange) && schedules.length === 0) {
        continue;
      }

      response.push({
        id: course.id,
        slug: course.slug,
        title: course.title,
        subtitle: course.subtitle,
        description: course.description,
        level: course.level,
        courseType: course.courseType,
        thumbnailUrl: course.thumbnailUrl,
        price: course.price,
        status: course.status,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
        schedules,
      });
    }

    return response;
  }

  async create(
    createCourseDto: CreateCourseDTO,
    userId: number,
    files?: { thumbnail?: Express.Multer.File[] },
  ): Promise<CourseWithRelations> {
    const { slug, lecturerIds, ...courseData } = createCourseDto;

    // Check if slug already exists
    const slugExists = await this.courseRepository.checkSlugExists(slug);
    if (slugExists) {
      throw new ConflictException(`Course with slug '${slug}' already exists`);
    }
    let imageUrl = createCourseDto.thumbnailUrl;
    if (files?.thumbnail?.[0]) {
      imageUrl = (
        await this.s3Service.uploadFileToS3(files.thumbnail[0], "thumbnails")
      ).url;
    }
    // Validate lecturer exists if provided
    if (lecturerIds) {
      const lecturerExists = await Promise.all(
        lecturerIds.map((id) =>
          this.courseRepository.checkLecturerExists(Number(id)),
        ),
      );
      if (lecturerExists.some((exists) => !exists)) {
        throw new BadRequestException(
          `Lecturers with IDs ${lecturerIds.join(", ")} do not exist or are not authorized`,
        );
      }
    }

    const course = await this.courseRepository.create({
      slug,
      title: courseData.title || "",
      description: courseData.description,
      subtitle: courseData.subtitle,
      level: courseData.level,
      courseType: courseData.courseType,
      price: courseData.price,
      status: "DRAFT",
      thumbnailUrl: imageUrl,
      lecturerIds: lecturerIds.map((id) => Number(id)),
      createdBy: userId,
    });

    this.activityLogService.log({
      userId,
      action: "COURSE_CREATED",
      entity: "COURSE",
      entityId: course.id,
      description: `Course "${courseData.title}" created`,
      metadata: { title: courseData.title, slug, level: courseData.level },
    });

    return course;
  }

  async findAll(queryDto: QueryCourseDTO) {
    const {
      page,
      limit,
      search,
      level,
      courseType,
      status,
      sortBy,
      sortOrder,
    } = queryDto;
    const skip = (page - 1) * Number(limit);

    // Build where clause
    const where: CourseWhereInput = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (level) {
      where.level = level;
    }

    if (courseType) {
      where.courseType = courseType;
    }

    if (status) {
      where.status = status;
    }

    // Build orderBy clause
    const orderBy: CourseOrderByInput = {};
    if (sortBy === "createdAt") {
      orderBy.createdAt = sortOrder;
    } else if (sortBy === "title") {
      orderBy.title = sortOrder;
    } else if (sortBy === "price") {
      orderBy.price = sortOrder;
    } else if (sortBy === "level") {
      orderBy.level = sortOrder;
    }

    const { courses, total } = await this.courseRepository.findAll({
      skip,
      take: Number(limit),
      where,
      orderBy,
    });
    const lecturerArray =
      await this.lecturerRepository.findLectureProfileByUserIds(
        courses.map((course) => course.lecturerIds).flat(),
      );
    return {
      data: courses.map((course) => ({
        ...course,
        lecturers: lecturerArray.filter((lecturer) =>
          course.lecturerIds.includes(lecturer.userId),
        ),
      })),
      meta: {
        page,
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  }

  async findOne(
    id: number,
    includeReviews = false,
  ): Promise<CourseWithRelations> {
    const course = await this.courseRepository.findOne({ id }, includeReviews);

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    return course;
  }

  async findBySlug(slug: string, includeReviews = false) {
    const course = await this.courseRepository.findBySlug(slug, includeReviews);

    if (!course) {
      throw new NotFoundException(`Course with slug '${slug}' not found`);
    }

    const responseCourse: any = { ...course };

    if (course.courseType === "LIVE_ONLY") {
      const classes = await this.onlineClassRepository.findByCourseSlug(
        course.slug,
      );
      responseCourse.classes = classes;
    }

    if (course.lecturerIds && course.lecturerIds.length > 0) {
      const lecturerArray =
        await this.lecturerRepository.findLectureProfileByUserIds(
          course.lecturerIds,
        );

      responseCourse.lecturers = this.attachLecturerPublicProfilePaths(
        lecturerArray.filter((lecturer) =>
          course.lecturerIds.includes(lecturer.userId),
        ),
      );
    } else {
      responseCourse.lecturers = [];
    }

    return responseCourse;
  }

  async update(
    id: number,
    updateCourseDto: UpdateCourseDTO,
    files?: { thumbnail?: Express.Multer.File[] },
  ): Promise<CourseWithRelations> {
    // Check if course exists
    const existingCourse = await this.findOne(id);

    // If slug is being updated, check if it's already taken
    if (updateCourseDto.slug && updateCourseDto.slug !== existingCourse.slug) {
      const slugExists = await this.courseRepository.checkSlugExists(
        updateCourseDto.slug,
        id,
      );
      if (slugExists) {
        throw new ConflictException(
          `Course with slug '${updateCourseDto.slug}' already exists`,
        );
      }
    }

    let imageUrl = existingCourse.thumbnailUrl;
    if (files?.thumbnail?.[0]) {
      imageUrl = (
        await this.s3Service.uploadFileToS3(files.thumbnail[0], "thumbnails")
      ).url;
    }
    // Validate lecturers exist if provided
    if (updateCourseDto.lecturerIds) {
      const lecturerExists = await Promise.all(
        updateCourseDto.lecturerIds.map((id) =>
          this.courseRepository.checkLecturerExists(Number(id)),
        ),
      );
      if (lecturerExists.some((exists) => !exists)) {
        throw new BadRequestException(
          `Lecturers with IDs ${updateCourseDto.lecturerIds.join(", ")} do not exist or are not authorized`,
        );
      }
    }

    const { lecturerIds, ...courseData } = updateCourseDto;

    return this.courseRepository.update({
      where: { id },
      data: {
        ...courseData,
        thumbnailUrl: imageUrl,
        ...(lecturerIds !== undefined && {
          lecturerIds:
            lecturerIds === null ? [] : lecturerIds.map((id) => Number(id)),
        }),
      },
    });
  }

  async remove(id: number): Promise<CourseWithRelations> {
    // Check if course exists
    const course = await this.findOne(id);

    // Delete the course (cascade will handle related entities)
    await this.courseRepository.delete({ id });

    return course;
  }

  async getPublishedCourses(
    queryDto: Omit<QueryCourseDTO, "status">,
    userId: number,
    includeReviews = false,
  ) {
    const { page, limit, search, level, courseType, sortBy, sortOrder } =
      queryDto;
    const skip = (page - 1) * Number(limit);

    // Build where clause (excluding status since it's set to PUBLISHED)
    const where: Omit<CourseWhereInput, "status"> = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (level) {
      where.level = level;
    }

    if (courseType) {
      where.courseType = courseType;
    }

    // Build orderBy clause
    const orderBy: CourseOrderByInput = {};
    if (sortBy === "createdAt") {
      orderBy.createdAt = sortOrder;
    } else if (sortBy === "title") {
      orderBy.title = sortOrder;
    } else if (sortBy === "price") {
      orderBy.price = sortOrder;
    } else if (sortBy === "level") {
      orderBy.level = sortOrder;
    }

    const { courses, total } = await this.courseRepository.getPublishedCourses({
      skip,
      take: Number(limit),
      where,
      orderBy,
      includeReviews,
    });
    const lecturerArray =
      await this.lecturerRepository.findLectureProfileByUserIds(
        courses.map((course) => course.lecturerIds).flat(),
      );

    // Check enrollment status for each course
    const courseIds = courses.map((course) => course.id);
    const [userEnrollments, avgRatingMap] = await Promise.all([
      this.enrollmentService.checkUserEnrollments(userId, courseIds),
      this.courseRepository.getAvgRatingsForCourses(courseIds),
    ]);

    return {
      data: courses.map((course) => ({
        ...course,
        lecturers: this.attachLecturerPublicProfilePaths(
          lecturerArray.filter((lecturer) =>
            course.lecturerIds.includes(lecturer.userId),
          ),
        ),
        isEnrolled: userEnrollments.includes(course.id),
        avgRating: Number((avgRatingMap.get(course.id) ?? 0).toFixed(1)),
      })),
      meta: {
        pagination: {
          page,
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    };
  }
  async getMyCourses(
    userId: number,
    params: {
      page?: number;
      limit?: number;
      expired?: boolean;
      courseType?: "VIDEO_QUIZ" | "VIDEO_QUIZ_LIVE" | "LIVE_ONLY";
      sortBy?: "createdAt" | "expiresAt";
      sortOrder?: "asc" | "desc";
    } = {},
  ) {
    // Use the enrollment service to get user's enrolled courses
    const enrollmentsResult = await this.enrollmentService.findMyEnrollments(
      userId,
      params,
    );

    // Extract course IDs from enrollments
    const courseIds = enrollmentsResult.data.map(
      (enrollment) => enrollment.course.id,
    );

    if (courseIds.length === 0) {
      return {
        data: [],
        meta: enrollmentsResult.meta,
      };
    }

    // Get full course details with lecturer IDs for each course
    const fullCoursesPromises = courseIds.map(async (courseId) => {
      return await this.courseRepository.findOne({ id: courseId });
    });

    const fullCourses = await Promise.all(fullCoursesPromises);

    // Filter out null values and get lecturer information for all courses
    const validCourses = fullCourses.filter(
      (course): course is CourseWithRelations => course !== null,
    );
    const allLecturerIds = validCourses
      .map((course) => course.lecturerIds || [])
      .flat();

    const lecturerArray =
      allLecturerIds.length > 0
        ? await this.lecturerRepository.findLectureProfileByUserIds(
            allLecturerIds,
          )
        : [];

    // Map enrollments to include full course info with lecturers
    const coursesWithLecturers = enrollmentsResult.data.map((enrollment) => {
      const fullCourse = validCourses.find(
        (course) => course.id === enrollment.course.id,
      );

      return {
        ...enrollment,
        course: {
          ...enrollment.course,
          lecturerIds: fullCourse?.lecturerIds || [],
          lecturers: lecturerArray.filter((lecturer) =>
            (fullCourse?.lecturerIds || []).includes(lecturer.userId),
          ),
        },
      };
    });

    return {
      data: coursesWithLecturers,
      meta: enrollmentsResult.meta,
    };
  }

  // Class Management Methods
  async getCourseClasses(courseId: number) {
    // Check if course exists
    await this.findOne(courseId);

    return this.onlineClassRepository.findByCourseId(courseId);
  }
  async getPublicCourseClasses(courseId: number) {
    // Check if course exists
    await this.findOne(courseId);

    return this.onlineClassRepository.getPublicCourseClasses(courseId);
  }

  async createCourseClass(
    courseId: number,
    createClassDto: CreateClassDTO,
    userId: number,
  ) {
    // Check if course exists
    await this.findOne(courseId);

    // Validate lecturer exists
    const lecturerExists = await this.courseRepository.checkLecturerExists(
      createClassDto.lecturerId,
    );
    if (!lecturerExists) {
      throw new BadRequestException(
        `Lecturer with ID ${createClassDto.lecturerId} does not exist or is not authorized`,
      );
    }

    const newClass = await this.onlineClassRepository.create({
      title: createClassDto.title,
      description: createClassDto.description,
      startDate: createClassDto.startDate
        ? new Date(createClassDto.startDate)
        : null,
      endDate: createClassDto.endDate ? new Date(createClassDto.endDate) : null,
      capacity: createClassDto.capacity,
      course: { connect: { id: courseId } },
      lecturer: { connect: { id: createClassDto.lecturerId } },
    });

    // Auto-create folder for the class
    await this.classFolderService.createClassFolder(
      newClass.id,
      createClassDto.lecturerId,
    );

    return newClass;
  }

  async updateCourseClass(
    courseId: number,
    classId: number,
    updateClassDto: UpdateClassDTO,
  ) {
    // Check if course exists
    await this.findOne(courseId);

    // Check if class belongs to the course
    const belongsToCourse =
      await this.onlineClassRepository.checkClassBelongsToCourse(
        classId,
        courseId,
      );
    if (!belongsToCourse) {
      throw new NotFoundException(
        `Class with ID ${classId} not found in course ${courseId}`,
      );
    }

    // Validate lecturer exists if being updated
    if (updateClassDto.lecturerId) {
      const lecturerExists = await this.courseRepository.checkLecturerExists(
        updateClassDto.lecturerId,
      );
      if (!lecturerExists) {
        throw new BadRequestException(
          `Lecturer with ID ${updateClassDto.lecturerId} does not exist or is not authorized`,
        );
      }
    }

    const updateData: any = { ...updateClassDto };
    if (updateClassDto.startDate !== undefined) {
      delete updateData.startDate;
      updateData.startDate = updateClassDto.startDate
        ? new Date(updateClassDto.startDate)
        : null;
    }
    if (updateClassDto.endDate !== undefined) {
      delete updateData.endDate;
      updateData.endDate = updateClassDto.endDate
        ? new Date(updateClassDto.endDate)
        : null;
    }
    if (updateClassDto.lecturerId) {
      updateData.lecturer = { connect: { id: updateClassDto.lecturerId } };
      delete updateData.lecturerId;
    }

    return this.onlineClassRepository.update(classId, updateData);
  }

  async removeCourseClass(courseId: number, classId: number) {
    // Check if course exists
    await this.findOne(courseId);

    // Check if class belongs to the course
    const belongsToCourse =
      await this.onlineClassRepository.checkClassBelongsToCourse(
        classId,
        courseId,
      );
    if (!belongsToCourse) {
      throw new NotFoundException(
        `Class with ID ${classId} not found in course ${courseId}`,
      );
    }

    return this.onlineClassRepository.delete(classId);
  }

  async createClassSession(
    courseId: number,
    classId: number,
    createSessionDto: CreateSessionDTO,
  ) {
    // Check if course exists
    await this.findOne(courseId);

    // Check if class belongs to the course
    const belongsToCourse =
      await this.onlineClassRepository.checkClassBelongsToCourse(
        classId,
        courseId,
      );
    if (!belongsToCourse) {
      throw new NotFoundException(
        `Class with ID ${classId} not found in course ${courseId}`,
      );
    }

    return this.onlineClassRepository.createSession(classId, {
      title: createSessionDto.title,
      scheduledAt: new Date(createSessionDto.scheduledAt),
    });
  }

  async getClassSessions(courseId: number, classId: number) {
    // Check if course exists
    await this.findOne(courseId);

    // Check if class belongs to the course
    const belongsToCourse =
      await this.onlineClassRepository.checkClassBelongsToCourse(
        classId,
        courseId,
      );
    if (!belongsToCourse) {
      throw new NotFoundException(
        `Class with ID ${classId} not found in course ${courseId}`,
      );
    }

    return this.onlineClassRepository.getClassSessions(classId);
  }

  async updateClassSession(
    courseId: number,
    classId: number,
    sessionId: number,
    updateSessionDto: UpdateSessionDTO,
  ) {
    await this.findOne(courseId);

    const belongsToCourse =
      await this.onlineClassRepository.checkClassBelongsToCourse(
        classId,
        courseId,
      );
    if (!belongsToCourse) {
      throw new NotFoundException(
        `Class with ID ${classId} not found in course ${courseId}`,
      );
    }

    const session = await this.onlineClassRepository.findSession(sessionId);
    if (!session || session.classId !== classId) {
      throw new NotFoundException(
        `Session with ID ${sessionId} not found in class ${classId}`,
      );
    }

    // If session has started (has janusRoomId) or ended, cannot update
    if (session.janusRoomId !== null || session.endedAt !== null) {
      throw new BadRequestException(
        "Cannot update a session that has already started or ended",
      );
    }

    const data: {
      title?: string;
      scheduledAt?: Date;
      substituteLecturerId?: number | null;
    } = {};
    if (updateSessionDto.title !== undefined)
      data.title = updateSessionDto.title;
    if (updateSessionDto.scheduledAt !== undefined)
      data.scheduledAt = new Date(updateSessionDto.scheduledAt);
    if (updateSessionDto.substituteLecturerId !== undefined) {
      if (updateSessionDto.substituteLecturerId !== null) {
        // Validate substitute lecturer exists and is a lecturer
        const lecturerExists = await this.courseRepository.checkLecturerExists(
          updateSessionDto.substituteLecturerId,
        );
        if (!lecturerExists) {
          throw new BadRequestException(
            `Substitute lecturer with ID ${updateSessionDto.substituteLecturerId} does not exist or is not a lecturer`,
          );
        }
        // Substitute cannot be the same as the class's primary lecturer
        if (
          updateSessionDto.substituteLecturerId === session.class.lecturerId
        ) {
          throw new BadRequestException(
            "Substitute lecturer cannot be the same as the primary lecturer of the class",
          );
        }
      }
      data.substituteLecturerId = updateSessionDto.substituteLecturerId;
    }

    return this.onlineClassRepository.updateSession(sessionId, data);
  }

  async deleteClassSession(
    courseId: number,
    classId: number,
    sessionId: number,
  ) {
    await this.findOne(courseId);

    const belongsToCourse =
      await this.onlineClassRepository.checkClassBelongsToCourse(
        classId,
        courseId,
      );
    if (!belongsToCourse) {
      throw new NotFoundException(
        `Class with ID ${classId} not found in course ${courseId}`,
      );
    }

    const session = await this.onlineClassRepository.findSession(sessionId);
    if (!session || session.classId !== classId) {
      throw new NotFoundException(
        `Session with ID ${sessionId} not found in class ${classId}`,
      );
    }

    // If session has started (has janusRoomId) or ended, cannot delete
    if (session.janusRoomId !== null || session.endedAt !== null) {
      throw new BadRequestException(
        "Cannot delete a session that has already started or ended",
      );
    }

    return this.onlineClassRepository.deleteSession(sessionId);
  }

  async getMyCourseDetail(userId: number, courseId: number) {
    // Check if user is enrolled in the course
    const enrollment = await this.enrollmentService.findByUserAndCourse(
      userId,
      courseId,
    );
    if (!enrollment) {
      throw new NotFoundException(
        `You are not enrolled in course with ID ${courseId}`,
      );
    }

    // Get full course details with lessons included
    const course = await this.courseRepository.findOneWithLessons({
      id: courseId,
    });
    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    // Get lecturer profiles
    const lecturerArray =
      await this.lecturerRepository.findLectureProfileByUserIds(
        course.lecturerIds,
      );

    // Collect QUIZ lesson IDs
    const quizLessonIds: number[] = [];
    for (const mod of course.modules ?? []) {
      for (const lesson of mod.lessons ?? []) {
        if (lesson.kind === "QUIZ") {
          quizLessonIds.push(lesson.id);
        }
      }
    }

    // Fetch quizzes from assessment.assessments for QUIZ lessons
    const quizByLessonId = new Map<number, any>();
    if (quizLessonIds.length > 0) {
      const quizzes: any[] = await this.prisma.$queryRawUnsafe(
        `SELECT a.id, a.title, a.type, a.level, a.visibility, a.lesson_id AS "lessonId",
                a.class_id AS "classId", a.max_attempts AS "maxAttempts",
                a.score_profile_id AS "scoreProfileId",
                a.start_at AS "startAt", a.due_at AS "dueAt",
                a.lock_after_due AS "lockAfterDue",
                a.created_at AS "createdAt", a.updated_at AS "updatedAt"
         FROM assessment.assessments a
         WHERE a.lesson_id = ANY($1) AND a.type = 'QUIZ'`,
        quizLessonIds,
      );

      for (const quiz of quizzes) {
        quizByLessonId.set(quiz.lessonId, quiz);
      }
    }

    // Attach quiz data to QUIZ lessons
    const modulesWithQuiz = (course.modules ?? []).map((mod: any) => ({
      ...mod,
      lessons: (mod.lessons ?? []).map((lesson: any) => {
        if (lesson.kind === "QUIZ" && quizByLessonId.has(lesson.id)) {
          return { ...lesson, quiz: quizByLessonId.get(lesson.id) };
        }
        return lesson;
      }),
    }));

    return {
      ...course,
      modules: modulesWithQuiz,
      lecturers: lecturerArray,
    };
  }
  async publish(id: number): Promise<CourseWithRelations> {
    // Check if course exists
    const existingCourse = await this.findOne(id);

    if (existingCourse.status === "PUBLISHED") {
      throw new BadRequestException(
        `Course with ID ${id} is already published`,
      );
    }

    // Update course status and all lessons in the course to PUBLISHED using transaction
    await this.prisma.$transaction(async (prisma) => {
      // Update course status
      await prisma.course.update({
        where: { id },
        data: { status: "PUBLISHED" },
      });

      // Update all lessons in the course modules to PUBLISHED (except those already GLOBAL_PUBLIC)
      await prisma.lesson.updateMany({
        where: {
          module: {
            courseId: id,
          },
          status: {
            not: "GLOBAL_PUBLIC",
          },
        },
        data: {
          status: "PUBLISHED",
        },
      });
    });

    // Return the updated course with relations
    const updatedCourse = await this.courseRepository.findOne({ id });
    if (!updatedCourse) {
      throw new NotFoundException(
        `Course with ID ${id} not found after update`,
      );
    }

    this.activityLogService.log({
      action: "COURSE_PUBLISHED",
      entity: "COURSE",
      entityId: id,
      description: `Course "${existingCourse.title}" published`,
      metadata: { title: existingCourse.title },
    });

    return updatedCourse;
  }
  async pendingReview(
    id: number,
    userId: number,
  ): Promise<CourseWithRelations> {
    // Check if course exists
    const existingCourse = await this.findOne(id);

    if (existingCourse.status !== "DRAFT") {
      throw new BadRequestException(
        `Only courses in DRAFT status can be submitted for review`,
      );
    }

    // Update course status to PENDING_REVIEW
    const updatedCourse = await this.courseRepository.update({
      where: { id },
      data: { status: "PENDING_REVIEW" },
    });

    // Notify all admins
    const admins = await this.prisma.user.findMany({
      where: { role: "ADMIN", deletedAt: null },
      select: { id: true },
    });
    const staff = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    for (const admin of admins) {
      await this.notificationService.create({
        type: "COURSE_PENDING_REVIEW",
        title: "Course Pending Review",
        message: `${staff?.name ?? "Staff"} submitted course "${existingCourse.title}" for review`,
        userId: admin.id,
        relatedUserId: userId,
        entityId: id,
        entityType: "COURSE",
        priority: "HIGH",
        actionUrl: `/admin/manage-course/${existingCourse.slug}`,
      });
    }

    return updatedCourse;
  }
  async getPendingReviewCourses() {
    return this.courseRepository.findAllPendingReviewCourses({ where: {} });
  }
  async updateCourseStatus(
    id: number,
    body: UpdateCourseStatusTypeForAdmin,
    adminUserId: number,
  ) {
    // Check if course exists
    const existingCourse = await this.findOne(id);

    // Update course status
    const updatedCourse = await this.courseRepository.update({
      where: { id },
      data: { status: body.status },
    });

    // Notify the course creator when approved (PUBLISHED) or rejected (DRAFT/ARCHIVED)
    if (
      body.status === "PUBLISHED" ||
      body.status === "DRAFT" ||
      body.status === "ARCHIVED"
    ) {
      const isApproved = body.status === "PUBLISHED";
      const notifType = isApproved ? "COURSE_APPROVED" : "COURSE_REJECTED";
      const statusLabel = isApproved ? "approved" : "rejected";

      await this.notificationService.create({
        type: notifType as any,
        title: `Course ${isApproved ? "Approved" : "Rejected"}`,
        message: `Your course "${existingCourse.title}" has been ${statusLabel} by admin`,
        userId: existingCourse.createdBy,
        relatedUserId: adminUserId,
        entityId: id,
        entityType: "COURSE",
        priority: "HIGH",
        actionUrl: `/staff/manage-course/${existingCourse.slug}`,
      });
    }

    return updatedCourse;
  }

  async findByCourseIDManagement(courseId: number) {
    const course = await this.courseRepository.findByCourseIDManagement(
      { id: courseId }
    );

    if (!course) {
      throw new NotFoundException(`Course with ID '${courseId}' not found`);
    }

    return course;
  }
}
