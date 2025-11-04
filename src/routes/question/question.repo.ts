import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  QuestionCreateInput,
  QuestionOrderByInput,
  QuestionWhereInput,
  QuestionWhereUniqueInput,
} from './question.model'

@Injectable()
export class QuestionRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly includeWithOptions = {
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
    try {
      return await this.prisma.question.create({
        data: data as any,
        include: {
          options: {
            orderBy: {
              order: 'asc',
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
    } catch (error) {
      throw new Error(`Failed to create question: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
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
        options: {
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

    try {
      if (includeOptions) {
        return await this.prisma.question.findMany({
          skip,
          take,
          where: where as any,
          orderBy: orderBy as any,
          include: this.includeWithOptions,
        })
      }

      return await this.prisma.question.findMany({
        skip,
        take,
        where: where as any,
        orderBy: orderBy as any,
      })
    } catch (error) {
      throw new Error(`Failed to fetch questions: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async findManyWithStats(params: {
    skip?: number
    take?: number
    where?: QuestionWhereInput
    orderBy?: QuestionOrderByInput
  }): Promise<any[]> {
    const { skip, take, where, orderBy } = params

    try {
      return await this.prisma.question.findMany({
        skip,
        take,
        where: where as any,
        orderBy: orderBy as any,
        include: {
          _count: {
            select: {
              options: true,
            },
          },
          options: {
            include: {
              question: true,
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
    } catch (error) {
      throw new Error(
        `Failed to fetch questions with stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  async findUnique(where: QuestionWhereUniqueInput, includeOptions = true): Promise<any | null> {
    try {
      if (includeOptions) {
        return await this.prisma.question.findUnique({
          where: where as any,
          include: this.includeWithOptions,
        })
      }

      return await this.prisma.question.findUnique({
        where: where as any,
      })
    } catch (error) {
      throw new Error(`Failed to find question: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async update(where: QuestionWhereUniqueInput, data: any): Promise<any> {
    try {
      return await this.prisma.question.update({
        where: where as any,
        data,
        include: {
          options: {
            orderBy: {
              order: 'asc',
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
    } catch (error) {
      throw new Error(`Failed to update question: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
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

  async delete(where: QuestionWhereUniqueInput): Promise<any> {
    try {
      // Options will be deleted automatically due to cascade
      return await this.prisma.question.delete({
        where: where as any,
      })
    } catch (error) {
      throw new Error(`Failed to delete question: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async count(where?: QuestionWhereInput): Promise<number> {
    try {
      return await this.prisma.question.count({ where: where as any })
    } catch (error) {
      throw new Error(`Failed to count questions: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
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
            options: {
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
    try {
      const count = await this.prisma.mediaAsset.count({
        where: { id: mediaId },
      })
      return count > 0
    } catch (error) {
      throw new Error(`Failed to check media existence: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Helper method to get questions by specific filters (similar to test-section pattern)
  async findByFilters(filters: {
    type?: string
    level?: string
    difficulty?: string
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: string
  }): Promise<{ data: any[]; total: number }> {
    const { type, level, difficulty, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = filters

    const skip = (page - 1) * limit
    const where: any = {}

    if (type) where.type = type
    if (level) where.level = level
    if (difficulty) where.difficulty = difficulty

    const orderBy: any = {}
    if (sortBy && sortOrder) {
      orderBy[sortBy] = sortOrder
    }

    try {
      const [data, total] = await Promise.all([
        this.findManyWithStats({ skip, take: limit, where, orderBy }),
        this.count(where),
      ])

      return { data, total }
    } catch (error) {
      throw new Error(
        `Failed to find questions by filters: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  async createMedia(data: {
    url: string
    kind: string
    caption?: string | null
    mimeType?: string
    sizeByte?: number
    meta?: any
  }): Promise<{ id: number; url: string; kind: string; caption?: string | null; meta?: any }> {
    return await this.prisma.mediaAsset.create({
      data: {
        url: data.url,
        kind: data.kind as any,
        caption: data.caption,
        mimeType: data.mimeType,
        sizeByte: data.sizeByte,
        meta: data.meta,
        status: 'READY',
      },
      select: {
        id: true,
        url: true,
        kind: true,
        caption: true,
        meta: true,
      },
    })
  }

  async isQuestionUsed(questionId: number): Promise<boolean> {
    const [assessmentItemsCount, quizItemsCount, assessmentAnswersCount, quizAnswersCount] = await Promise.all([
      this.prisma.assessmentItemQuestion.count({
        where: { questionId },
      }),
      this.prisma.quizItemQuestion.count({
        where: { questionId },
      }),
      this.prisma.assessmentAnswer.count({
        where: { questionId },
      }),
      this.prisma.quizAnswer.count({
        where: { questionId },
      }),
    ])

    return assessmentItemsCount > 0 || quizItemsCount > 0 || assessmentAnswersCount > 0 || quizAnswersCount > 0
  }

  async findVersionsByUuid(uuid: string): Promise<any[]> {
    return await this.prisma.question.findMany({
      where: { uuid },
      orderBy: { version: 'desc' },
      include: this.includeWithOptions,
    })
  }

  async getLatestVersion(uuid: string): Promise<number> {
    const latest = await this.prisma.question.findFirst({
      where: { uuid },
      orderBy: { version: 'desc' },
      select: { version: true },
    })

    return latest?.version || 0
  }

  async cloneQuestion(questionId: number, modifications?: Partial<any>): Promise<any> {
    return await this.prisma.$transaction(async (tx) => {
      // Get original question with options
      const original = await tx.question.findUnique({
        where: { id: questionId },
        include: {
          options: {
            orderBy: { order: 'asc' },
          },
          media: true,
        },
      })

      if (!original) {
        throw new Error('Question not found')
      }

      const questionUuid = original.uuid || undefined

      const latestVersion = await this.getLatestVersion(questionUuid || '')
      const newVersion = latestVersion + 1

      const newQuestion = await tx.question.create({
        data: {
          uuid: questionUuid,
          version: newVersion,
          type: modifications?.type || original.type,
          level: modifications?.level || original.level,
          difficulty: modifications?.difficulty || original.difficulty,
          stem: modifications?.stem || original.stem,
          passage: modifications?.passage !== undefined ? modifications.passage : original.passage,
          explanation: modifications?.explanation !== undefined ? modifications.explanation : original.explanation,
          readingLength:
            modifications?.readingLength !== undefined ? modifications.readingLength : original.readingLength,
          mediaId: modifications?.mediaId !== undefined ? modifications.mediaId : original.mediaId,
        },
        include: {
          media: true,
        },
      })

      const optionsToClone = modifications?.options || original.options
      if (optionsToClone && optionsToClone.length > 0) {
        await tx.option.createMany({
          data: optionsToClone.map((opt: any) => ({
            questionId: newQuestion.id,
            content: opt.content,
            mediaId: opt.mediaId,
            isCorrect: opt.isCorrect,
            order: opt.order,
          })),
        })
      }

      // Return the complete new question
      return await tx.question.findUnique({
        where: { id: newQuestion.id },
        include: this.includeWithOptions,
      })
    })
  }

  async findByUuidAndVersion(uuid: string, version: number): Promise<any | null> {
    return await this.prisma.question.findFirst({
      where: {
        uuid,
        version,
      },
      include: this.includeWithOptions,
    })
  }
}
