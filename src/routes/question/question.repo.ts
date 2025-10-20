import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import { JLPTLevelType, QuestionTypeType, DifficultyType } from 'src/shared/constants/enum.constant'
import { QuestionType } from 'src/shared/types/question.types'
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

  private readonly includeWithOptions = {
    option: {
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

  async create(data: QuestionCreateInput): Promise<QuestionType> {
    return await this.prisma.question.create({
      data: data as any,
      include: {
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

  async createWithOptions(
    questionData: any,
    options: Array<{
      content: string
      isCorrect: boolean
      order: number
    }>,
  ): Promise<any> {
    return await this.prisma.question.create({
      data: {
        ...questionData,
        option: {
          create: options,
        },
      },
      include: this.includeWithOptions,
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
      return await this.prisma.question.findMany({
        skip,
        take,
        where,
        orderBy,
        include: this.includeWithOptions,
      })
    }

    return await this.prisma.question.findMany({
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

    return await this.prisma.question.findMany({
      skip,
      take,
      where,
      orderBy,
      include: {
        _count: {
          select: {
            option: true,
          },
        },
        option: {
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

  async findUnique(where: QuestionWhereUniqueInput, includeOptions = true): Promise<QuestionType | null> {
    if (includeOptions) {
      return await this.prisma.question.findUnique({
        where: where as any,
        include: this.includeWithOptions,
      })
    }

    return await this.prisma.question.findUnique({
      where: where as any,
    })
  }

  async update(where: QuestionWhereUniqueInput, data: any): Promise<QuestionType> {
    return await this.prisma.question.update({
      where: where as any,
      data,
      include: {
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
    return await this.prisma.$transaction(async (tx) => {
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

      // Return await updated question with options
      return await tx.question.findUnique({
        where: { id: questionId },
        include: this.includeWithOptions,
      })
    })
  }

  async delete(where: QuestionWhereUniqueInput): Promise<QuestionType> {
    // Options will be deleted automatically due to cascade
    return await this.prisma.question.delete({
      where: where as any,
    })
  }

  async count(where?: QuestionWhereInput): Promise<number> {
    return await this.prisma.question.count({ where })
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
    return await this.prisma.$transaction(async (tx) => {
      const createdQuestions: any[] = []

      for (const { questionData, options } of questions) {
        const question = await tx.question.create({
          data: {
            ...questionData,
            option: {
              create: options,
            },
          },
          include: this.includeWithOptions,
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

  async createMedia(data: {
    url: string
    kind: string
    caption?: string | null
    mimeType?: string
    sizeByte?: number
  }): Promise<{ id: number; url: string; kind: string; caption?: string | null }> {
    return await this.prisma.mediaAsset.create({
      data: {
        url: data.url,
        kind: data.kind as any,
        caption: data.caption,
        mimeType: data.mimeType,
        sizeByte: data.sizeByte,
        status: 'READY',
      },
      select: {
        id: true,
        url: true,
        kind: true,
        caption: true,
      },
    })
  }
}
