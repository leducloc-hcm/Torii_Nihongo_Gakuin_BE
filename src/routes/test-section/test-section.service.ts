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
      // Reorder remaining sections
      await this.testSectionRepo.updateOrdersAfterDelete(section.testId, section.order)
    } catch (error: any) {
      if (error.code === 'P2003') {
        throw new BadRequestException('Cannot delete test section because it has associated test items')
      }
      throw error
    }
  }

  // ===== Query Operations =====
  async getTestSections(query: TestSectionQuery): Promise<{
    data: TestSectionBasic[]
    total: number
    page: number
    limit: number
    totalPages: number
  }> {
    return this.testSectionRepo.findMany(query)
  }

  // ===== Test-specific Operations =====
  async getTestSectionsByTestId(testId: number): Promise<TestSectionBasic[]> {
    return this.testSectionRepo.findByTestId(testId)
  }

  async getTestSectionsByTestIdWithItems(testId: number): Promise<TestSectionWithItems[]> {
    return this.testSectionRepo.findByTestIdWithItems(testId)
  }

  // ===== Bulk Operations =====
  async bulkCreateTestSections(
    testId: number,
    sections: Omit<CreateTestSectionInput, 'testId'>[],
  ): Promise<{ created: TestSection[]; failed: Array<{ section: any; error: string }> }> {
    const created: TestSection[] = []
    const failed: Array<{ section: any; error: string }> = []

    // Validate all sections first
    for (const section of sections) {
      try {
        // Check title uniqueness
        const titleExists = await this.testSectionRepo.getTitleExistsInTest(testId, section.title)
        if (titleExists) {
          failed.push({
            section,
            error: `Section with title "${section.title}" already exists in this test`,
          })
          continue
        }

        // Set order if not provided
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

    // Create valid sections
    const validSections = sections.filter((section) => !failed.some((f) => f.section === section))

    if (validSections.length > 0) {
      try {
        const createdSections = await this.testSectionRepo.bulkCreate(testId, validSections)
        created.push(...createdSections)
      } catch (error: any) {
        // If bulk creation fails, try individual creation
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
    // Check which IDs exist
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

    // Validate all sections exist
    for (const update of updates) {
      const exists = await this.testSectionRepo.exists(update.id)
      if (!exists) {
        failed.push({
          id: update.id,
          error: `Section with ID ${update.id} not found`,
        })
      }
    }

    // Filter valid updates
    const validUpdates = updates.filter((update) => !failed.some((f) => f.id === update.id))

    if (validUpdates.length > 0) {
      try {
        await this.testSectionRepo.reorderSections(validUpdates)
        updated = validUpdates.length
      } catch (error: any) {
        // If bulk update fails, try individual updates
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

  // ===== Copy Operations =====
  async copyTestSection(id: number, targetTestId: number, newTitle?: string): Promise<TestSection> {
    const exists = await this.testSectionRepo.exists(id)
    if (!exists) {
      throw new NotFoundException(`Test section with ID ${id} not found`)
    }

    // Validate title uniqueness if provided
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

  // ===== Move Operations =====
  async moveTestSection(id: number, targetTestId: number): Promise<TestSection> {
    const section = await this.testSectionRepo.findById(id)
    if (!section) {
      throw new NotFoundException(`Test section with ID ${id} not found`)
    }

    // Check if title already exists in target test
    const titleExists = await this.testSectionRepo.getTitleExistsInTest(targetTestId, section.title)
    if (titleExists) {
      throw new ConflictException(`Section with title "${section.title}" already exists in target test`)
    }

    // Remove from original position
    await this.testSectionRepo.updateOrdersAfterDelete(section.testId, section.order)

    return this.testSectionRepo.moveSection(id, targetTestId)
  }

  // ===== Statistics =====
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

  // ===== Validation Methods =====
  async validateSectionOrder(testId: number, order: number, excludeId?: number): Promise<boolean> {
    const sections = await this.testSectionRepo.findByTestId(testId)
    const existingSection = sections.find((s) => s.order === order && (!excludeId || s.id !== excludeId))
    return !existingSection
  }

  async validateSectionAccess(id: number, userId: number): Promise<TestSection> {
    // This method can be extended with proper access control logic
    const section = await this.getTestSection(id)
    return section
  }

  // ===== Helper Methods =====
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

    // Check title uniqueness
    const titleExists = await this.testSectionRepo.getTitleExistsInTest(section.testId, title)
    if (titleExists) {
      throw new ConflictException(`Section with title "${title}" already exists in this test`)
    }

    return this.copyTestSection(id, section.testId, title)
  }
}
