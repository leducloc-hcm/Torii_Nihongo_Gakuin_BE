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
    if (data.order === undefined) {
      data.order = await this.assessmentSectionRepo.getNextOrderForAssessment(data.assessmentId)
    } else {
      await this.assessmentSectionRepo.insertAtOrder(data.assessmentId, data.order)
    }

    const checkAssessmentId = await this.assessmentSectionRepo.checkIdAssessmentPaper(data.assessmentId)
    if (!checkAssessmentId) {
      throw new NotFoundException(`Assessment with ID ${data.assessmentId} not found`)
    }

    if (data.totalScore === undefined) {
      // For now, we'll calculate it later when items are added
      // The totalScore will be updated when assessment items are created
      data.totalScore = 0
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
    // Check if section exists
    const existingSection = await this.assessmentSectionRepo.findById(id)
    if (!existingSection) {
      throw new NotFoundException(`Assessment section with ID ${id} not found`)
    }

    // Validate title uniqueness if title is being updated
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

    // Handle order updates
    if (data.order !== undefined && data.order !== existingSection.order) {
      // Remove section from current position
      await this.assessmentSectionRepo.updateOrdersAfterDelete(existingSection.assessmentId, existingSection.order)

      // Insert at new position
      await this.assessmentSectionRepo.insertAtOrder(existingSection.assessmentId, data.order)
    }

    return this.assessmentSectionRepo.update(id, data)
  }

  async deleteAssessmentSection(id: number): Promise<void> {
    const section = await this.assessmentSectionRepo.findById(id)
    if (!section) {
      throw new NotFoundException(`Assessment section with ID ${id} not found`)
    }

    try {
      await this.assessmentSectionRepo.delete(id)
      await this.assessmentSectionRepo.updateOrdersAfterDelete(section.assessmentId, section.order)
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

        if (section.order === undefined) {
          section.order = await this.assessmentSectionRepo.getNextOrderForAssessment(assessmentId)
        }
      } catch (error: any) {
        failed.push({
          section,
          error: error.message,
        })
      }
    }

    const validSections = sections.filter((section) => !failed.some((f) => f.section === section))

    if (validSections.length > 0) {
      try {
        const createdSections = await this.assessmentSectionRepo.bulkCreate(assessmentId, validSections)
        created.push(...createdSections)
      } catch (error: any) {
        for (const section of validSections) {
          try {
            const createdSection = await this.assessmentSectionRepo.create({
              ...section,
              assessmentId,
            })
            created.push(createdSection)
          } catch (individualError: any) {
            failed.push({
              section,
              error: individualError.message,
            })
          }
        }
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

  async reorderAssessmentSections(
    updates: Array<{ id: number; order: number }>,
  ): Promise<{ updated: number; failed: Array<{ id: number; error: string }> }> {
    const failed: Array<{ id: number; error: string }> = []
    let updated = 0

    for (const update of updates) {
      const exists = await this.assessmentSectionRepo.exists(update.id)
      if (!exists) {
        failed.push({
          id: update.id,
          error: `Section with ID ${update.id} not found`,
        })
      }
    }

    const validUpdates = updates.filter((update) => !failed.some((f) => f.id === update.id))

    if (validUpdates.length > 0) {
      try {
        await this.assessmentSectionRepo.reorderSections(validUpdates)
        updated = validUpdates.length
      } catch (error: any) {
        for (const update of validUpdates) {
          try {
            await this.assessmentSectionRepo.update(update.id, { order: update.order })
            updated++
          } catch (individualError: any) {
            failed.push({
              id: update.id,
              error: individualError.message,
            })
          }
        }
      }
    }

    return { updated, failed }
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

    await this.assessmentSectionRepo.updateOrdersAfterDelete(section.assessmentId, section.order)

    return this.assessmentSectionRepo.moveSection(id, targetAssessmentId)
  }

  async getAssessmentSectionStatistics(id: number): Promise<{
    totalItems: number
    itemsByType: Record<string, number>
    totalScore: number
    scorePerQuestion: number
  }> {
    const exists = await this.assessmentSectionRepo.exists(id)
    if (!exists) {
      throw new NotFoundException(`Assessment section with ID ${id} not found`)
    }

    return this.assessmentSectionRepo.getStatistics(id)
  }

  async validateSectionOrder(assessmentId: number, order: number, excludeId?: number): Promise<boolean> {
    const sections = await this.assessmentSectionRepo.findByAssessmentId(assessmentId)
    const existingSection = sections.find((s) => s.order === order && (!excludeId || s.id !== excludeId))
    return !existingSection
  }

  async validateSectionAccess(id: number, userId: number): Promise<AssessmentSection> {
    const section = await this.getAssessmentSection(id)
    return section
  }

  async getMaxOrderForAssessment(assessmentId: number): Promise<number> {
    const sections = await this.assessmentSectionRepo.findByAssessmentId(assessmentId)
    return sections.length > 0 ? Math.max(...sections.map((s) => s.order)) : -1
  }

  async getSectionsByType(assessmentId: number, type: string): Promise<AssessmentSectionBasic[]> {
    return this.assessmentSectionRepo
      .findMany({
        assessmentId,
        type: type as any,
        page: 1,
        limit: 1000,
        sortBy: 'order',
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

  // ===== New Scoring Methods =====
  async updateSectionTotalScore(sectionId: number): Promise<AssessmentSection> {
    const section = (await this.getAssessmentSection(sectionId)) as any
    const itemCount = await this.getItemCountForSection(sectionId)

    const newTotalScore = itemCount * (section.scorePerQuestion || 1.0)

    return this.assessmentSectionRepo.update(sectionId, { totalScore: newTotalScore })
  }

  async updateSectionScoring(
    sectionId: number,
    scorePerQuestion?: number,
    totalScore?: number,
  ): Promise<AssessmentSection> {
    const updateData: UpdateAssessmentSectionInput = {}

    if (scorePerQuestion !== undefined) {
      updateData.scorePerQuestion = scorePerQuestion
    }

    if (totalScore !== undefined) {
      updateData.totalScore = totalScore
    } else if (scorePerQuestion !== undefined) {
      // Auto-calculate totalScore if scorePerQuestion is updated but totalScore is not provided
      const itemCount = await this.getItemCountForSection(sectionId)
      updateData.totalScore = itemCount * scorePerQuestion
    }

    return this.updateAssessmentSection(sectionId, updateData)
  }

  private async getItemCountForSection(sectionId: number): Promise<number> {
    // Use the repository method for counting items
    return this.assessmentSectionRepo.getItemCountForSection(sectionId)
  }

  async createSectionsWithItems(
    assessmentId: number,
    sectionsData: Array<{
      title: string
      type: string
      order?: number
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

    // Validate unique question IDs and question group IDs
    const allQuestionIds = [...new Set(sectionsData.flatMap((s) => s.questionIds || []))]
    const allQuestionGroupIds = [...new Set(sectionsData.flatMap((s) => s.questionGroupIds || []))]

    for (const sectionData of sectionsData) {
      const titleExists = await this.assessmentSectionRepo.getTitleExistsInAssessment(assessmentId, sectionData.title)
      if (titleExists) {
        throw new ConflictException(`Section with title "${sectionData.title}" already exists in this assessment`)
      }
    }

    const createdSections: AssessmentSection[] = []

    for (const sectionData of sectionsData) {
      const totalQuestions = (sectionData.questionIds?.length || 0) + (sectionData.questionGroupIds?.length || 0)

      const sectionInput: CreateAssessmentSectionInput = {
        assessmentId,
        title: sectionData.title,
        type: sectionData.type as any,
        order: sectionData.order ?? (await this.assessmentSectionRepo.getNextOrderForAssessment(assessmentId)),
        scorePerQuestion: 1.0,
        totalScore: totalQuestions * 1.0,
      }

      const section = await this.createAssessmentSection(sectionInput)
      createdSections.push(section)

      if (totalQuestions > 0) {
        // This would need the AssessmentItemService to be injected
        // For now, we'll just store the section and let the caller handle items
        // TODO: Integrate with AssessmentItemService for full transaction
      }
    }

    return createdSections
  }

  // ===== Assessment-specific methods =====
  async getSectionsByAssessmentIdAndType(assessmentId: number, type: string): Promise<AssessmentSectionBasic[]> {
    return this.assessmentSectionRepo.findByAssessmentIdAndType(assessmentId, type as any)
  }

  async calculateAssessmentSectionScore(sectionId: number): Promise<{ totalScore: number; itemCount: number }> {
    const statistics = await this.getAssessmentSectionStatistics(sectionId)
    return {
      totalScore: statistics.totalScore,
      itemCount: statistics.totalItems,
    }
  }

  async bulkUpdateSectionScoring(
    sectionIds: number[],
    scorePerQuestion: number,
  ): Promise<{ updated: number; failed: Array<{ id: number; error: string }> }> {
    const failed: Array<{ id: number; error: string }> = []
    let updated = 0

    for (const sectionId of sectionIds) {
      try {
        await this.updateSectionScoring(sectionId, scorePerQuestion)
        updated++
      } catch (error: any) {
        failed.push({
          id: sectionId,
          error: error.message,
        })
      }
    }

    return { updated, failed }
  }
}
