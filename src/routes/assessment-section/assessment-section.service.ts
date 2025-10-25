import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common'
import { AssessmentSectionRepository } from './assessment-section.repo'
import {
  AssessmentSectionBase,
  AssessmentSectionWithItems,
  AssessmentSectionWithAssessment,
  AssessmentSectionBasic,
  CreateAssessmentSectionInput,
  UpdateAssessmentSectionInput,
  AssessmentSectionQuery,
} from './assessment-section.model'
import { AssessmentSection } from '@prisma/client'

@Injectable()
export class AssessmentSectionService {
  constructor(private readonly assessmentSectionRepo: AssessmentSectionRepository) {}

  // ===== Basic CRUD Operations =====
  async createAssessmentSection(data: CreateAssessmentSectionInput): Promise<AssessmentSection> {
    const checkAssessmentId = await this.assessmentSectionRepo.checkIdAssessmentPaper(data.assessmentId)
    if (!checkAssessmentId) {
      throw new NotFoundException(`Assessment with ID ${data.assessmentId} not found`)
    }

    return this.assessmentSectionRepo.create(data)
  }

  async getAssessmentSection(id: number): Promise<AssessmentSection> {
    const section = await this.assessmentSectionRepo.findById(id)
    if (!section) {
      throw new NotFoundException(`Assessment section with ID ${id} not found`)
    }
    return section
  }

  async getAssessmentSectionWithItems(id: number): Promise<AssessmentSectionWithItems> {
    const section = await this.assessmentSectionRepo.findByIdWithItems(id)
    if (!section) {
      throw new NotFoundException(`Assessment section with ID ${id} not found`)
    }
    return section
  }

  async getAssessmentSectionWithAssessment(id: number): Promise<AssessmentSectionWithAssessment> {
    const section = await this.assessmentSectionRepo.findByIdWithAssessment(id)
    if (!section) {
      throw new NotFoundException(`Assessment section with ID ${id} not found`)
    }
    return section
  }

  async updateAssessmentSection(id: number, data: UpdateAssessmentSectionInput): Promise<AssessmentSection> {
    const existingSection = await this.assessmentSectionRepo.findById(id)
    if (!existingSection) {
      throw new NotFoundException(`Assessment section with ID ${id} not found`)
    }

    if (data.title) {
      const titleExists = await this.assessmentSectionRepo.getTitleExistsInAssessment(
        existingSection.assessmentId,
        data.title,
        id,
      )
      if (titleExists) {
        throw new ConflictException(`Section with title "${data.title}" already exists in this assessment`)
      }
    }

    return this.assessmentSectionRepo.update(id, data)
  }

  async deleteAssessmentSection(id: number) {
    const section = await this.assessmentSectionRepo.findById(id)
    if (!section) {
      throw new NotFoundException(`Assessment section with ID ${id} not found`)
    }

    try {
      await this.assessmentSectionRepo.delete(id)
      return { message: 'Assessment section deleted successfully' }
    } catch (error: any) {
      if (error.code === 'P2003') {
        throw new BadRequestException('Cannot delete assessment section because it has associated assessment items')
      }
      throw error
    }
  }

