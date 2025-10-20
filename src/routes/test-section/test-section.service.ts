import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common'
import { TestSectionRepository } from './test-section.repo'
import {
  TestSection,
  TestSectionWithItems,
  TestSectionWithTest,
  TestSectionBasic,
  CreateTestSectionInput,
  UpdateTestSectionInput,
  TestSectionQuery,
} from './test-section.model'

@Injectable()
export class TestSectionService {
  constructor(private readonly testSectionRepo: TestSectionRepository) {}

  // ===== Basic CRUD Operations =====
  async createTestSection(data: CreateTestSectionInput): Promise<TestSection> {
    // Validate title uniqueness within the test
    const titleExists = await this.testSectionRepo.getTitleExistsInTest(data.testId, data.title)
    if (titleExists) {
      throw new ConflictException(`Section with title "${data.title}" already exists in this test`)
    }

    // Set order if not provided
    if (data.order === undefined) {
      data.order = await this.testSectionRepo.getNextOrderForTest(data.testId)
    } else {
      // If order is provided, shift existing sections
      await this.testSectionRepo.insertAtOrder(data.testId, data.order)
    }

    // Calculate totalScore if not provided
    if (data.totalScore === undefined) {
      // For now, we'll calculate it later when items are added
      // The totalScore will be updated when test items are created
      data.totalScore = 0
    }

    return this.testSectionRepo.create(data)
  }

  async getTestSection(id: number): Promise<TestSection> {
    const section = await this.testSectionRepo.findById(id)
    if (!section) {
      throw new NotFoundException(`Test section with ID ${id} not found`)
    }
    return section
  }

  async getTestSectionWithItems(id: number): Promise<TestSectionWithItems> {
    const section = await this.testSectionRepo.findByIdWithItems(id)
    if (!section) {
      throw new NotFoundException(`Test section with ID ${id} not found`)
    }
    return section
  }

  async getTestSectionWithTest(id: number): Promise<TestSectionWithTest> {
    const section = await this.testSectionRepo.findByIdWithTest(id)
    if (!section) {
      throw new NotFoundException(`Test section with ID ${id} not found`)
    }
    return section
  }

  async updateTestSection(id: number, data: UpdateTestSectionInput): Promise<TestSection> {
    // Check if section exists
    const existingSection = await this.testSectionRepo.findById(id)
    if (!existingSection) {
      throw new NotFoundException(`Test section with ID ${id} not found`)
    }

    // Validate title uniqueness if title is being updated
    if (data.title) {
      const titleExists = await this.testSectionRepo.getTitleExistsInTest(existingSection.testId, data.title, id)
      if (titleExists) {
        throw new ConflictException(`Section with title "${data.title}" already exists in this test`)
      }
    }

    // Handle order updates
    if (data.order !== undefined && data.order !== existingSection.order) {
      // Remove section from current position
      await this.testSectionRepo.updateOrdersAfterDelete(existingSection.testId, existingSection.order)

      // Insert at new position
      await this.testSectionRepo.insertAtOrder(existingSection.testId, data.order)
    }

    return this.testSectionRepo.update(id, data)
  }

  async deleteTestSection(id: number): Promise<void> {
    const section = await this.testSectionRepo.findById(id)
    if (!section) {
      throw new NotFoundException(`Test section with ID ${id} not found`)
    }

    try {
      await this.testSectionRepo.delete(id)
      await this.testSectionRepo.updateOrdersAfterDelete(section.testId, section.order)
    } catch (error: any) {
      if (error.code === 'P2003') {
        throw new BadRequestException('Cannot delete test section because it has associated test items')
      }
      throw error
    }
  }

