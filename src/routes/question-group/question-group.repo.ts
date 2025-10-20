import { Injectable } from '@nestjs/common'
import { QuestionGroupTypeType } from 'src/shared/constants/enum.constant'
import { PrismaService } from 'src/shared/services/prisma.service'

@Injectable()
export class QuestionGroupRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly includeQuestions = {
    questions: {
      select: {
        id: true,
        stem: true,
        type: true,
        level: true,
        difficulty: true,
      },
      orderBy: {
        id: 'asc' as const,
      },
    },
    media: {
      select: {
        id: true,
        url: true,
        kind: true,
        caption: true,
      },
    },
  } as const

  async create(data: any): Promise<any> {
    return await this.prisma.questionGroup.create({
      data,
      include: this.includeQuestions,
    })
  }

  async createWithQuestions(groupData: any, questionIds: number[] = []): Promise<any> {
    return await this.prisma.questionGroup.create({
      data: {
        ...groupData,
        questions:
          questionIds.length > 0
            ? {
                connect: questionIds.map((id) => ({ id })),
              }
            : undefined,
      },
      include: this.includeQuestions,
    })
  }

  async findMany(params: {
    skip?: number
    take?: number
    where?: any
    orderBy?: any
    includeQuestions?: boolean
  }): Promise<any[]> {
    const { skip, take, where, orderBy, includeQuestions = false } = params

    if (includeQuestions) {
      return await this.prisma.questionGroup.findMany({
        skip,
        take,
        where,
        orderBy,
        include: this.includeQuestions,
      })
    }

    return await this.prisma.questionGroup.findMany({
      skip,
      take,
      where,
      orderBy,
    })
  }

  async findManyWithStats(params: { skip?: number; take?: number; where?: any; orderBy?: any }) {
    const { skip, take, where, orderBy } = params

    return await this.prisma.questionGroup.findMany({
      skip,
      take,
      where,
      orderBy,
      include: {
        _count: {
          select: {
            questions: true,
          },
        },
        media: {
          select: {
            id: true,
            url: true,
            kind: true,
            caption: true,
          },
        },
      },
    })
  }

  async findUnique(where: any, includeQuestions = true): Promise<any | null> {
    if (includeQuestions) {
      return await this.prisma.questionGroup.findUnique({
        where,
        include: this.includeQuestions,
      })
    }

    return await this.prisma.questionGroup.findUnique({
      where,
    })
  }

  async update(where: any, data: any): Promise<any> {
    return await this.prisma.questionGroup.update({
      where,
      data,
      include: this.includeQuestions,
    })
  }

  async updateWithQuestions(groupId: number, groupData: any, questionIds?: number[]): Promise<any> {
    return await this.prisma.$transaction(async (tx) => {
      // Update group data
      if (Object.keys(groupData).length > 0) {
        await tx.questionGroup.update({
          where: { id: groupId },
          data: groupData,
        })
      }

      // Update questions if provided
      if (questionIds !== undefined) {
        // First, disconnect all questions
        await tx.question.updateMany({
          where: { questionGroupId: groupId },
          data: { questionGroupId: null },
        })

        // Then connect new questions
        if (questionIds.length > 0) {
          await tx.question.updateMany({
            where: { id: { in: questionIds } },
            data: { questionGroupId: groupId },
          })
        }
      }

      // Return await updated group with questions
      return await tx.questionGroup.findUnique({
        where: { id: groupId },
        include: this.includeQuestions,
      })
    })
  }

  async delete(where: any): Promise<any> {
    return await this.prisma.$transaction(async (tx) => {
      // First, disconnect all questions from this group
      await tx.question.updateMany({
        where: { questionGroupId: where.id },
        data: { questionGroupId: null },
      })

      // Then delete the group
      return await tx.questionGroup.delete({
        where,
      })
    })
  }

  async count(where?: any): Promise<number> {
    return await this.prisma.questionGroup.count({ where })
  }

  async getStatistics(): Promise<{
    totalGroups: number
    byType: Record<string, number>
    withMedia: number
    withoutMedia: number
    withPassage: number
    withoutPassage: number
    averageQuestionsPerGroup: number
  }> {
    const [total, byType, withMedia, withoutMedia, withPassage, withoutPassage, questionCounts] = await Promise.all([
      // Total count
      this.prisma.questionGroup.count(),

      // Group by type
      this.prisma.questionGroup.groupBy({
        by: ['type'],
        _count: { _all: true },
      }),

      // With media
      this.prisma.questionGroup.count({
        where: { mediaId: { not: null } },
      }),

      // Without media
      this.prisma.questionGroup.count({
        where: { mediaId: null },
      }),

      // With passage
      this.prisma.questionGroup.count({
        where: { passage: { not: null } },
      }),

      // Without passage
      this.prisma.questionGroup.count({
        where: { passage: null },
      }),

      // Question counts for average calculation
      this.prisma.questionGroup.findMany({
        select: {
          _count: {
            select: { questions: true },
          },
        },
      }),
    ])

    const totalQuestions = questionCounts.reduce((sum, group) => sum + group._count.questions, 0)
    const averageQuestionsPerGroup = total > 0 ? totalQuestions / total : 0

    return {
      totalGroups: total,
      byType: Object.fromEntries(byType.map((item) => [item.type, item._count._all])),
      withMedia,
      withoutMedia,
      withPassage,
      withoutPassage,
      averageQuestionsPerGroup: Math.round(averageQuestionsPerGroup * 100) / 100, // Round to 2 decimal places
    }
  }

  async bulkCreate(
    groups: Array<{
      groupData: any
      questionIds: number[]
    }>,
  ): Promise<any[]> {
    return await this.prisma.$transaction(async (tx) => {
      const createdGroups: any[] = []

      for (const { groupData, questionIds } of groups) {
        const group = await tx.questionGroup.create({
          data: {
            ...groupData,
            questions:
              questionIds.length > 0
                ? {
                    connect: questionIds.map((id) => ({ id })),
                  }
                : undefined,
          },
          include: this.includeQuestions,
        })

        createdGroups.push(group)
      }

      return createdGroups
    })
  }

  async addQuestionsToGroup(groupId: number, questionIds: number[]): Promise<any> {
    return await this.prisma.$transaction(async (tx) => {
      // Connect questions to the group
      await tx.question.updateMany({
        where: { id: { in: questionIds } },
        data: { questionGroupId: groupId },
      })

      // Return await updated group
      return await tx.questionGroup.findUnique({
        where: { id: groupId },
        include: this.includeQuestions,
      })
    })
  }

  async removeQuestionsFromGroup(groupId: number, questionIds: number[]): Promise<any> {
    return await this.prisma.$transaction(async (tx) => {
      // Disconnect questions from the group
      await tx.question.updateMany({
        where: {
          id: { in: questionIds },
          questionGroupId: groupId,
        },
        data: { questionGroupId: null },
      })

      // Return await updated group
      return await tx.questionGroup.findUnique({
        where: { id: groupId },
        include: this.includeQuestions,
      })
    })
  }

  async checkExists(id: number): Promise<boolean> {
    const count = await this.prisma.questionGroup.count({
      where: { id },
    })
    return count > 0
  }

  async checkMediaExists(mediaId: number): Promise<boolean> {
    const count = await this.prisma.mediaAsset.count({
      where: { id: mediaId },
    })
    return count > 0
  }

  async checkQuestionsExist(questionIds: number[]): Promise<{
    existing: number[]
    missing: number[]
  }> {
    const existingQuestions = await this.prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: { id: true },
    })

    const existing = existingQuestions.map((q) => q.id)
    const missing = questionIds.filter((id) => !existing.includes(id))

    return { existing, missing }
  }
  async getGroupsByType(type: QuestionGroupTypeType): Promise<any[]> {
    return await this.prisma.questionGroup.findMany({
      where: { type: type as any },
      include: this.includeQuestions,
    })
  }
}
