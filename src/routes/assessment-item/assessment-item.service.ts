import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { AssessmentItemRepository } from './assessment-item.repo'
import { CreateAssessmentItemDto, UpdateAssessmentItemDto, AssessmentItemQueryDto } from './assessment-item.dto'
import { PrismaService } from 'src/shared/services/prisma.service'

@Injectable()
export class AssessmentItemService {
  constructor(
    private readonly repo: AssessmentItemRepository,
    private readonly prisma: PrismaService,
  ) {}

  async createAssessmentItem(data: CreateAssessmentItemDto) {
    const section = await this.prisma.assessmentSection.findUnique({
      where: { id: data.sectionId },
    })
    if (!section) {
      throw new NotFoundException(`AssessmentSection with ID ${data.sectionId} not found`)
    }

    if (data.questionIds?.length) {
      const questions = await this.prisma.question.findMany({
        where: { id: { in: data.questionIds } },
      })
      if (questions.length !== data.questionIds.length) {
        throw new BadRequestException('Some questions not found')
      }
    }

    // Validate question groups exist if provided
    if (data.questionGroupIds?.length) {
      const groups = await this.prisma.questionGroup.findMany({
        where: { id: { in: data.questionGroupIds } },
      })
      if (groups.length !== data.questionGroupIds.length) {
        throw new BadRequestException('Some question groups not found')
      }
    }

    const item = await this.repo.create(data)
    return this.transformResponse(item)
  }

  async getAssessmentItem(id: number) {
    const item = await this.repo.findById(id)
    if (!item) {
      throw new NotFoundException(`AssessmentItem with ID ${id} not found`)
    }
    return this.transformResponse(item)
  }

  async getAssessmentItems(query: AssessmentItemQueryDto) {
    const result = await this.repo.findMany(query)
    return {
      ...result,
      data: result.data.map((item) => this.transformResponse(item)),
    }
  }

  async update(id: number, data: UpdateAssessmentItemDto) {
    const existing = await this.repo.findById(id)
    if (!existing) {
      throw new NotFoundException(`AssessmentItem with ID ${id} not found`)
    }

    if (data.questionIds?.length) {
      const questions = await this.prisma.question.findMany({
        where: { id: { in: data.questionIds } },
      })
      if (questions.length !== data.questionIds.length) {
        throw new BadRequestException('Some questions not found')
      }
    }

    if (data.questionGroupIds?.length) {
      const groups = await this.prisma.questionGroup.findMany({
        where: { id: { in: data.questionGroupIds } },
      })
      if (groups.length !== data.questionGroupIds.length) {
        throw new BadRequestException('Some question groups not found')
      }
    }

    const item = await this.repo.update(id, data)
    return this.transformResponse(item)
  }

  async delete(id: number) {
    const existing = await this.repo.findById(id)
    if (!existing) {
      throw new NotFoundException(`AssessmentItem with ID ${id} not found`)
    }

    await this.repo.delete(id)
    return { message: 'AssessmentItem deleted successfully' }
  }

  private transformResponse(item: any) {
    return {
      id: item.id,
      sectionId: item.sectionId,
      name: item.name,
      order: item.order,
      scorePerQuestion: item.scorePerQuestion,
      questions: item.questions?.map((q: any) => q.question) || [],
      questionGroups: item.questionGroups?.map((qg: any) => qg.group) || [],
    }
  }
}
