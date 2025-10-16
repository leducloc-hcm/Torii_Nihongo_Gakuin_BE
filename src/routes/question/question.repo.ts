import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import { JLPTLevel, QuestionType, Difficulty, Question } from '@prisma/client'
import {
  QuestionCreateInput,
  QuestionUpdateInput,
  QuestionWhereUniqueInput,
  QuestionWhereInput,
  QuestionOrderByInput,
  QuestionWithOptions,
} from './question.model'

@Injectable()
export class QuestionRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly includeOptions = {
    options: {
      orderBy: {
        order: 'asc' as const,
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

  async create(data: QuestionCreateInput): Promise<any> {
    return this.prisma.question.create({
      data,
      include: this.includeOptions,
    })
  }

  async createWithOptions(
    questionData: any,
    options: Array<{
      content: string
      isCorrect: boolean
      order: number
    }>,
  ): Promise<any> {
    return this.prisma.question.create({
      data: {
        ...questionData,
        options: {
          create: options,
        },
      },
      include: this.includeOptions,
    })
  }

  async findMany(params: {
    skip?: number
    take?: number
    where?: QuestionWhereInput
    orderBy?: QuestionOrderByInput
    includeOptions?: boolean
  }): Promise<any[]> {
    const { skip, take, where, orderBy, includeOptions = false } = params

    if (includeOptions) {
      return this.prisma.question.findMany({
        skip,
        take,
        where,
        orderBy,
        include: this.includeOptions,
      })
    }

    return this.prisma.question.findMany({
      skip,
      take,
      where,
      orderBy,
    })
  }

  async findManyWithStats(params: {
    skip?: number
    take?: number
    where?: QuestionWhereInput
    orderBy?: QuestionOrderByInput
  }) {
    const { skip, take, where, orderBy } = params

    return this.prisma.question.findMany({
      skip,
      take,
      where,
      orderBy,
      include: {
        _count: {
          select: {
            options: true,
          },
        },
        options: {
          select: {
            isCorrect: true,
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

  async findUnique(where: QuestionWhereUniqueInput, includeOptions = true): Promise<any | null> {
    if (includeOptions) {
      return this.prisma.question.findUnique({
        where,
        include: this.includeOptions,
      })
    }

    return this.prisma.question.findUnique({
      where,
    })
  }

  async update(where: QuestionWhereUniqueInput, data: any): Promise<any> {
    return this.prisma.question.update({
      where,
      data,
      include: this.includeOptions,
    })
  }

  async updateWithOptions(
    questionId: number,
    questionData: any,
    options?: Array<{
      id?: number
      content: string
      isCorrect: boolean
      order: number
    }>,
  ): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      // Update question data
      if (Object.keys(questionData).length > 0) {
        await tx.question.update({
          where: { id: questionId },
          data: questionData,
        })
      }

      // Update options if provided
      if (options && options.length > 0) {
        // Delete existing options
        await tx.option.deleteMany({
          where: { questionId },
        })

        // Create new options
        await tx.option.createMany({
          data: options.map((option) => ({
            questionId,
            content: option.content,
            isCorrect: option.isCorrect,
            order: option.order,
          })),
        })
      }

      // Return updated question with options
      return tx.question.findUnique({
        where: { id: questionId },
        include: this.includeOptions,
      })
    })
  }

  async delete(where: QuestionWhereUniqueInput): Promise<Question> {
    // Options will be deleted automatically due to cascade
    return this.prisma.question.delete({
      where,
    })
  }

  async count(where?: QuestionWhereInput): Promise<number> {
    return this.prisma.question.count({ where })
  }

  async getStatistics(): Promise<{
    totalQuestions: number
    byType: Record<string, number>
    byLevel: Record<string, number>
    byDifficulty: Record<string, number>
    withMedia: number
    withoutMedia: number
  }> {
    const [total, byType, byLevel, byDifficulty, withMedia, withoutMedia] = await Promise.all([
      // Total count
      this.prisma.question.count(),

      // Group by type
      this.prisma.question.groupBy({
        by: ['type'],
        _count: { _all: true },
      }),

      // Group by level
      this.prisma.question.groupBy({
        by: ['level'],
        _count: { _all: true },
      }),

      // Group by difficulty
      this.prisma.question.groupBy({
        by: ['difficulty'],
        _count: { _all: true },
      }),

      // With media
      this.prisma.question.count({
        where: { mediaId: { not: null } },
      }),

      // Without media
      this.prisma.question.count({
        where: { mediaId: null },
      }),
    ])

    return {
      totalQuestions: total,
      byType: Object.fromEntries(byType.map((item) => [item.type, item._count._all])),
      byLevel: Object.fromEntries(byLevel.map((item) => [item.level, item._count._all])),
      byDifficulty: Object.fromEntries(byDifficulty.map((item) => [item.difficulty, item._count._all])),
      withMedia,
      withoutMedia,
    }
  }

  async bulkCreate(
    questions: Array<{
      questionData: any
      options: Array<{
        content: string
        isCorrect: boolean
        order: number
      }>
    }>,
  ): Promise<any[]> {
    return this.prisma.$transaction(async (tx) => {
      const createdQuestions: any[] = []

      for (const { questionData, options } of questions) {
        const question = await tx.question.create({
          data: {
            ...questionData,
            options: {
              create: options,
            },
          },
          include: this.includeOptions,
        })

        createdQuestions.push(question)
      }

      return createdQuestions
    })
  }

  async checkExists(id: number): Promise<boolean> {
    const count = await this.prisma.question.count({
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
}
