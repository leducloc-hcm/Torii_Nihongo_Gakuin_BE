import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common'
import { AssessmentItemRepository } from './assessment-item.repo'
import {
  AssessmentItemBase,
  AssessmentItemWithDetails,
  CreateAssessmentItemInput,
  UpdateAssessmentItemInput,
  AssessmentItemQuery,
  ReorderAssessmentItemsInput,
  BulkCreateAssessmentItemsInput,
  BulkDeleteAssessmentItemsInput,
  CopyAssessmentItemsInput,
  MoveAssessmentItemsInput,
  AssessmentItemStats,
  ASSESSMENT_ITEM_ERRORS,
  ASSESSMENT_ITEM_CONSTRAINTS,
} from './assessment-item.model'
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

  // ===== Basic CRUD Operations =====

  async createAssessmentItem(data: CreateAssessmentItemInput): Promise<AssessmentItem> {
    // Validate section exists
    if (!(await this.assessmentItemRepo.sectionExists(data.sectionId))) {
      throw new NotFoundException(ASSESSMENT_ITEM_ERRORS.SECTION_NOT_FOUND)
    }

    // Validate question exists if questionId is provided
    if (data.questionId && !(await this.assessmentItemRepo.questionExists(data.questionId))) {
      throw new NotFoundException(ASSESSMENT_ITEM_ERRORS.QUESTION_NOT_FOUND)
    }

    // Validate question group exists if questionGroupId is provided
    if (data.questionGroupId && !(await this.assessmentItemRepo.questionGroupExists(data.questionGroupId))) {
      throw new NotFoundException(ASSESSMENT_ITEM_ERRORS.QUESTION_GROUP_NOT_FOUND)
    }

    // Check for duplicate question in section
    if (data.questionId && (await this.assessmentItemRepo.isQuestionInSection(data.questionId, data.sectionId))) {
      throw new ConflictException(ASSESSMENT_ITEM_ERRORS.DUPLICATE_QUESTION)
    }

    // Validate order
    if (data.order !== undefined && (data.order < 0 || data.order > ASSESSMENT_ITEM_CONSTRAINTS.MAX_ORDER)) {
      throw new BadRequestException(ASSESSMENT_ITEM_ERRORS.INVALID_ORDER)
    }

    // Set order if not provided
    if (data.order === undefined) {
      data.order = await this.assessmentItemRepo.getNextOrderForSection(data.sectionId)
    }

    return this.assessmentItemRepo.create(data)
  }

  async getAssessmentItem(
    id: number,
    includeRelations?: { question?: boolean; section?: boolean; questionGroup?: boolean },
  ): Promise<AssessmentItemWithDetails> {
    const item = await this.assessmentItemRepo.findById(id, includeRelations)
    if (!item) {
      throw new NotFoundException(ASSESSMENT_ITEM_ERRORS.NOT_FOUND)
    }
    return item
  }

  async getAssessmentItems(query: AssessmentItemQuery): Promise<PaginatedAssessmentItems> {
    // Validate pagination parameters
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
    // Check if item exists
    if (!(await this.assessmentItemRepo.exists(id))) {
      throw new NotFoundException(ASSESSMENT_ITEM_ERRORS.NOT_FOUND)
    }

    // If updating question, validate it exists and check for duplicates
    if (data.questionId) {
      if (!(await this.assessmentItemRepo.questionExists(data.questionId))) {
        throw new NotFoundException(ASSESSMENT_ITEM_ERRORS.QUESTION_NOT_FOUND)
      }

      // Get current item to check section
      const currentItem = await this.assessmentItemRepo.findById(id)
      if (currentItem && (await this.assessmentItemRepo.isQuestionInSection(data.questionId, currentItem.sectionId))) {
        throw new ConflictException(ASSESSMENT_ITEM_ERRORS.DUPLICATE_QUESTION)
      }
    }

    // If updating question group, validate it exists
    if (data.questionGroupId) {
      if (!(await this.assessmentItemRepo.questionGroupExists(data.questionGroupId))) {
        throw new NotFoundException(ASSESSMENT_ITEM_ERRORS.QUESTION_GROUP_NOT_FOUND)
      }
    }

    // Validate order
    if (data.order !== undefined && (data.order < 0 || data.order > ASSESSMENT_ITEM_CONSTRAINTS.MAX_ORDER)) {
      throw new BadRequestException(ASSESSMENT_ITEM_ERRORS.INVALID_ORDER)
    }

    return this.assessmentItemRepo.update(id, data)
  }

  async deleteAssessmentItem(id: number): Promise<void> {
    if (!(await this.assessmentItemRepo.exists(id))) {
      throw new NotFoundException(ASSESSMENT_ITEM_ERRORS.NOT_FOUND)
    }

    await this.assessmentItemRepo.delete(id)
  }

  // ===== Bulk Operations =====

  async bulkCreateAssessmentItems(data: BulkCreateAssessmentItemsInput): Promise<AssessmentItem[]> {
    const { items } = data

    if (items.length === 0) {
      throw new BadRequestException('At least one item is required')
    }

    if (items.length > ASSESSMENT_ITEM_CONSTRAINTS.MAX_BULK_CREATE) {
      throw new BadRequestException(ASSESSMENT_ITEM_ERRORS.BULK_LIMIT_EXCEEDED)
    }

    // Validate all sections exist
    const sectionIds = [...new Set(items.map((item) => item.sectionId))]
    for (const sectionId of sectionIds) {
      if (!(await this.assessmentItemRepo.sectionExists(sectionId))) {
        throw new NotFoundException(`Section ${sectionId} not found`)
      }
    }

    // Validate all questions exist (for items that have questionId)
    const questionIds = [...new Set(items.filter((item) => item.questionId).map((item) => item.questionId!))]
    for (const questionId of questionIds) {
      if (!(await this.assessmentItemRepo.questionExists(questionId))) {
        throw new NotFoundException(`Question ${questionId} not found`)
      }
    }

    // Validate all question groups exist (for items that have questionGroupId)
    const questionGroupIds = [
      ...new Set(items.filter((item) => item.questionGroupId).map((item) => item.questionGroupId!)),
    ]
    for (const questionGroupId of questionGroupIds) {
      if (!(await this.assessmentItemRepo.questionGroupExists(questionGroupId))) {
        throw new NotFoundException(`Question group ${questionGroupId} not found`)
      }
    }

    // Check for duplicate questions within same sections
    const sectionQuestions = new Map<number, Set<number>>()
    for (const item of items) {
      if (item.questionId) {
        if (!sectionQuestions.has(item.sectionId)) {
          sectionQuestions.set(item.sectionId, new Set())
        }

        const questions = sectionQuestions.get(item.sectionId)!
        if (questions.has(item.questionId)) {
          throw new ConflictException(`Duplicate question ${item.questionId} in section ${item.sectionId}`)
        }
        questions.add(item.questionId)

        // Also check existing items in database
        if (await this.assessmentItemRepo.isQuestionInSection(item.questionId, item.sectionId)) {
          throw new ConflictException(`Question ${item.questionId} already exists in section ${item.sectionId}`)
        }
      }
    }

    return this.assessmentItemRepo.bulkCreate(data)
  }

  async bulkDeleteAssessmentItems(data: BulkDeleteAssessmentItemsInput): Promise<{ count: number }> {
    const { ids } = data

    if (ids.length === 0) {
      throw new BadRequestException('At least one ID is required')
    }

    if (ids.length > ASSESSMENT_ITEM_CONSTRAINTS.MAX_BULK_DELETE) {
      throw new BadRequestException(ASSESSMENT_ITEM_ERRORS.BULK_LIMIT_EXCEEDED)
    }

    // Validate all items exist
    for (const id of ids) {
      if (!(await this.assessmentItemRepo.exists(id))) {
        throw new NotFoundException(`Item ${id} not found`)
      }
    }

    return this.assessmentItemRepo.bulkDelete(data)
  }

  async reorderAssessmentItems(data: ReorderAssessmentItemsInput): Promise<AssessmentItem[]> {
    const { items } = data

    if (items.length === 0) {
      throw new BadRequestException('At least one update is required')
    }

    if (items.length > ASSESSMENT_ITEM_CONSTRAINTS.MAX_BULK_REORDER) {
      throw new BadRequestException(ASSESSMENT_ITEM_ERRORS.BULK_LIMIT_EXCEEDED)
    }

    // Validate all items exist
    for (const item of items) {
      if (!(await this.assessmentItemRepo.exists(item.id))) {
        throw new NotFoundException(`Item ${item.id} not found`)
      }

      if (item.order < 0 || item.order > ASSESSMENT_ITEM_CONSTRAINTS.MAX_ORDER) {
        throw new BadRequestException(ASSESSMENT_ITEM_ERRORS.INVALID_ORDER)
      }
    }

    return this.assessmentItemRepo.reorder(data)
  }

  // ===== Advanced Operations =====

  async copyAssessmentItems(itemIds: number[], data: CopyAssessmentItemsInput): Promise<AssessmentItem[]> {
    const { targetSectionId } = data

    if (itemIds.length === 0) {
      throw new BadRequestException('At least one item ID is required')
    }

    // Validate target section exists
    if (!(await this.assessmentItemRepo.sectionExists(targetSectionId))) {
      throw new NotFoundException(ASSESSMENT_ITEM_ERRORS.SECTION_NOT_FOUND)
    }

    // Validate all source items exist
    for (const id of itemIds) {
      if (!(await this.assessmentItemRepo.exists(id))) {
        throw new NotFoundException(`Item ${id} not found`)
      }
    }

    return this.assessmentItemRepo.copyItems(itemIds, data)
  }

  async moveAssessmentItems(itemIds: number[], data: MoveAssessmentItemsInput): Promise<AssessmentItem[]> {
    const { targetSectionId } = data

    if (itemIds.length === 0) {
      throw new BadRequestException('At least one item ID is required')
    }

    // Validate target section exists
    if (!(await this.assessmentItemRepo.sectionExists(targetSectionId))) {
      throw new NotFoundException(ASSESSMENT_ITEM_ERRORS.SECTION_NOT_FOUND)
    }

    // Validate all source items exist
    for (const id of itemIds) {
      if (!(await this.assessmentItemRepo.exists(id))) {
        throw new NotFoundException(`Item ${id} not found`)
      }
    }

    // Check if any items are already in target section
    const sourceItems = await Promise.all(itemIds.map((id) => this.assessmentItemRepo.findById(id)))

    const sameSection = sourceItems.some((item) => item?.sectionId === targetSectionId)
    if (sameSection) {
      throw new BadRequestException(ASSESSMENT_ITEM_ERRORS.CANNOT_MOVE_SAME_SECTION)
    }

    return this.assessmentItemRepo.moveItems(itemIds, data)
  }

  // ===== Statistics and Queries =====

  async getAssessmentItemStatsBySection(sectionId: number): Promise<AssessmentItemStats> {
    // Validate section exists
    if (!(await this.assessmentItemRepo.sectionExists(sectionId))) {
      throw new NotFoundException(ASSESSMENT_ITEM_ERRORS.SECTION_NOT_FOUND)
    }

    return this.assessmentItemRepo.getStatsBySection(sectionId)
  }

  async getAssessmentItemsBySectionId(sectionId: number): Promise<AssessmentItemWithDetails[]> {
    // Validate section exists
    if (!(await this.assessmentItemRepo.sectionExists(sectionId))) {
      throw new NotFoundException(ASSESSMENT_ITEM_ERRORS.SECTION_NOT_FOUND)
    }

    return this.assessmentItemRepo.getBySectionId(sectionId)
  }

  async countAssessmentItemsBySectionId(sectionId: number): Promise<number> {
    // Validate section exists
    if (!(await this.assessmentItemRepo.sectionExists(sectionId))) {
      throw new NotFoundException(ASSESSMENT_ITEM_ERRORS.SECTION_NOT_FOUND)
    }

    return this.assessmentItemRepo.countBySectionId(sectionId)
  }

  // ===== Helper Methods =====

  async assessmentItemExists(id: number): Promise<boolean> {
    return this.assessmentItemRepo.exists(id)
  }

  async validateItemsInSameSection(itemIds: number[]): Promise<number | null> {
    if (itemIds.length === 0) return null

    const items = await Promise.all(itemIds.map((id) => this.assessmentItemRepo.findById(id)))

    const sectionIds = [...new Set(items.filter((item) => item).map((item) => item!.sectionId))]
    return sectionIds.length === 1 ? sectionIds[0] : null
  }

  // ===== Convenience Methods =====
  async createItemsForSection(
    sectionId: number,
    questionIds: number[],
    maintainOrder: boolean = true,
  ): Promise<AssessmentItem[]> {
    if (questionIds.length === 0) {
      throw new BadRequestException('At least one question ID is required')
    }

    if (questionIds.length > 50) {
      throw new BadRequestException('Maximum 50 questions can be added at once')
    }

    // Validate section exists
    if (!(await this.assessmentItemRepo.sectionExists(sectionId))) {
      throw new NotFoundException(ASSESSMENT_ITEM_ERRORS.SECTION_NOT_FOUND)
    }

    // Validate all questions exist and are not already in this section
    for (const questionId of questionIds) {
      if (!(await this.assessmentItemRepo.questionExists(questionId))) {
        throw new NotFoundException(`Question ${questionId} not found`)
      }

      if (await this.assessmentItemRepo.isQuestionInSection(questionId, sectionId)) {
        throw new ConflictException(`Question ${questionId} already exists in this section`)
      }
    }

    // Get starting order
    const maxOrder = await this.assessmentItemRepo.getMaxOrderInSection(sectionId)
    const nextOrder = maxOrder + 1

    // Create items
    const items = questionIds.map((questionId, index) => ({
      sectionId,
      questionId,
      order: maintainOrder ? nextOrder + index : nextOrder,
    }))

    return this.assessmentItemRepo.bulkCreate({ items })
  }

  async createItemsFromQuestionGroups(
    sectionId: number,
    questionGroupIds: number[],
    maintainOrder: boolean = true,
  ): Promise<AssessmentItem[]> {
    if (questionGroupIds.length === 0) {
      throw new BadRequestException('At least one question group ID is required')
    }

    if (questionGroupIds.length > 20) {
      throw new BadRequestException('Maximum 20 question groups can be added at once')
    }

    // Validate section exists
    if (!(await this.assessmentItemRepo.sectionExists(sectionId))) {
      throw new NotFoundException(ASSESSMENT_ITEM_ERRORS.SECTION_NOT_FOUND)
    }

    // Validate all question groups exist
    for (const questionGroupId of questionGroupIds) {
      if (!(await this.assessmentItemRepo.questionGroupExists(questionGroupId))) {
        throw new NotFoundException(`Question group ${questionGroupId} not found`)
      }
    }

    // Get starting order
    const maxOrder = await this.assessmentItemRepo.getMaxOrderInSection(sectionId)
    const nextOrder = maxOrder + 1

    // Create items
    const items = questionGroupIds.map((questionGroupId, index) => ({
      sectionId,
      questionGroupId,
      order: maintainOrder ? nextOrder + index : nextOrder,
    }))

    return this.assessmentItemRepo.bulkCreate({ items })
  }

  async createItemFromQuestionGroup(
    sectionId: number,
    questionGroupId: number,
    addIndividualQuestions: boolean = false,
    order?: number,
  ): Promise<AssessmentItem[]> {
    // Validate section exists
    if (!(await this.assessmentItemRepo.sectionExists(sectionId))) {
      throw new NotFoundException(ASSESSMENT_ITEM_ERRORS.SECTION_NOT_FOUND)
    }

    // Validate question group exists
    if (!(await this.assessmentItemRepo.questionGroupExists(questionGroupId))) {
      throw new NotFoundException(ASSESSMENT_ITEM_ERRORS.QUESTION_GROUP_NOT_FOUND)
    }

    if (addIndividualQuestions) {
      // Get all questions from the group and add them individually
      const questions = await this.assessmentItemRepo.getQuestionsFromGroup(questionGroupId)
      const questionIds = questions.map((q) => q.id)
      return this.createItemsForSection(sectionId, questionIds, true)
    } else {
      // Add the question group as a single item
      const itemOrder = order ?? (await this.assessmentItemRepo.getMaxOrderInSection(sectionId)) + 1

      const item = await this.assessmentItemRepo.create({
        sectionId,
        questionGroupId,
        order: itemOrder,
      })

      return [item]
    }
  }
}
