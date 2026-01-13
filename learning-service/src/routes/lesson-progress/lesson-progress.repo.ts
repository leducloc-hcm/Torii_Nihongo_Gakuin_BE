import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  ProgressCreateInput,
  ProgressUpdateInput,
  ProgressWhereUniqueInput,
  ProgressWhereInput,
  LessonProgressWithRelations,
  ProgressSummaryType,
} from './lesson-progress.model'

@Injectable()
export class LessonProgressRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: ProgressCreateInput): Promise<LessonProgressWithRelations> {
    return await this.prisma.lessonProgress.create({
      data: {
        userId: data.userId,
        lessonId: data.lessonId,
        watchedSec: data.watchedSec,
        lastPositionSec: data.lastPositionSec,
        completed: data.completed ?? false,
      },
      include: {
        lesson: {
          include: {
            module: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    })
  }

  async upsert(
    where: ProgressWhereUniqueInput,
    create: ProgressCreateInput,
    update: ProgressUpdateInput,
  ): Promise<LessonProgressWithRelations> {
    return await this.prisma.lessonProgress.upsert({
      where: where as any,
      create: {
        userId: create.userId,
        lessonId: create.lessonId,
        watchedSec: create.watchedSec,
        lastPositionSec: create.lastPositionSec,
        completed: create.completed ?? false,
      },
      update: {
        watchedSec: update.watchedSec,
        lastPositionSec: update.lastPositionSec,
        completed: update.completed,
        updatedAt: new Date(),
      },
      include: {
        lesson: {
          include: {
            module: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    })
  }

  async findOne(where: ProgressWhereUniqueInput): Promise<LessonProgressWithRelations | null> {
    return await this.prisma.lessonProgress.findUnique({
      where: where as any,
      include: {
        lesson: {
          include: {
            module: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    })
  }

  async findMany(where: ProgressWhereInput): Promise<LessonProgressWithRelations[]> {
    return await this.prisma.lessonProgress.findMany({
      where: where as any,
      include: {
        lesson: {
          include: {
            module: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    })
  }

  async count(where: ProgressWhereInput): Promise<number> {
    return await this.prisma.lessonProgress.count({
      where: where as any,
    })
  }

  async getCourseProgress(userId: number, courseId: number) {
    // Get course with modules and lessons
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          include: {
            lessons: {
              orderBy: {
                order: 'asc',
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    })

    if (!course) {
      return null
    }

    // Get all progress for this user in this course
    const progresses = await this.prisma.lessonProgress.findMany({
      where: {
        userId,
        lesson: {
          module: {
            courseId,
          },
        },
      },
    })

    // Get enrollment
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    })

    return { course, progresses, enrollment }
  }

  async getCourseProgressDetails(userId: number, courseId: number) {
    // Get enrollment with course info
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    })

    if (!enrollment) {
      return null
    }

    // Get modules with lessons and progress
    const modules = await this.prisma.module.findMany({
      where: { courseId },
      include: {
        lessons: {
          include: {
            progress: {
              where: {
                userId,
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
      orderBy: {
        order: 'asc',
      },
    })

    return { enrollment, modules }
  }

  async getUserCourseCompletedLessons(userId: number, courseId: number): Promise<number> {
    return await this.prisma.lessonProgress.count({
      where: {
        userId,
        completed: true,
        lesson: {
          module: {
            courseId,
          },
        },
      },
    })
  }

  async getCourseTotalLessons(courseId: number): Promise<number> {
    return this.prisma.lesson.count({
      where: {
        module: {
          courseId,
        },
      },
    })
  }

  async getProgressSummary(userId: number): Promise<ProgressSummaryType[]> {
    // Get the first 4 enrolled courses for the user
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId },
      take: 4,
      orderBy: { createdAt: 'desc' },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            thumbnailUrl: true,
            level: true,
          },
        },
      },
    })

    if (enrollments.length === 0) {
      return []
    }

    // Get progress statistics for each course
    const progressSummaries = await Promise.all(
      enrollments.map(async (enrollment) => {
        const courseId = enrollment.courseId

        // Get total lessons count for this course
        const totalLessons = await this.getCourseTotalLessons(courseId)

        // Get completed lessons count for this course
        const completedLessons = await this.getUserCourseCompletedLessons(userId, courseId)

        // Get total watch time and duration for this course
        const progressData = await this.prisma.lessonProgress.findMany({
          where: {
            userId,
            lesson: {
              module: {
                courseId,
              },
            },
          },
          include: {
            lesson: {
              select: {
                durationSec: true,
              },
            },
          },
        })

        const totalWatchedTime = progressData.reduce((sum, progress) => sum + progress.watchedSec, 0)
        const totalDuration = progressData.reduce((sum, progress) => sum + (progress.lesson.durationSec || 0), 0)

        // Calculate progress percentage
        const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

        // Calculate watch time percentage
        const watchTimePercentage = totalDuration > 0 ? Math.round((totalWatchedTime / totalDuration) * 100) : 0

        return {
          enrollment: {
            id: enrollment.id,
            createdAt: enrollment.createdAt,
            expiresAt: enrollment.expiresAt,
          },
          course: enrollment.course,
          progress: {
            totalLessons,
            completedLessons,
            progressPercentage,
            totalWatchedTime,
            totalDuration,
            watchTimePercentage,
          },
        }
      }),
    )

    return progressSummaries
  }
}
