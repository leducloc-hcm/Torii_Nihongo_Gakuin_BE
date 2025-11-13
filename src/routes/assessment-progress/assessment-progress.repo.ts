import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import { Prisma } from '@prisma/client'

@Injectable()
export class AssessmentProgressRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.AssessmentProgressCreateInput) {
    return await this.prisma.assessmentProgress.create({
      data,
      include: {
        assessment: { select: { id: true, title: true, type: true, level: true } },
        user: { select: { id: true, name: true, email: true } },
        assignment: { select: { id: true, note: true, dueAt: true } },
        answers: {
          include: {
            question: { select: { id: true, stem: true, type: true } },
            selectedOption: { select: { id: true, content: true, isCorrect: true } },
          },
        },
      },
    })
  }

  async findUnique(where: Prisma.AssessmentProgressWhereUniqueInput) {
    return await this.prisma.assessmentProgress.findUnique({
      where,
      include: {
        assessment: { select: { id: true, title: true, type: true, level: true } },
        user: { select: { id: true, name: true, email: true } },
        assignment: { select: { id: true, note: true, dueAt: true } },
        answers: {
          include: {
            question: { select: { id: true, stem: true, type: true } },
            selectedOption: { select: { id: true, content: true, isCorrect: true } },
          },
          orderBy: { lastUpdatedAt: 'desc' },
        },
      },
    })
  }

  async findFirst(where: Prisma.AssessmentProgressWhereInput) {
    return await this.prisma.assessmentProgress.findFirst({
      where,
      include: {
        assessment: true,
        user: { select: { id: true, name: true, email: true } },
        assignment: true,
        answers: {
          include: {
            question: true,
            selectedOption: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    })
  }

  async findMany(params: {
    where?: Prisma.AssessmentProgressWhereInput
    orderBy?: Prisma.AssessmentProgressOrderByWithRelationInput
    skip?: number
    take?: number
  }) {
    const { where, orderBy, skip, take } = params
    return await this.prisma.assessmentProgress.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        assessment: { select: { id: true, title: true, type: true, level: true } },
        user: { select: { id: true, name: true, email: true } },
        assignment: { select: { id: true, note: true, dueAt: true } },
        _count: { select: { answers: true } },
      },
    })
  }

  async findManyWithPagination(params: {
    where?: Prisma.AssessmentProgressWhereInput
    orderBy?: Prisma.AssessmentProgressOrderByWithRelationInput
  }) {
    // Thêm điều kiện chỉ hiển thị những bài chưa submitted
    const whereCondition: Prisma.AssessmentProgressWhereInput = {
      isSubmitted: false,
      assignmentId: null,
    }

    const [items] = await Promise.all([
      this.findMany({ where: whereCondition }),
      this.prisma.assessmentProgress.count({ where: whereCondition }),
    ])

    return {
      items,
    }
  }

  async findManyWithPaginationAssignment(params: {
    where?: Prisma.AssessmentProgressWhereInput
    orderBy?: Prisma.AssessmentProgressOrderByWithRelationInput
  }) {
    const { where, orderBy } = params

    // Thêm điều kiện chỉ hiển thị những bài chưa submitted
    const whereCondition: Prisma.AssessmentProgressWhereInput = {
      ...where,
      isSubmitted: false,
      assignmentId: { not: null },
    }

    const [items, total] = await Promise.all([
      this.findMany({ where: whereCondition, orderBy }),
      this.prisma.assessmentProgress.count({ where: whereCondition }),
    ])

    return {
      items,
    }
  }

  async update(where: Prisma.AssessmentProgressWhereUniqueInput, data: Prisma.AssessmentProgressUpdateInput) {
    return await this.prisma.assessmentProgress.update({
      where,
      data,
      include: {
        assessment: { select: { id: true, title: true } },
        user: { select: { id: true, name: true } },
        assignment: { select: { id: true, note: true } },
        answers: {
          include: {
            question: { select: { id: true, stem: true } },
            selectedOption: { select: { id: true, content: true } },
          },
        },
      },
    })
  }

  async delete(where: Prisma.AssessmentProgressWhereUniqueInput) {
    return await this.prisma.assessmentProgress.delete({ where })
  }

  // ============= ANSWER PROGRESS CRUD =============

  async createAnswer(data: Prisma.AssessmentAnswerProgressCreateInput) {
    return await this.prisma.assessmentAnswerProgress.create({
      data,
      include: {
        question: { select: { id: true, stem: true, type: true } },
        selectedOption: { select: { id: true, content: true, isCorrect: true } },
        progress: { select: { id: true, assessmentId: true, userId: true } },
      },
    })
  }

  async findAnswer(where: Prisma.AssessmentAnswerProgressWhereUniqueInput) {
    return await this.prisma.assessmentAnswerProgress.findUnique({
      where,
      include: {
        question: true,
        selectedOption: true,
        progress: true,
      },
    })
  }

  async findAnswerByProgressAndQuestion(progressId: number, questionId: number) {
    return await this.prisma.assessmentAnswerProgress.findUnique({
      where: {
        progressId_questionId: { progressId, questionId },
      },
      include: {
        question: true,
        selectedOption: true,
      },
    })
  }

  async upsertAnswer(params: {
    where: Prisma.AssessmentAnswerProgressWhereUniqueInput
    create: Prisma.AssessmentAnswerProgressCreateInput
    update: Prisma.AssessmentAnswerProgressUpdateInput
  }) {
    try {
      // Try to update first
      return await this.prisma.assessmentAnswerProgress.update({
        where: params.where,
        data: params.update,
        include: {
          question: { select: { id: true, stem: true, type: true } },
          selectedOption: { select: { id: true, content: true, isCorrect: true } },
          progress: { select: { id: true, assessmentId: true, userId: true } },
        },
      })
    } catch (error: any) {
      // If record doesn't exist (P2025 error), try to create
      if (error.code === 'P2025') {
        try {
          return await this.prisma.assessmentAnswerProgress.create({
            data: params.create,
            include: {
              question: { select: { id: true, stem: true, type: true } },
              selectedOption: { select: { id: true, content: true, isCorrect: true } },
              progress: { select: { id: true, assessmentId: true, userId: true } },
            },
          })
        } catch (createError: any) {
          // If create fails due to unique constraint (P2002), try update again
          if (createError.code === 'P2002') {
            return await this.prisma.assessmentAnswerProgress.update({
              where: params.where,
              data: params.update,
              include: {
                question: { select: { id: true, stem: true, type: true } },
                selectedOption: { select: { id: true, content: true, isCorrect: true } },
                progress: { select: { id: true, assessmentId: true, userId: true } },
              },
            })
          }
          throw createError
        }
      }
      throw error
    }
  }

  async updateAnswer(
    where: Prisma.AssessmentAnswerProgressWhereUniqueInput,
    data: Prisma.AssessmentAnswerProgressUpdateInput,
  ) {
    return await this.prisma.assessmentAnswerProgress.update({
      where,
      data,
      include: {
        question: { select: { id: true, stem: true } },
        selectedOption: { select: { id: true, content: true, isCorrect: true } },
      },
    })
  }

  async deleteAnswer(where: Prisma.AssessmentAnswerProgressWhereUniqueInput) {
    return await this.prisma.assessmentAnswerProgress.delete({ where })
  }

  async findManyAnswers(progressId: number) {
    return await this.prisma.assessmentAnswerProgress.findMany({
      where: { progressId },
      include: {
        question: true,
        selectedOption: true,
      },
      orderBy: { lastUpdatedAt: 'desc' },
    })
  }

  // ============= HELPER METHODS =============

  async checkExists(id: number): Promise<boolean> {
    const count = await this.prisma.assessmentProgress.count({ where: { id } })
    return (await count) > 0
  }

  async checkAnswerExists(id: number): Promise<boolean> {
    const count = await this.prisma.assessmentAnswerProgress.count({ where: { id } })
    return (await count) > 0
  }

  async checkAssessmentExists(id: number): Promise<boolean> {
    const count = await this.prisma.assessmentPaper.count({ where: { id } })
    return (await count) > 0
  }

  async checkUserExists(id: number): Promise<boolean> {
    const count = await this.prisma.user.count({ where: { id } })
    return (await count) > 0
  }

  async getProgressByUserAndAssessment(userId: number, assessmentId: number) {
    return await this.prisma.assessmentProgress.findFirst({
      where: {
        assessmentId,
        userId,
      },
      include: {
        assessment: true,
        assignment: true,
        answers: {
          include: {
            question: true,
            selectedOption: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' }, // Lấy progress mới nhất
    })
  }

  async getProgressByUserAssessmentAndAssignment(userId: number, assessmentId: number, assignmentId: number | null) {
    return await this.prisma.assessmentProgress.findFirst({
      where: {
        assessmentId,
        userId,
        assignmentId, // null nếu làm direct, hoặc assignmentId cụ thể nếu làm via assignment
      },
      include: {
        assessment: true,
        assignment: true,
        answers: {
          include: {
            question: true,
            selectedOption: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' }, // Lấy progress mới nhất
    })
  }

  async countUserAttemptsForAssignment(userId: number, assessmentId: number, assignmentId: number) {
    return await this.prisma.assessmentProgress.count({
      where: {
        assessmentId,
        userId,
        assignmentId,
        isSubmitted: true,
      },
    })
  }

  async getUserProgresses(userId: number) {
    return await this.prisma.assessmentProgress.findMany({
      where: { userId },
      include: {
        assessment: { select: { id: true, title: true, type: true, level: true } },
        assignment: { select: { id: true, note: true, dueAt: true } },
        _count: { select: { answers: true } },
      },
      orderBy: { startedAt: 'desc' },
    })
  }

  async getAssessmentProgresses(assessmentId: number) {
    return await this.prisma.assessmentProgress.findMany({
      where: { assessmentId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        assignment: { select: { id: true, note: true } },
        _count: { select: { answers: true } },
      },
      orderBy: { startedAt: 'desc' },
    })
  }

  async getCompletedCount(userId: number): Promise<number> {
    return await this.prisma.assessmentProgress.count({
      where: { userId, isSubmitted: true },
    })
  }

  async getInProgressCount(userId: number): Promise<number> {
    return await this.prisma.assessmentProgress.count({
      where: { userId, isSubmitted: false },
    })
  }

  async getAverageTimeSpent(assessmentId: number): Promise<number> {
    const result = await this.prisma.assessmentProgress.aggregate({
      where: { assessmentId, isSubmitted: true },
      _avg: { timeSpentSec: true },
    })
    return (await result._avg.timeSpentSec) || 0
  }

  // Method này không còn phù hợp vì đã bỏ unique constraint
  // async deleteUserProgress(userId: number, assessmentId: number) {
  //   return await this.prisma.assessmentProgress.delete({
  //     where: {
  //       assessmentId_userId: { assessmentId, userId },
  //     },
  //   })
  // }

  async deleteUserProgresses(userId: number, assessmentId: number) {
    // Xóa tất cả progress của user cho assessment này
    return await this.prisma.assessmentProgress.deleteMany({
      where: {
        assessmentId,
        userId,
      },
    })
  }
}