  async getAssessmentSections(query: AssessmentSectionQuery): Promise<{
    data: AssessmentSectionBasic[]
    pagination: {
      total: number
      page: number
      limit: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }> {
    return this.assessmentSectionRepo.findMany(query)
  }

  async getAssessmentSectionsByAssessmentId(assessmentId: number): Promise<AssessmentSectionBasic[]> {
    return this.assessmentSectionRepo.findByAssessmentId(assessmentId)
  }

  async getAssessmentSectionsByAssessmentIdWithItems(assessmentId: number): Promise<AssessmentSectionWithItems[]> {
    return this.assessmentSectionRepo.findByAssessmentIdWithItems(assessmentId)
  }

  async bulkCreateAssessmentSections(
    assessmentId: number,
    sections: Omit<CreateAssessmentSectionInput, 'assessmentId'>[],
  ): Promise<{ created: AssessmentSection[]; failed: Array<{ section: any; error: string }> }> {
    const created: AssessmentSection[] = []
    const failed: Array<{ section: any; error: string }> = []

    for (const section of sections) {
      try {
        const titleExists = await this.assessmentSectionRepo.getTitleExistsInAssessment(assessmentId, section.title)
        if (titleExists) {
          failed.push({
            section,
            error: `Section with title "${section.title}" already exists in this assessment`,
          })
          continue
        }

        const createdSection = await this.assessmentSectionRepo.create({
          ...section,
          assessmentId,
        })
        created.push(createdSection)
      } catch (error: any) {
        failed.push({
          section,
          error: error.message,
        })
      }
    }

    return { created, failed }
  }

  async bulkDeleteAssessmentSections(ids: number[]): Promise<{ deleted: number; failed: number[] }> {
    const existingIds = await this.assessmentSectionRepo.existsByIds(ids)
    const failedIds = ids.filter((id) => !existingIds.includes(id))

    if (existingIds.length === 0) {
      throw new NotFoundException('None of the specified assessment sections were found')
    }

    try {
      const result = await this.assessmentSectionRepo.bulkDelete(existingIds)
      return {
        deleted: result.count,
        failed: failedIds,
      }
    } catch (error: any) {
      if (error.code === 'P2003') {
        throw new BadRequestException(
          'Cannot delete some assessment sections because they have associated assessment items',
        )
      }
      throw error
    }
  }

  async copyAssessmentSection(id: number, targetAssessmentId: number, newTitle?: string): Promise<AssessmentSection> {
    const exists = await this.assessmentSectionRepo.exists(id)
    if (!exists) {
      throw new NotFoundException(`Assessment section with ID ${id} not found`)
    }

    if (newTitle) {
      const titleExists = await this.assessmentSectionRepo.getTitleExistsInAssessment(targetAssessmentId, newTitle)
      if (titleExists) {
        throw new ConflictException(`Section with title "${newTitle}" already exists in target assessment`)
      }
    }

    try {
      return await this.assessmentSectionRepo.copySection(id, targetAssessmentId, newTitle)
    } catch (error: any) {
      if (error.message === 'Section not found') {
        throw new NotFoundException(`Assessment section with ID ${id} not found`)
      }
      throw error
    }
  }

  async moveAssessmentSection(id: number, targetAssessmentId: number): Promise<AssessmentSection> {
    const section = await this.assessmentSectionRepo.findById(id)
    if (!section) {
      throw new NotFoundException(`Assessment section with ID ${id} not found`)
    }

    const titleExists = await this.assessmentSectionRepo.getTitleExistsInAssessment(targetAssessmentId, section.title)
    if (titleExists) {
      throw new ConflictException(`Section with title "${section.title}" already exists in target assessment`)
    }

    return this.assessmentSectionRepo.moveSection(id, targetAssessmentId)
  }

  async getAssessmentSectionStatistics(id: number): Promise<{
    totalItems: number
    itemsByType: Record<string, number>
  }> {
    const exists = await this.assessmentSectionRepo.exists(id)
    if (!exists) {
      throw new NotFoundException(`Assessment section with ID ${id} not found`)
    }

    return this.assessmentSectionRepo.getStatistics(id)
  }

  async validateSectionAccess(id: number, userId: number): Promise<AssessmentSection> {
    const section = await this.getAssessmentSection(id)
    return section
  }

  async getSectionsByType(assessmentId: number, type: string): Promise<AssessmentSectionBasic[]> {
    return this.assessmentSectionRepo
      .findMany({
        assessmentId,
        type: type as any,
        page: 1,
        limit: 1000,
        sortBy: 'id',
        sortOrder: 'asc',
      })
      .then((result) => result.data)
  }

  async duplicateAssessmentSection(id: number, newTitle?: string): Promise<AssessmentSection> {
    const section = await this.assessmentSectionRepo.findById(id)
    if (!section) {
      throw new NotFoundException(`Assessment section with ID ${id} not found`)
    }

    const title = newTitle || `${section.title} (Copy)`

    const titleExists = await this.assessmentSectionRepo.getTitleExistsInAssessment(section.assessmentId, title)
    if (titleExists) {
      throw new ConflictException(`Section with title "${title}" already exists in this assessment`)
    }

    return this.copyAssessmentSection(id, section.assessmentId, title)
  }

  async createSectionsWithItems(
    assessmentId: number,
    sectionsData: Array<{
      title: string
      type: string
      questionIds?: number[]
      questionGroupIds?: number[]
    }>,
  ): Promise<AssessmentSection[]> {
    if (sectionsData.length === 0) {
      throw new BadRequestException('At least one section is required')
    }

    if (sectionsData.length > 10) {
      throw new BadRequestException('Maximum 10 sections can be created at once')
    }

    for (const sectionData of sectionsData) {
      const titleExists = await this.assessmentSectionRepo.getTitleExistsInAssessment(assessmentId, sectionData.title)
      if (titleExists) {
        throw new ConflictException(`Section with title "${sectionData.title}" already exists in this assessment`)
      }
    }

    const createdSections: AssessmentSection[] = []

    for (const sectionData of sectionsData) {
      const sectionInput: CreateAssessmentSectionInput = {
        assessmentId,
        title: sectionData.title,
        type: sectionData.type as any,
      }

      const section = await this.createAssessmentSection(sectionInput)
      createdSections.push(section)

      // TODO: Integrate with AssessmentItemService for full transaction
    }

    return createdSections
  }
}
