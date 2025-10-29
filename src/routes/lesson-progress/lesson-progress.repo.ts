import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  ProgressCreateInput,
  ProgressUpdateInput,
  ProgressWhereUniqueInput,
  ProgressWhereInput,
  LessonProgressWithRelations,
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
}
