import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import { Prisma } from '@prisma/client'

@Injectable()
export class AssessmentProgressRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.AssessmentProgressCreateInput) {
    return this.prisma.assessmentProgress.create({
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
    return this.prisma.assessmentProgress.findUnique({
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
    return this.prisma.assessmentProgress.findFirst({
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
    return this.prisma.assessmentProgress.findMany({
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
    page?: number
    limit?: number
    where?: Prisma.AssessmentProgressWhereInput
    orderBy?: Prisma.AssessmentProgressOrderByWithRelationInput
  }) {
    const { page = 1, limit = 10, where, orderBy } = params
    const skip = (page - 1) * limit

    // Thêm điều kiện chỉ hiển thị những bài chưa submitted
    const whereCondition: Prisma.AssessmentProgressWhereInput = {
      ...where,
      isSubmitted: false,
    }

    const [items, total] = await Promise.all([
      this.findMany({ where: whereCondition, orderBy, skip, take: limit }),
      this.prisma.assessmentProgress.count({ where: whereCondition }),
    ])

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async update(where: Prisma.AssessmentProgressWhereUniqueInput, data: Prisma.AssessmentProgressUpdateInput) {
    return this.prisma.assessmentProgress.update({
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
    return this.prisma.assessmentProgress.delete({ where })
  }

  // ============= ANSWER PROGRESS CRUD =============

  async createAnswer(data: Prisma.AssessmentAnswerProgressCreateInput) {
    return this.prisma.assessmentAnswerProgress.create({
      data,
      include: {
        question: { select: { id: true, stem: true, type: true } },
        selectedOption: { select: { id: true, content: true, isCorrect: true } },
        progress: { select: { id: true, assessmentId: true, userId: true } },
      },
    })
  }

  async findAnswer(where: Prisma.AssessmentAnswerProgressWhereUniqueInput) {
    return this.prisma.assessmentAnswerProgress.findUnique({
      where,
      include: {
        question: true,
        selectedOption: true,
        progress: true,
      },
    })
  }

  async findAnswerByProgressAndQuestion(progressId: number, questionId: number) {
    return this.prisma.assessmentAnswerProgress.findUnique({
      where: {
        progressId_questionId: { progressId, questionId },
      },
      include: {
        question: true,
        selectedOption: true,
      },
    })
  }

  async updateAnswer(
    where: Prisma.AssessmentAnswerProgressWhereUniqueInput,
    data: Prisma.AssessmentAnswerProgressUpdateInput,
  ) {
    return this.prisma.assessmentAnswerProgress.update({
      where,
      data,
      include: {
        question: { select: { id: true, stem: true } },
        selectedOption: { select: { id: true, content: true, isCorrect: true } },
      },
    })
  }

  async deleteAnswer(where: Prisma.AssessmentAnswerProgressWhereUniqueInput) {
    return this.prisma.assessmentAnswerProgress.delete({ where })
  }

  async findManyAnswers(progressId: number) {
    return this.prisma.assessmentAnswerProgress.findMany({
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
    return count > 0
  }

  async checkAnswerExists(id: number): Promise<boolean> {
    const count = await this.prisma.assessmentAnswerProgress.count({ where: { id } })
    return count > 0
  }

  async checkAssessmentExists(id: number): Promise<boolean> {
    const count = await this.prisma.assessmentPaper.count({ where: { id } })
    return count > 0
  }

  async checkUserExists(id: number): Promise<boolean> {
    const count = await this.prisma.user.count({ where: { id } })
    return count > 0
  }

  async getProgressByUserAndAssessment(userId: number, assessmentId: number) {
    return this.prisma.assessmentProgress.findFirst({
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

  async getUserProgresses(userId: number) {
    return this.prisma.assessmentProgress.findMany({
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
    return this.prisma.assessmentProgress.findMany({
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
    return this.prisma.assessmentProgress.count({
      where: { userId, isSubmitted: true },
    })
  }

  async getInProgressCount(userId: number): Promise<number> {
    return this.prisma.assessmentProgress.count({
      where: { userId, isSubmitted: false },
    })
  }

  async getAverageTimeSpent(assessmentId: number): Promise<number> {
    const result = await this.prisma.assessmentProgress.aggregate({
      where: { assessmentId, isSubmitted: true },
      _avg: { timeSpentSec: true },
    })
    return result._avg.timeSpentSec || 0
  }

  // Method này không còn phù hợp vì đã bỏ unique constraint
  // async deleteUserProgress(userId: number, assessmentId: number) {
  //   return this.prisma.assessmentProgress.delete({
  //     where: {
  //       assessmentId_userId: { assessmentId, userId },
  //     },
  //   })
  // }

  async deleteUserProgresses(userId: number, assessmentId: number) {
    // Xóa tất cả progress của user cho assessment này
    return this.prisma.assessmentProgress.deleteMany({
      where: {
        assessmentId,
        userId,
      },
    })
  }
}
