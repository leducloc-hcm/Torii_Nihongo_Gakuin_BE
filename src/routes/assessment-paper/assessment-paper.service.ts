import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common'
import { AssessmentPaperRepository } from './assessment-paper.repo'
import {
  AssessmentPaperBase,
  AssessmentPaperWithRelations,
  AssessmentPaperBasic,
  CreateAssessmentPaperInput,
  UpdateAssessmentPaperInput,
  AssessmentPaperQuery,
} from './assessment-paper.model'

@Injectable()
export class AssessmentPaperService {
  constructor(private readonly assessmentPaperRepo: AssessmentPaperRepository) {}

  async createAssessmentPaper(data: CreateAssessmentPaperInput): Promise<AssessmentPaperBase> {
    const titleExists = await this.assessmentPaperRepo.getTitleExists(data.title)
    if (titleExists) {
      throw new ConflictException(`Assessment paper with title "${data.title}" already exists`)
    }

    return this.assessmentPaperRepo.create(data)
  }

  async getAssessmentPaper(id: number): Promise<AssessmentPaperBase> {
    const assessmentPaper = await this.assessmentPaperRepo.findById(id)
    if (!assessmentPaper) {
      throw new NotFoundException(`Assessment paper with ID ${id} not found`)
    }
    return assessmentPaper
  }

  async getAssessmentPaperWithRelations(id: number): Promise<AssessmentPaperWithRelations> {
    const assessmentPaper = await this.assessmentPaperRepo.findByIdWithRelations(id)
    if (!assessmentPaper) {
      throw new NotFoundException(`Assessment paper with ID ${id} not found`)
    }
    return assessmentPaper
  }

  async updateAssessmentPaper(id: number, data: UpdateAssessmentPaperInput): Promise<AssessmentPaperBase> {
    const existingAssessmentPaper = await this.assessmentPaperRepo.findById(id)
    if (!existingAssessmentPaper) {
      throw new NotFoundException(`Assessment paper with ID ${id} not found`)
    }

    if (data.title && data.title !== existingAssessmentPaper.title) {
      const titleExists = await this.assessmentPaperRepo.getTitleExists(data.title, id)
      if (titleExists) {
        throw new ConflictException(`Assessment paper with title "${data.title}" already exists`)
      }
    }

    return this.assessmentPaperRepo.update(id, data)
  }

  async deleteAssessmentPaper(id: number) {
    const exists = await this.assessmentPaperRepo.exists(id)
    if (!exists) {
      throw new NotFoundException(`Assessment paper with ID ${id} not found`)
    }

    try {
      await this.assessmentPaperRepo.delete(id)
      return { message: 'Assessment paper deleted successfully' }
    } catch (error: any) {
      if (error.code === 'P2003') {
        throw new BadRequestException('Cannot delete assessment paper because it has associated attempts')
      }
      throw error
    }
  }

  async getAssessmentPapers(query: AssessmentPaperQuery): Promise<{
    data: AssessmentPaperBasic[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }> {
    return this.assessmentPaperRepo.findMany(query)
  }
}
