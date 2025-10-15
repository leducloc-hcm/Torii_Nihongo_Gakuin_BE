// ===== TestItem Service =====
// Business logic for TestItem operations
// Handles validation, authorization, and complex operations

import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common'
import { TestItemRepository } from './test-item.repo'
import {
  TestItem,
  TestItemWithDetails,
  CreateTestItemInput,
  UpdateTestItemInput,
  TestItemQueryInput,
  ReorderTestItemsInput,
  BulkCreateTestItemsInput,
  BulkDeleteTestItemsInput,
  CopyTestItemsInput,
  MoveTestItemsInput,
  TEST_ITEM_ERRORS,
  TEST_ITEM_CONSTRAINTS,
} from './test-item.model'

export interface PaginatedTestItems {
  items: TestItemWithDetails[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface TestItemStats {
  totalItems: number
  itemsByType: Record<string, number>
  avgDifficulty?: number
  estimatedDurationMinutes?: number
}

@Injectable()
export class TestItemService {
  constructor(private readonly testItemRepo: TestItemRepository) {}

  // ===== Basic CRUD Operations =====

  async create(data: CreateTestItemInput): Promise<TestItem> {
    // Validate section exists
    if (!(await this.testItemRepo.sectionExists(data.sectionId))) {
      throw new NotFoundException(TEST_ITEM_ERRORS.SECTION_NOT_FOUND)
    }

    // Validate question exists
    if (!(await this.testItemRepo.questionExists(data.questionId))) {
      throw new NotFoundException(TEST_ITEM_ERRORS.QUESTION_NOT_FOUND)
    }

    // Check for duplicate question in section
    if (await this.testItemRepo.isQuestionInSection(data.questionId, data.sectionId)) {
      throw new ConflictException(TEST_ITEM_ERRORS.DUPLICATE_QUESTION)
    }

    // Validate order
    if (data.order !== undefined && (data.order < 0 || data.order > TEST_ITEM_CONSTRAINTS.MAX_ORDER)) {
      throw new BadRequestException(TEST_ITEM_ERRORS.INVALID_ORDER)
    }

    return this.testItemRepo.create(data)
  }

  async findById(
    id: number,
    includeRelations?: { question?: boolean; section?: boolean },
  ): Promise<TestItemWithDetails> {
    const item = await this.testItemRepo.findById(id, includeRelations)
    if (!item) {
      throw new NotFoundException(TEST_ITEM_ERRORS.NOT_FOUND)
    }
    return item
  }

  async findMany(query: TestItemQueryInput): Promise<PaginatedTestItems> {
    // Validate pagination parameters
    const { page = 1, limit = 20 } = query

    if (page < 1) {
      throw new BadRequestException('Page must be greater than 0')
    }

    if (limit < 1 || limit > 100) {
      throw new BadRequestException('Limit must be between 1 and 100')
    }

    const result = await this.testItemRepo.findMany(query)

    return {
      items: result.items,
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
    }
  }

  async update(id: number, data: UpdateTestItemInput): Promise<TestItem> {
    // Check if item exists
    if (!(await this.testItemRepo.exists(id))) {
      throw new NotFoundException(TEST_ITEM_ERRORS.NOT_FOUND)
    }

    // If updating question, validate it exists and check for duplicates
    if (data.questionId) {
      if (!(await this.testItemRepo.questionExists(data.questionId))) {
        throw new NotFoundException(TEST_ITEM_ERRORS.QUESTION_NOT_FOUND)
      }

      // Get current item to check section
      const currentItem = await this.testItemRepo.findById(id)
      if (currentItem && (await this.testItemRepo.isQuestionInSection(data.questionId, currentItem.sectionId))) {
        throw new ConflictException(TEST_ITEM_ERRORS.DUPLICATE_QUESTION)
      }
    }

    // Validate order
    if (data.order !== undefined && (data.order < 0 || data.order > TEST_ITEM_CONSTRAINTS.MAX_ORDER)) {
      throw new BadRequestException(TEST_ITEM_ERRORS.INVALID_ORDER)
    }

    return this.testItemRepo.update(id, data)
  }

  async delete(id: number): Promise<TestItem> {
    if (!(await this.testItemRepo.exists(id))) {
      throw new NotFoundException(TEST_ITEM_ERRORS.NOT_FOUND)
    }

    return this.testItemRepo.delete(id)
  }

  // ===== Bulk Operations =====

  async bulkCreate(data: BulkCreateTestItemsInput): Promise<TestItem[]> {
    const { items } = data

    if (items.length === 0) {
      throw new BadRequestException('At least one item is required')
    }

    if (items.length > TEST_ITEM_CONSTRAINTS.MAX_BULK_CREATE) {
      throw new BadRequestException(TEST_ITEM_ERRORS.BULK_LIMIT_EXCEEDED)
    }

    // Validate all sections exist
    const sectionIds = [...new Set(items.map((item) => item.sectionId))]
    for (const sectionId of sectionIds) {
      if (!(await this.testItemRepo.sectionExists(sectionId))) {
        throw new NotFoundException(`Section ${sectionId} not found`)
      }
    }

    // Validate all questions exist
    const questionIds = [...new Set(items.map((item) => item.questionId))]
    for (const questionId of questionIds) {
      if (!(await this.testItemRepo.questionExists(questionId))) {
        throw new NotFoundException(`Question ${questionId} not found`)
      }
    }

    // Check for duplicate questions within same sections
    const sectionQuestions = new Map<number, Set<number>>()
    for (const item of items) {
      if (!sectionQuestions.has(item.sectionId)) {
        sectionQuestions.set(item.sectionId, new Set())
      }

      const questions = sectionQuestions.get(item.sectionId)!
      if (questions.has(item.questionId)) {
        throw new ConflictException(`Duplicate question ${item.questionId} in section ${item.sectionId}`)
      }
      questions.add(item.questionId)

      // Also check existing items in database
      if (await this.testItemRepo.isQuestionInSection(item.questionId, item.sectionId)) {
        throw new ConflictException(`Question ${item.questionId} already exists in section ${item.sectionId}`)
      }
    }

    return this.testItemRepo.bulkCreate(data)
  }

  async bulkDelete(data: BulkDeleteTestItemsInput): Promise<{ count: number }> {
    const { ids } = data

    if (ids.length === 0) {
      throw new BadRequestException('At least one ID is required')
    }

    if (ids.length > TEST_ITEM_CONSTRAINTS.MAX_BULK_DELETE) {
      throw new BadRequestException(TEST_ITEM_ERRORS.BULK_LIMIT_EXCEEDED)
    }

    // Validate all items exist
    for (const id of ids) {
      if (!(await this.testItemRepo.exists(id))) {
        throw new NotFoundException(`Item ${id} not found`)
      }
    }

    return this.testItemRepo.bulkDelete(data)
  }

  async reorder(data: ReorderTestItemsInput): Promise<TestItem[]> {
    const { updates } = data

    if (updates.length === 0) {
      throw new BadRequestException('At least one update is required')
    }

    if (updates.length > TEST_ITEM_CONSTRAINTS.MAX_BULK_REORDER) {
      throw new BadRequestException(TEST_ITEM_ERRORS.BULK_LIMIT_EXCEEDED)
    }

    // Validate all items exist
    for (const update of updates) {
      if (!(await this.testItemRepo.exists(update.id))) {
        throw new NotFoundException(`Item ${update.id} not found`)
      }

      if (update.newOrder < 0 || update.newOrder > TEST_ITEM_CONSTRAINTS.MAX_ORDER) {
        throw new BadRequestException(TEST_ITEM_ERRORS.INVALID_ORDER)
      }
    }

    return this.testItemRepo.reorder(data)
  }

  // ===== Advanced Operations =====

  async copyItems(itemIds: number[], data: CopyTestItemsInput): Promise<TestItem[]> {
    const { targetSectionId } = data

    if (itemIds.length === 0) {
      throw new BadRequestException('At least one item ID is required')
    }

    // Validate target section exists
    if (!(await this.testItemRepo.sectionExists(targetSectionId))) {
      throw new NotFoundException(TEST_ITEM_ERRORS.SECTION_NOT_FOUND)
    }

    // Validate all source items exist
    for (const id of itemIds) {
      if (!(await this.testItemRepo.exists(id))) {
        throw new NotFoundException(`Item ${id} not found`)
      }
    }

    return this.testItemRepo.copyItems(itemIds, data)
  }

  async moveItems(itemIds: number[], data: MoveTestItemsInput): Promise<TestItem[]> {
    const { targetSectionId } = data

    if (itemIds.length === 0) {
      throw new BadRequestException('At least one item ID is required')
    }

    // Validate target section exists
    if (!(await this.testItemRepo.sectionExists(targetSectionId))) {
      throw new NotFoundException(TEST_ITEM_ERRORS.SECTION_NOT_FOUND)
    }

    // Validate all source items exist
    for (const id of itemIds) {
      if (!(await this.testItemRepo.exists(id))) {
        throw new NotFoundException(`Item ${id} not found`)
      }
    }

    // Check if any items are already in target section
    const sourceItems = await Promise.all(itemIds.map((id) => this.testItemRepo.findById(id)))

    const sameSection = sourceItems.some((item) => item?.sectionId === targetSectionId)
    if (sameSection) {
      throw new BadRequestException(TEST_ITEM_ERRORS.CANNOT_MOVE_SAME_SECTION)
    }

    return this.testItemRepo.moveItems(itemIds, data)
  }

  // ===== Statistics and Queries =====

  async getStatsBySection(sectionId: number): Promise<TestItemStats> {
    // Validate section exists
    if (!(await this.testItemRepo.sectionExists(sectionId))) {
      throw new NotFoundException(TEST_ITEM_ERRORS.SECTION_NOT_FOUND)
    }

    return this.testItemRepo.getStatsBySection(sectionId)
  }

  async getBySectionId(sectionId: number): Promise<TestItem[]> {
    // Validate section exists
    if (!(await this.testItemRepo.sectionExists(sectionId))) {
      throw new NotFoundException(TEST_ITEM_ERRORS.SECTION_NOT_FOUND)
    }

    return this.testItemRepo.getBySectionId(sectionId)
  }

  async countBySectionId(sectionId: number): Promise<number> {
    // Validate section exists
    if (!(await this.testItemRepo.sectionExists(sectionId))) {
      throw new NotFoundException(TEST_ITEM_ERRORS.SECTION_NOT_FOUND)
    }

    return this.testItemRepo.countBySectionId(sectionId)
  }

  // ===== Helper Methods =====

  async exists(id: number): Promise<boolean> {
    return this.testItemRepo.exists(id)
  }

  async validateItemsInSameSection(itemIds: number[]): Promise<number | null> {
    if (itemIds.length === 0) return null

    const items = await Promise.all(itemIds.map((id) => this.testItemRepo.findById(id)))

    const sectionIds = [...new Set(items.filter((item) => item).map((item) => item!.sectionId))]
    return sectionIds.length === 1 ? sectionIds[0] : null
  }

  // ===== Convenience Methods =====
  async createItemsForSection(
    sectionId: number,
    questionIds: number[],
    maintainOrder: boolean = true,
  ): Promise<TestItem[]> {
    if (questionIds.length === 0) {
      throw new BadRequestException('At least one question ID is required')
    }

    if (questionIds.length > 50) {
      throw new BadRequestException('Maximum 50 questions can be added at once')
    }

    // Validate section exists
    if (!(await this.testItemRepo.sectionExists(sectionId))) {
      throw new NotFoundException(TEST_ITEM_ERRORS.SECTION_NOT_FOUND)
    }

    // Validate all questions exist and are not already in this section
    for (const questionId of questionIds) {
      if (!(await this.testItemRepo.questionExists(questionId))) {
        throw new NotFoundException(`Question ${questionId} not found`)
      }

      if (await this.testItemRepo.isQuestionInSection(questionId, sectionId)) {
        throw new ConflictException(`Question ${questionId} already exists in this section`)
      }
    }

    // Get starting order
    const maxOrder = await this.testItemRepo['getMaxOrderInSection'](sectionId)
    const nextOrder = maxOrder + 1

    // Create items
    const items = questionIds.map((questionId, index) => ({
      sectionId,
      questionId,
      order: maintainOrder ? nextOrder + index : nextOrder,
    }))

    return this.testItemRepo.bulkCreate({ items })
  }
}