  async getTestSections(query: TestSectionQuery): Promise<{
    data: TestSectionBasic[]
    pagination: {
      total: number
      page: number
      limit: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }> {
    return this.testSectionRepo.findMany(query)
  }

  async getTestSectionsByTestId(testId: number): Promise<TestSectionBasic[]> {
    return this.testSectionRepo.findByTestId(testId)
  }

  async getTestSectionsByTestIdWithItems(testId: number): Promise<TestSectionWithItems[]> {
    return this.testSectionRepo.findByTestIdWithItems(testId)
  }

  async bulkCreateTestSections(
    testId: number,
    sections: Omit<CreateTestSectionInput, 'testId'>[],
  ): Promise<{ created: TestSection[]; failed: Array<{ section: any; error: string }> }> {
    const created: TestSection[] = []
    const failed: Array<{ section: any; error: string }> = []

    for (const section of sections) {
      try {
        const titleExists = await this.testSectionRepo.getTitleExistsInTest(testId, section.title)
        if (titleExists) {
          failed.push({
            section,
            error: `Section with title "${section.title}" already exists in this test`,
          })
          continue
        }

        if (section.order === undefined) {
          section.order = await this.testSectionRepo.getNextOrderForTest(testId)
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
        const createdSections = await this.testSectionRepo.bulkCreate(testId, validSections)
        created.push(...createdSections)
      } catch (error: any) {
        for (const section of validSections) {
          try {
            const createdSection = await this.testSectionRepo.create({
              ...section,
              testId,
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

  async bulkDeleteTestSections(ids: number[]): Promise<{ deleted: number; failed: number[] }> {
    const existingIds = await this.testSectionRepo.existsByIds(ids)
    const failedIds = ids.filter((id) => !existingIds.includes(id))

    if (existingIds.length === 0) {
      throw new NotFoundException('None of the specified test sections were found')
    }

    try {
      const result = await this.testSectionRepo.bulkDelete(existingIds)
      return {
        deleted: result.count,
        failed: failedIds,
      }
    } catch (error: any) {
      if (error.code === 'P2003') {
        throw new BadRequestException('Cannot delete some test sections because they have associated test items')
      }
      throw error
    }
  }

  async reorderTestSections(
    updates: Array<{ id: number; order: number }>,
  ): Promise<{ updated: number; failed: Array<{ id: number; error: string }> }> {
    const failed: Array<{ id: number; error: string }> = []
    let updated = 0

    for (const update of updates) {
      const exists = await this.testSectionRepo.exists(update.id)
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
        await this.testSectionRepo.reorderSections(validUpdates)
        updated = validUpdates.length
      } catch (error: any) {
        for (const update of validUpdates) {
          try {
            await this.testSectionRepo.update(update.id, { order: update.order })
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

  async copyTestSection(id: number, targetTestId: number, newTitle?: string): Promise<TestSection> {
    const exists = await this.testSectionRepo.exists(id)
    if (!exists) {
      throw new NotFoundException(`Test section with ID ${id} not found`)
    }

    if (newTitle) {
      const titleExists = await this.testSectionRepo.getTitleExistsInTest(targetTestId, newTitle)
      if (titleExists) {
        throw new ConflictException(`Section with title "${newTitle}" already exists in target test`)
      }
    }

    try {
      return await this.testSectionRepo.copySection(id, targetTestId, newTitle)
    } catch (error: any) {
      if (error.message === 'Section not found') {
        throw new NotFoundException(`Test section with ID ${id} not found`)
      }
      throw error
    }
  }

  async moveTestSection(id: number, targetTestId: number): Promise<TestSection> {
    const section = await this.testSectionRepo.findById(id)
    if (!section) {
      throw new NotFoundException(`Test section with ID ${id} not found`)
    }

    const titleExists = await this.testSectionRepo.getTitleExistsInTest(targetTestId, section.title)
    if (titleExists) {
      throw new ConflictException(`Section with title "${section.title}" already exists in target test`)
    }

    await this.testSectionRepo.updateOrdersAfterDelete(section.testId, section.order)

    return this.testSectionRepo.moveSection(id, targetTestId)
  }

  async getTestSectionStatistics(id: number): Promise<{
    totalItems: number
    itemsByType: Record<string, number>
    avgItemsPerSection: number
  }> {
    const exists = await this.testSectionRepo.exists(id)
    if (!exists) {
      throw new NotFoundException(`Test section with ID ${id} not found`)
    }

    return this.testSectionRepo.getStatistics(id)
  }

  async validateSectionOrder(testId: number, order: number, excludeId?: number): Promise<boolean> {
    const sections = await this.testSectionRepo.findByTestId(testId)
    const existingSection = sections.find((s) => s.order === order && (!excludeId || s.id !== excludeId))
    return !existingSection
  }

  async validateSectionAccess(id: number, userId: number): Promise<TestSection> {
    const section = await this.getTestSection(id)
    return section
  }

  async getMaxOrderForTest(testId: number): Promise<number> {
    const sections = await this.testSectionRepo.findByTestId(testId)
    return sections.length > 0 ? Math.max(...sections.map((s) => s.order)) : -1
  }

  async getSectionsByType(testId: number, type: string): Promise<TestSectionBasic[]> {
    return this.testSectionRepo
      .findMany({
        testId,
        type: type as any,
        page: 1,
        limit: 1000,
        sortBy: 'order',
        sortOrder: 'asc',
      })
      .then((result) => result.data)
  }

  async duplicateTestSection(id: number, newTitle?: string): Promise<TestSection> {
    const section = await this.testSectionRepo.findById(id)
    if (!section) {
      throw new NotFoundException(`Test section with ID ${id} not found`)
    }

    const title = newTitle || `${section.title} (Copy)`

    const titleExists = await this.testSectionRepo.getTitleExistsInTest(section.testId, title)
    if (titleExists) {
      throw new ConflictException(`Section with title "${title}" already exists in this test`)
    }

    return this.copyTestSection(id, section.testId, title)
  }

  // ===== New Scoring Methods =====
  async updateSectionTotalScore(sectionId: number): Promise<TestSection> {
    const section = (await this.getTestSection(sectionId)) as any
    const itemCount = await this.getItemCountForSection(sectionId)

    const newTotalScore = itemCount * (section.scorePerQuestion || 1.0)

    return this.testSectionRepo.update(sectionId, { totalScore: newTotalScore })
  }

  async updateSectionScoring(sectionId: number, scorePerQuestion?: number, totalScore?: number): Promise<TestSection> {
    const updateData: UpdateTestSectionInput = {}

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

    return this.updateTestSection(sectionId, updateData)
  }

  private async getItemCountForSection(sectionId: number): Promise<number> {
    // This would need to call TestItemRepository to count items
    // For now, return 0 as placeholder
    return Promise.resolve(0)
  }

  async createSectionsWithItems(
    testId: number,
    sectionsData: Array<{
      title: string
      type: string
      order?: number
      questionIds: number[]
    }>,
  ): Promise<TestSection[]> {
    if (sectionsData.length === 0) {
      throw new BadRequestException('At least one section is required')
    }

    if (sectionsData.length > 10) {
      throw new BadRequestException('Maximum 10 sections can be created at once')
    }
    const allQuestionIds = [...new Set(sectionsData.flatMap((s) => s.questionIds))]

    for (const sectionData of sectionsData) {
      const titleExists = await this.testSectionRepo.getTitleExistsInTest(testId, sectionData.title)
      if (titleExists) {
        throw new ConflictException(`Section with title "${sectionData.title}" already exists in this test`)
      }
    }

    const createdSections: TestSection[] = []

    for (const sectionData of sectionsData) {
      const sectionInput: CreateTestSectionInput = {
        testId,
        title: sectionData.title,
        type: sectionData.type as any,
        order: sectionData.order ?? (await this.testSectionRepo.getNextOrderForTest(testId)),
        scorePerQuestion: 1.0,
        totalScore: sectionData.questionIds.length * 1.0,
      }

      const section = await this.createTestSection(sectionInput)
      createdSections.push(section)

      if (sectionData.questionIds.length > 0) {
        // This would need the TestItemService to be injected
        // For now, we'll just store the section and let the caller handle items
        // TODO: Integrate with TestItemService for full transaction
      }
    }

    return createdSections
  }
}
