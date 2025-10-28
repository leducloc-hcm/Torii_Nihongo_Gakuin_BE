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

    // Check if anyone has attempted this assessment
    const hasAttempts = await this.assessmentPaperRepo.hasAttempts(id)
    if (hasAttempts) {
      throw new BadRequestException(
        'Cannot update assessment paper that has been attempted. Please clone it to create a new version.',
      )
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

    const hasAttempts = await this.assessmentPaperRepo.hasAttempts(id)
    if (hasAttempts) {
      throw new BadRequestException('Cannot delete assessment paper that has been attempted.')
    }

    await this.assessmentPaperRepo.delete(id)
    return { message: 'Assessment paper deleted successfully' }
  }

  async cloneAssessmentPaper(id: number, newTitle?: string): Promise<AssessmentPaperBase> {
    const original = await this.assessmentPaperRepo.findByIdWithRelations(id)
    if (!original) {
      throw new NotFoundException(`Assessment paper with ID ${id} not found`)
    }

    // Generate new title if not provided
    const title = newTitle || `${original.title} (Copy v${original.version + 1})`

    // Check title uniqueness
    const titleExists = await this.assessmentPaperRepo.getTitleExists(title)
    if (titleExists) {
      throw new ConflictException(`Assessment paper with title "${title}" already exists`)
    }

    return this.assessmentPaperRepo.clone(id, title, original.version + 1)
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

  async getAssessmentPaperByAttempt(attemptId: number) {
    return await this.assessmentPaperRepo.getAssessmentPaperByAttempt(attemptId)
  }

  async getAttemptedAssessments(params: {
    userId: number
    type?: 'TEST' | 'EXAM'
    level?: 'N5' | 'N4' | 'N3' | 'N2' | 'N1'
    page: number
    limit: number
  }) {
    return await this.assessmentPaperRepo.getAttemptedAssessments(params)
  }

  async getRecentAttempts(assessmentId: number, userId: number) {
    return await this.assessmentPaperRepo.getRecentAttempts(assessmentId, userId)
  }

  async getAssessmentPaperByUserAttempt(userId: number, attemptId: number) {
    return await this.assessmentPaperRepo.getAssessmentPaperByUserAttempt(userId, attemptId)
  }

  async getAssessmentLeaderboard(assessmentId: number) {
    return await this.assessmentPaperRepo.getAssessmentLeaderboard(assessmentId)
  }
}
