import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { LessonProgressRepository } from './lesson-progress.repo'
import { UpdateProgressType, CourseProgressType, CourseProgressDetailsType } from './lesson-progress.model'
import { EnrollmentService } from '../enrollment/enrollment.service'

@Injectable()
export class LessonProgressService {
  constructor(
    private readonly progressRepository: LessonProgressRepository,
    private readonly enrollmentService: EnrollmentService,
  ) {}

  async updateProgress(userId: number, data: UpdateProgressType) {
    const { lessonId, watchedSec, lastPositionSec, completed } = data

    // Check if user is enrolled in the course containing this lesson
    const lesson = await this.progressRepository['prisma'].lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: true,
          },
        },
      },
    })

    if (!lesson) {
      throw new NotFoundException('Lesson not found')
    }

    const courseId = lesson.module.course.id

    // Check enrollment
    const isEnrolled = await this.enrollmentService.isUserEnrolled(userId, courseId)
    if (!isEnrolled) {
      throw new ForbiddenException('You must be enrolled in the course to track progress')
    }

    // Upsert progress
    const progress = await this.progressRepository.upsert(
      {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
      {
        userId,
        lessonId,
        watchedSec,
        lastPositionSec,
        completed: completed ?? false,
      },
      {
        watchedSec,
        lastPositionSec,
        completed,
      },
    )

    return progress
  }

  async getCourseProgress(userId: number, courseId: number): Promise<CourseProgressType> {
    // Check enrollment
    const isEnrolled = await this.enrollmentService.isUserEnrolled(userId, courseId)
    if (!isEnrolled) {
      throw new ForbiddenException('You must be enrolled in the course to view progress')
    }

    const result = await this.progressRepository.getCourseProgress(userId, courseId)

    if (!result || !result.course) {
      throw new NotFoundException('Course not found')
    }

    if (!result.enrollment) {
      throw new ForbiddenException('You are not enrolled in this course')
    }

    const { course, progresses, enrollment } = result

    // Create a map for quick lookup
    const progressMap = new Map(progresses.map((p) => [p.lessonId, p]))

    // Calculate overall progress
    const totalLessons = course.modules.reduce((total, module) => total + module.lessons.length, 0)
    const completedLessons = progresses.filter((p) => p.completed).length
    const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

    // Add progress data to modules and lessons
    const modulesWithProgress = course.modules.map((module) => ({
      id: module.id,
      title: module.title,
      order: module.order,
      lessons: module.lessons.map((lesson) => {
        const progress = progressMap.get(lesson.id)
        return {
          id: lesson.id,
          title: lesson.title,
          order: lesson.order,
          kind: lesson.kind,
          durationSec: lesson.durationSec,
          progress: progress
            ? {
                watchedSec: progress.watchedSec,
                lastPositionSec: progress.lastPositionSec,
                completed: progress.completed,
              }
            : {
                watchedSec: 0,
                lastPositionSec: 0,
                completed: false,
              },
        }
      }),
    }))

    return {
      course: {
        id: course.id,
        title: course.title,
        slug: course.slug,
        modules: modulesWithProgress,
      },
      enrollment: {
        id: enrollment.id,
        createdAt: enrollment.createdAt,
        expiresAt: enrollment.expiresAt,
      },
      progressPercentage,
      totalLessons,
      completedLessons,
    }
  }

  async getCourseProgressDetails(userId: number, courseId: number): Promise<CourseProgressDetailsType> {
    // Check enrollment
    const isEnrolled = await this.enrollmentService.isUserEnrolled(userId, courseId)
    if (!isEnrolled) {
      throw new ForbiddenException('You must be enrolled in the course to view progress')
    }

    const result = await this.progressRepository.getCourseProgressDetails(userId, courseId)

    if (!result || !result.enrollment) {
      throw new ForbiddenException('You are not enrolled in this course')
    }

    const { enrollment, modules } = result

    // Calculate progress statistics
    const totalLessons = modules.reduce((total, module) => total + module.lessons.length, 0)
    const completedLessons = modules.reduce(
      (total, module) => total + module.lessons.filter((lesson) => lesson.progress.some((p) => p.completed)).length,
      0,
    )
    const totalWatchedTime = modules.reduce(
      (total, module) =>
        total + module.lessons.reduce((moduleTotal, lesson) => moduleTotal + (lesson.progress[0]?.watchedSec || 0), 0),
      0,
    )
    const totalDuration = modules.reduce(
      (total, module) =>
        total + module.lessons.reduce((moduleTotal, lesson) => moduleTotal + (lesson.durationSec || 0), 0),
      0,
    )

    const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
    const watchTimePercentage = totalDuration > 0 ? Math.round((totalWatchedTime / totalDuration) * 100) : 0

    // Transform modules data
    const modulesWithProgress = modules.map((module) => {
      const moduleLessons = module.lessons.length
      const moduleCompleted = module.lessons.filter((lesson) => lesson.progress.some((p) => p.completed)).length
      const moduleProgressPercentage = moduleLessons > 0 ? Math.round((moduleCompleted / moduleLessons) * 100) : 0

      return {
        id: module.id,
        title: module.title,
        order: module.order,
        progressPercentage: moduleProgressPercentage,
        totalLessons: moduleLessons,
        completedLessons: moduleCompleted,
        lessons: module.lessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          order: lesson.order,
          durationSec: lesson.durationSec,
          progress: lesson.progress[0]
            ? {
                watchedSec: lesson.progress[0].watchedSec,
                lastPositionSec: lesson.progress[0].lastPositionSec,
                completed: lesson.progress[0].completed,
              }
            : {
                watchedSec: 0,
                lastPositionSec: 0,
                completed: false,
              },
        })),
      }
    })

    return {
      enrollment: {
        id: enrollment.id,
        createdAt: enrollment.createdAt,
        expiresAt: enrollment.expiresAt,
        course: enrollment.course,
      },
      progressPercentage,
      watchTimePercentage,
      totalLessons,
      completedLessons,
      totalWatchedTime,
      totalDuration,
      modules: modulesWithProgress,
    }
  }

  async getMyProgress(userId: number, lessonId: number) {
    const progress = await this.progressRepository.findOne({
      userId_lessonId: {
        userId,
        lessonId,
      },
    })

    return (
      progress || {
        watchedSec: 0,
        lastPositionSec: 0,
        completed: false,
      }
    )
  }
}
