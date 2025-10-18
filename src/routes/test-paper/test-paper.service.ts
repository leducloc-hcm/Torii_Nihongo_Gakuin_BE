import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common'
import { TestPaperRepository } from './test-paper.repo'
import {
  TestPaper,
  TestPaperWithRelations,
  TestPaperBasic,
  TestPaperWithSections,
  CreateTestPaperInput,
  UpdateTestPaperInput,
  TestPaperQuery,
  JLPTLevel,
  Visibility,
} from './test-paper.model'

@Injectable()
export class TestPaperService {
  constructor(private readonly testPaperRepo: TestPaperRepository) {}
  async createTestPaper(data: CreateTestPaperInput): Promise<TestPaper> {
    const titleExists = await this.testPaperRepo.getTitleExists(data.title)
    if (titleExists) {
      throw new ConflictException(`Test paper with title "${data.title}" already exists`)
    }

    const isMCPMode = Boolean(data.blueprintId || data.seed || data.generatorVersion)

    const createData: any = {
      title: data.title,
      level: data.level,
      visibility: data.visibility || 'PRIVATE',
    }

    if (isMCPMode) {
      if (!data.blueprintId) {
        throw new BadRequestException('Blueprint ID is required for MCP mode')
      }

      const nextVersion = await this.testPaperRepo.getNextVersion(data.blueprintId)

      createData.blueprintId = data.blueprintId
      createData.version = data.version || nextVersion
      createData.blueprintSnapshot = data.blueprintSnapshot
      createData.seed = data.seed
      createData.generatorVersion = data.generatorVersion
      createData.generatorMeta = data.generatorMeta

      if (data.seed !== undefined) {
        const maxSeed = BigInt('9223372036854775807')
        if (data.seed < 0 || data.seed > maxSeed) {
          throw new BadRequestException('Seed must be between 0 and 9223372036854775807')
        }
      }
    } else {
      createData.version = 1
    }

    return this.testPaperRepo.create(createData)
  }

  async getTestPaper(id: number): Promise<TestPaper> {
    const testPaper = await this.testPaperRepo.findById(id)
    if (!testPaper) {
      throw new NotFoundException(`Test paper with ID ${id} not found`)
    }
    return testPaper
  }

  async getTestPaperWithRelations(id: number): Promise<TestPaperWithRelations> {
    const testPaper = await this.testPaperRepo.findByIdWithRelations(id)
    if (!testPaper) {
      throw new NotFoundException(`Test paper with ID ${id} not found`)
    }
    return testPaper
  }

  async getTestPaperWithSections(id: number): Promise<TestPaperWithSections> {
    const testPaper = await this.testPaperRepo.findByIdWithSections(id)
    if (!testPaper) {
      throw new NotFoundException(`Test paper with ID ${id} not found`)
    }
    return testPaper
  }

  async updateTestPaper(id: number, data: UpdateTestPaperInput): Promise<TestPaper> {
    const existingTestPaper = await this.testPaperRepo.findById(id)
    if (!existingTestPaper) {
      throw new NotFoundException(`Test paper with ID ${id} not found`)
    }

    if (data.title && data.title !== existingTestPaper.title) {
      const titleExists = await this.testPaperRepo.getTitleExists(data.title, id)
      if (titleExists) {
        throw new ConflictException(`Test paper with title "${data.title}" already exists`)
      }
    }

    if (data.seed !== undefined) {
      const maxSeed = BigInt('9223372036854775807')
      if (data.seed < 0 || data.seed > maxSeed) {
        throw new BadRequestException('Seed must be between 0 and 9223372036854775807')
      }
    }

    const updateData: any = {}

    if (data.title !== undefined) updateData.title = data.title
    if (data.level !== undefined) updateData.level = data.level
    if (data.visibility !== undefined) updateData.visibility = data.visibility

    if (data.blueprintId !== undefined) updateData.blueprintId = data.blueprintId
    if (data.blueprintSnapshot !== undefined) updateData.blueprintSnapshot = data.blueprintSnapshot
    if (data.seed !== undefined) updateData.seed = data.seed
    if (data.version !== undefined) updateData.version = data.version
    if (data.generatorVersion !== undefined) updateData.generatorVersion = data.generatorVersion
    if (data.generatorMeta !== undefined) updateData.generatorMeta = data.generatorMeta

    return this.testPaperRepo.update(id, updateData)
  }

  async deleteTestPaper(id: number): Promise<void> {
    const exists = await this.testPaperRepo.exists(id)
    if (!exists) {
      throw new NotFoundException(`Test paper with ID ${id} not found`)
    }

    try {
      await this.testPaperRepo.delete(id)
    } catch (error: any) {
      if (error.code === 'P2003') {
        throw new BadRequestException('Cannot delete test paper because it has associated test attempts')
      }
      throw error
    }
  }

