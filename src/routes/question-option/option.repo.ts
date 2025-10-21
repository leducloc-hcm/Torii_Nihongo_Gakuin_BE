import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import { OptionType } from 'src/shared/types/question.types'
import {
  OptionCreateInput,
  OptionUpdateInput,
  OptionWhereUniqueInput,
  OptionWhereInput,
  OptionOrderByInput,
  OptionWithQuestion,
} from './option.model'

@Injectable()
export class OptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly includeQuestion = {
    question: {
      select: {
        id: true,
        stem: true,
        type: true,
        level: true,
      },
    },
  } as const

  async create(data: OptionCreateInput): Promise<any> {
    return await this.prisma.option.create({
      data,
      include: this.includeQuestion,
    })
  }

  async findMany(params: {
    skip?: number
    take?: number
    where?: OptionWhereInput
    orderBy?: OptionOrderByInput
    includeQuestion?: boolean
  }): Promise<any[]> {
    const { skip, take, where, orderBy, includeQuestion = false } = params

    return await this.prisma.option.findMany({
      skip,
      take,
      where,
      orderBy,
      include: includeQuestion ? this.includeQuestion : undefined,
    })
  }

  async findUnique(where: OptionWhereUniqueInput, includeQuestion = true): Promise<any | null> {
    return await this.prisma.option.findUnique({
      where: where as any,
      include: includeQuestion ? this.includeQuestion : undefined,
    })
  }

  async update(where: OptionWhereUniqueInput, data: any): Promise<any> {
    return await this.prisma.option.update({
      where: where as any,
      data,
      include: this.includeQuestion,
    })
  }

  async delete(where: OptionWhereUniqueInput): Promise<OptionType> {
    return await this.prisma.option.delete({
      where: where as any,
    })
  }

  async count(where?: OptionWhereInput): Promise<number> {
    return await this.prisma.option.count({ where })
  }

  async findByQuestionId(questionId: number): Promise<OptionType[]> {
    return await this.prisma.option.findMany({
      where: { questionId },
      orderBy: { order: 'asc' },
    })
  }

  async bulkCreate(
    questionId: number,
    options: Array<{
      content: string
      isCorrect: boolean
      order: number
    }>,
  ): Promise<any[]> {
    return await this.prisma.$transaction(async (tx) => {
      const createdOptions: any[] = []

      for (const option of options) {
        const created = await tx.option.create({
          data: {
            questionId,
            content: option.content,
            isCorrect: option.isCorrect,
            order: option.order,
          },
          include: this.includeQuestion,
        })
        createdOptions.push(created)
      }

      return createdOptions
    })
  }

  async bulkUpdateOrder(
    updates: Array<{
      id: number
      order: number
    }>,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      for (const update of updates) {
        await tx.option.update({
          where: { id: update.id },
          data: { order: update.order },
        })
      }
    })
  }

  async deleteByQuestionId(questionId: number): Promise<void> {
    await this.prisma.option.deleteMany({
      where: { questionId },
    })
  }

  async checkExists(id: number): Promise<boolean> {
    const count = await this.prisma.option.count({
      where: { id },
    })
    return count > 0
  }

  async checkQuestionExists(questionId: number): Promise<boolean> {
    const count = await this.prisma.question.count({
      where: { id: questionId },
    })
    return count > 0
  }

  async createMedia(url: string, mimeType: string, sizeByte: number, caption?: string) {
    return await this.prisma.mediaAsset.create({
      data: {
        url,
        mimeType,
        sizeByte,
        caption,
        kind: 'OTHER',
        status: 'READY',
      },
    })
  }

  async getNextOrder(questionId: number): Promise<number> {
    const lastOption = await this.prisma.option.findFirst({
      where: { questionId },
      orderBy: { order: 'desc' },
      select: { order: true },
    })
    return (lastOption?.order ?? -1) + 1
  }

  async validateCorrectOptions(
    questionId: number,
    excludeId?: number,
  ): Promise<{
    hasCorrectOption: boolean
    correctCount: number
  }> {
    const where: any = { questionId }
    if (excludeId) {
      where.id = { not: excludeId }
    }

    const correctOptions = await this.prisma.option.findMany({
      where: {
        ...where,
        isCorrect: true,
      },
      select: { id: true },
    })

    return {
      hasCorrectOption: correctOptions.length > 0,
      correctCount: correctOptions.length,
    }
  }

  async getOptionsByQuestion(questionId: number): Promise<{
    total: number
    correct: number
    options: OptionType[]
  }> {
    const [total, options] = await Promise.all([this.count({ questionId }), this.findByQuestionId(questionId)])

    const correct = options.filter((opt) => opt.isCorrect).length

    return { total, correct, options }
  }
}
