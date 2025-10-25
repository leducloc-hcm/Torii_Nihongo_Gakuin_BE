import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import {
  AssessmentItemRepository,
  CreateAssessmentItemInput,
  UpdateAssessmentItemInput,
  AssessmentItemQuery,
} from './assessment-item.repo'
import { AssessmentItemWithDetails } from './assessment-item.model'
import { AssessmentItem } from '@prisma/client'

export interface PaginatedAssessmentItems {
  data: AssessmentItemWithDetails[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

@Injectable()
export class AssessmentItemService {
  constructor(private readonly assessmentItemRepo: AssessmentItemRepository) {}

  async createAssessmentItem(data: CreateAssessmentItemInput): Promise<AssessmentItem> {
    return this.assessmentItemRepo.create(data)
  }

  async getAssessmentItem(
    id: number,
    includeRelations?: { question?: boolean; section?: boolean; questionGroup?: boolean },
  ): Promise<AssessmentItemWithDetails> {
    const item = await this.assessmentItemRepo.findById(id, includeRelations)
    if (!item) {
      throw new NotFoundException('Assessment item not found')
    }
    return item
  }

  async getAssessmentItems(query: AssessmentItemQuery): Promise<PaginatedAssessmentItems> {
    const { page = 1, limit = 20 } = query

    if (page < 1) {
      throw new BadRequestException('Page must be greater than 0')
    }

    if (limit < 1 || limit > 100) {
      throw new BadRequestException('Limit must be between 1 and 100')
    }

    const result = await this.assessmentItemRepo.findMany(query)

    return {
      data: result.items,
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
        hasNext: page < Math.ceil(result.total / limit),
        hasPrev: page > 1,
      },
    }
  }

  async updateAssessmentItem(id: number, data: UpdateAssessmentItemInput): Promise<AssessmentItem> {
    if (!(await this.assessmentItemRepo.exists(id))) {
      throw new NotFoundException('Assessment item not found')
    }

    return this.assessmentItemRepo.update(id, data)
  }

  async deleteAssessmentItem(id: number) {
    if (!(await this.assessmentItemRepo.exists(id))) {
      throw new NotFoundException('Assessment item not found')
    }

    await this.assessmentItemRepo.delete(id)
    return { message: 'Assessment item deleted successfully' }
  }

  async getAssessmentItemsBySectionId(sectionId: number): Promise<AssessmentItemWithDetails[]> {
    return this.assessmentItemRepo.getBySectionId(sectionId)
  }
}