  async getTestPapers(query: TestPaperQuery): Promise<{
    data: TestPaperBasic[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }> {
    return this.testPaperRepo.findMany(query)
  }

  async getTestPapersByBlueprint(blueprintId: number): Promise<TestPaper[]> {
    return this.testPaperRepo.findByBlueprint(blueprintId)
  }

  async getTestPapersByLevel(level: JLPTLevel): Promise<TestPaper[]> {
    return this.testPaperRepo.findByLevel(level)
  }

  async getPublicTests(level?: JLPTLevel): Promise<TestPaper[]> {
    return this.testPaperRepo.findPublicTests(level)
  }

  async bulkDeleteTestPapers(ids: number[]): Promise<{ deleted: number; failed: number[] }> {
    const existingIds = await this.testPaperRepo.existsByIds(ids)
    const failedIds = ids.filter((id) => !existingIds.includes(id))

    if (existingIds.length === 0) {
      throw new NotFoundException('None of the specified test papers were found')
    }

    try {
      const result = await this.testPaperRepo.bulkDelete(existingIds)
      return {
        deleted: result.count,
        failed: failedIds,
      }
    } catch (error: any) {
      if (error.code === 'P2003') {
        throw new BadRequestException('Cannot delete some test papers because they have associated test attempts')
      }
      throw error
    }
  }

  async bulkUpdateVisibility(ids: number[], visibility: Visibility): Promise<{ updated: number; failed: number[] }> {
    const existingIds = await this.testPaperRepo.existsByIds(ids)
    const failedIds = ids.filter((id) => !existingIds.includes(id))

    if (existingIds.length === 0) {
      throw new NotFoundException('None of the specified test papers were found')
    }

    const result = await this.testPaperRepo.bulkUpdateVisibility(existingIds, visibility)
    return {
      updated: result.count,
      failed: failedIds,
    }
  }

  async cloneTestPaper(
    id: number,
    data: {
      title?: string
      level?: JLPTLevel
      visibility?: Visibility
      includeAttempts?: boolean
    },
  ): Promise<TestPaper> {
    const exists = await this.testPaperRepo.exists(id)
    if (!exists) {
      throw new NotFoundException(`Test paper with ID ${id} not found`)
    }

    if (data.title) {
      const titleExists = await this.testPaperRepo.getTitleExists(data.title)
      if (titleExists) {
        throw new ConflictException(`Test paper with title "${data.title}" already exists`)
      }
    }

    try {
      return await this.testPaperRepo.clone(id, data)
    } catch (error: any) {
      if (error.message === 'Test paper not found') {
        throw new NotFoundException(`Test paper with ID ${id} not found`)
      }
      throw error
    }
  }

  async getTestPaperStatistics(id: number): Promise<{
    totalAttempts: number
    completedAttempts: number
    averageScore: number
    highestScore: number
    lowestScore: number
    averageCompletionTime: number
  }> {
    const exists = await this.testPaperRepo.exists(id)
    if (!exists) {
      throw new NotFoundException(`Test paper with ID ${id} not found`)
    }

    return this.testPaperRepo.getStatistics(id)
  }

  async searchTestPapers(searchTerm: string, limit: number = 20): Promise<TestPaper[]> {
    if (!searchTerm || searchTerm.trim().length === 0) {
      throw new BadRequestException('Search term cannot be empty')
    }

    if (searchTerm.length < 2) {
      throw new BadRequestException('Search term must be at least 2 characters long')
    }

    return this.testPaperRepo.searchByContent(searchTerm.trim(), limit)
  }

  async validateTestPaperAccess(id: number, userId: number, requiredRole?: string): Promise<TestPaper> {
    const testPaper = await this.getTestPaper(id)

    if (testPaper.visibility === 'PRIVATE' && !requiredRole) {
      throw new BadRequestException('This test paper is not publicly accessible')
    }

    return testPaper
  }

  async generateFromBlueprint(
    blueprintId: number,
    options: {
      title?: string
      seed?: bigint
      generatorVersion?: string
      generatorMeta?: any
    } = {},
  ): Promise<TestPaper> {
    const baseTitle = options.title || `Generated Test - ${new Date().toISOString()}`

    const testPaperData: CreateTestPaperInput = {
      title: baseTitle,
      level: 'N3', // Default, should come from blueprint
      visibility: 'PRIVATE',
      blueprintId,
      seed: options.seed || BigInt(Math.floor(Math.random() * 1000000)),
      version: 1,
      generatorVersion: options.generatorVersion || '1.0.0',
      generatorMeta: options.generatorMeta || {
        model: 'placeholder',
        timestamp: new Date(),
      },
    }

    return this.createTestPaper(testPaperData)
  }

  async createNewVersion(id: number, changes: UpdateTestPaperInput = {}): Promise<TestPaper> {
    const original = await this.getTestPaper(id)

    if (!original.blueprintId) {
      throw new BadRequestException('Cannot create new version: test paper is not associated with a blueprint')
    }

    const nextVersion = await this.testPaperRepo.getNextVersion(original.blueprintId)

    const cloneData = {
      title: changes.title || `${original.title} (v${nextVersion})`,
      level: changes.level || original.level,
      visibility: changes.visibility || 'PRIVATE',
      includeAttempts: false,
    }

    const cloned = await this.cloneTestPaper(id, cloneData)

    return this.testPaperRepo.update(cloned.id, {
      version: nextVersion,
      generatorVersion: changes.generatorVersion || original.generatorVersion || undefined,
      generatorMeta: changes.generatorMeta || original.generatorMeta || undefined,
    })
  }

  async validateTestContent(id: number): Promise<{
    isValid: boolean
    errors: string[]
    warnings: string[]
  }> {
    const testPaper = await this.getTestPaperWithSections(id)

    const errors: string[] = []
    const warnings: string[] = []

    if (!testPaper.sections || testPaper.sections.length === 0) {
      errors.push('Test paper must have at least one section')
    }

    for (const section of testPaper.sections) {
      if (!section.items || section.items.length === 0) {
        errors.push(`Section "${section.title}" has no questions`)
      }

      for (const item of section.items) {
        if (!item.question.option || item.question.option.length === 0) {
          warnings.push(`Question "${item.question.stem}" has no options`)
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }
}
