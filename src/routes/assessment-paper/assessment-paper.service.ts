import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common'
import { AssessmentPaperRepository } from './assessment-paper.repo'
import {
  AssessmentPaperBase,
  AssessmentPaperWithRelations,
  AssessmentPaperBasic,
  AssessmentPaperWithSections,
  CreateAssessmentPaperInput,
  UpdateAssessmentPaperInput,
  AssessmentPaperQuery,
  JLPTLevel,
  Visibility,
  AssessmentType,
} from './assessment-paper.model'

@Injectable()
export class AssessmentPaperService {
  constructor(private readonly assessmentPaperRepo: AssessmentPaperRepository) {}

  async createAssessmentPaper(data: CreateAssessmentPaperInput): Promise<AssessmentPaperBase> {
    const titleExists = await this.assessmentPaperRepo.getTitleExists(data.title)
    if (titleExists) {
      throw new ConflictException(`Assessment paper with title "${data.title}" already exists`)
    }

    const isBlueprintMode = Boolean(data.blueprintId || data.seed || data.generatorVersion)

    const createData: CreateAssessmentPaperInput = {
      title: data.title,
      level: data.level,
      type: data.type,
      visibility: data.visibility || 'PRIVATE',
      createdBy: data.createdBy,
      scoreProfileId: data.scoreProfileId,
      lessonId: data.lessonId,
      version: 1, // Default version
    }

    if (isBlueprintMode) {
      if (!data.blueprintId) {
        throw new BadRequestException('Blueprint ID is required for blueprint generation mode')
      }

      const nextVersion = await this.assessmentPaperRepo.getNextVersion(data.blueprintId)

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
      // Keep default version for manual creation
    }

    return this.assessmentPaperRepo.create(createData)
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

  async getAssessmentPaperWithSections(id: number): Promise<AssessmentPaperWithSections> {
    const assessmentPaper = await this.assessmentPaperRepo.findByIdWithSections(id)
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

    if (data.seed !== undefined) {
      const maxSeed = BigInt('9223372036854775807')
      if (data.seed < 0 || data.seed > maxSeed) {
        throw new BadRequestException('Seed must be between 0 and 9223372036854775807')
      }
    }

    const updateData: UpdateAssessmentPaperInput = {}

    if (data.title !== undefined) updateData.title = data.title
    if (data.level !== undefined) updateData.level = data.level
    if (data.type !== undefined) updateData.type = data.type
    if (data.visibility !== undefined) updateData.visibility = data.visibility
    if (data.lessonId !== undefined) updateData.lessonId = data.lessonId

    if (data.blueprintId !== undefined) updateData.blueprintId = data.blueprintId
    if (data.blueprintSnapshot !== undefined) updateData.blueprintSnapshot = data.blueprintSnapshot
    if (data.seed !== undefined) updateData.seed = data.seed
    if (data.version !== undefined) updateData.version = data.version
    if (data.generatorVersion !== undefined) updateData.generatorVersion = data.generatorVersion
    if (data.generatorMeta !== undefined) updateData.generatorMeta = data.generatorMeta

    return this.assessmentPaperRepo.update(id, updateData)
  }

  async deleteAssessmentPaper(id: number): Promise<void> {
    const exists = await this.assessmentPaperRepo.exists(id)
    if (!exists) {
      throw new NotFoundException(`Assessment paper with ID ${id} not found`)
    }

    try {
      await this.assessmentPaperRepo.delete(id)
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

  async getAssessmentPapersByBlueprint(blueprintId: number): Promise<AssessmentPaperBase[]> {
    return this.assessmentPaperRepo.findByBlueprint(blueprintId)
  }

  async getAssessmentPapersByLevel(level: JLPTLevel): Promise<AssessmentPaperBase[]> {
    return this.assessmentPaperRepo.findByLevel(level)
  }

  async getAssessmentPapersByCreator(createdBy: number): Promise<AssessmentPaperBase[]> {
    return this.assessmentPaperRepo.findByCreator(createdBy)
  }

  async getPublicAssessments(level?: JLPTLevel, type?: AssessmentType): Promise<AssessmentPaperBase[]> {
    return this.assessmentPaperRepo.findPublicAssessments(level, type)
  }

  async bulkDeleteAssessmentPapers(ids: number[]): Promise<{ deleted: number; failed: number[] }> {
    const existingIds = await this.assessmentPaperRepo.existsByIds(ids)
    const failedIds = ids.filter((id) => !existingIds.includes(id))

    if (existingIds.length === 0) {
      throw new NotFoundException('None of the specified assessment papers were found')
    }

    try {
      const result = await this.assessmentPaperRepo.bulkDelete(existingIds)
      return {
        deleted: result.count,
        failed: failedIds,
      }
    } catch (error: any) {
      if (error.code === 'P2003') {
        throw new BadRequestException('Cannot delete some assessment papers because they have associated attempts')
      }
      throw error
    }
  }

  async bulkUpdateVisibility(ids: number[], visibility: Visibility): Promise<{ updated: number; failed: number[] }> {
    const existingIds = await this.assessmentPaperRepo.existsByIds(ids)
    const failedIds = ids.filter((id) => !existingIds.includes(id))

    if (existingIds.length === 0) {
      throw new NotFoundException('None of the specified assessment papers were found')
    }

    const result = await this.assessmentPaperRepo.bulkUpdateVisibility(existingIds, visibility)
    return {
      updated: result.count,
      failed: failedIds,
    }
  }

  async cloneAssessmentPaper(
    id: number,
    createdBy: number,
    data: {
      title?: string
      level?: JLPTLevel
      type?: AssessmentType
      visibility?: Visibility
      includeAttempts?: boolean
    },
  ): Promise<AssessmentPaperBase> {
    const exists = await this.assessmentPaperRepo.exists(id)
    if (!exists) {
      throw new NotFoundException(`Assessment paper with ID ${id} not found`)
    }

    if (data.title) {
      const titleExists = await this.assessmentPaperRepo.getTitleExists(data.title)
      if (titleExists) {
        throw new ConflictException(`Assessment paper with title "${data.title}" already exists`)
      }
    }

    try {
      return await this.assessmentPaperRepo.clone(id, { ...data, createdBy })
    } catch (error: any) {
      if (error.message === 'Assessment paper not found') {
        throw new NotFoundException(`Assessment paper with ID ${id} not found`)
      }
      throw error
    }
  }

  async getAssessmentPaperStatistics(id: number): Promise<{
    totalAttempts: number
    completedAttempts: number
    averageScore: number
    highestScore: number
    lowestScore: number
    averageEarnedScore: number
    highestEarnedScore: number
    lowestEarnedScore: number
    averageCompletionTime: number
  }> {
    const exists = await this.assessmentPaperRepo.exists(id)
    if (!exists) {
      throw new NotFoundException(`Assessment paper with ID ${id} not found`)
    }

    return this.assessmentPaperRepo.getStatistics(id)
  }

  async searchAssessmentPapers(searchTerm: string, limit: number = 20): Promise<AssessmentPaperBase[]> {
    if (!searchTerm || searchTerm.trim().length === 0) {
      throw new BadRequestException('Search term cannot be empty')
    }

    if (searchTerm.length < 2) {
      throw new BadRequestException('Search term must be at least 2 characters long')
    }

    return this.assessmentPaperRepo.searchByContent(searchTerm.trim(), limit)
  }

  async validateAssessmentPaperAccess(id: number, userId: number): Promise<AssessmentPaperBase> {
    const assessmentPaper = await this.getAssessmentPaper(id)

    const hasAccess = await this.assessmentPaperRepo.getUserAccess(id, userId)
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this assessment paper')
    }

    return assessmentPaper
  }

  async generateFromBlueprint(
    blueprintId: number,
    createdBy: number,
    scoreProfileId: number,
    options: {
      title?: string
      seed?: bigint
      generatorVersion?: string
      generatorMeta?: any
    } = {},
  ): Promise<AssessmentPaperBase> {
    // TODO: Validate blueprint exists and get its level
    const baseTitle = options.title || `Generated Assessment - ${new Date().toISOString()}`

    const assessmentPaperData: CreateAssessmentPaperInput = {
      title: baseTitle,
      level: 'N3', // Should come from blueprint
      type: 'TEST',
      visibility: 'PRIVATE',
      createdBy,
      scoreProfileId,
      blueprintId,
      seed: options.seed || BigInt(Math.floor(Math.random() * 1000000)),
      version: 1,
      generatorVersion: options.generatorVersion || '1.0.0',
      generatorMeta: options.generatorMeta || {
        model: 'placeholder',
        timestamp: new Date(),
      },
    }

    return this.createAssessmentPaper(assessmentPaperData)
  }

  async createNewVersion(id: number, changes: UpdateAssessmentPaperInput = {}): Promise<AssessmentPaperBase> {
    const original = await this.getAssessmentPaper(id)

    if (!original.blueprintId) {
      throw new BadRequestException('Cannot create new version: assessment paper is not associated with a blueprint')
    }

    const nextVersion = await this.assessmentPaperRepo.getNextVersion(original.blueprintId)

    const cloneData = {
      title: changes.title || `${original.title} (v${nextVersion})`,
      level: changes.level || original.level,
      type: changes.type || original.type,
      visibility: changes.visibility || 'PRIVATE',
      includeAttempts: false,
    }

    const cloned = await this.cloneAssessmentPaper(id, original.createdBy, cloneData)

    return this.assessmentPaperRepo.update(cloned.id, {
      version: nextVersion,
      generatorVersion: changes.generatorVersion || original.generatorVersion || undefined,
      generatorMeta: changes.generatorMeta || original.generatorMeta || undefined,
    })
  }

  async validateAssessmentContent(id: number): Promise<{
    isValid: boolean
    errors: string[]
    warnings: string[]
  }> {
    const assessmentPaper = await this.getAssessmentPaperWithSections(id)

    const errors: string[] = []
    const warnings: string[] = []

    if (!assessmentPaper.sections || assessmentPaper.sections.length === 0) {
      errors.push('Assessment paper must have at least one section')
    }

    for (const section of assessmentPaper.sections) {
      if (!section.items || section.items.length === 0) {
        errors.push(`Section "${section.title}" has no questions`)
      }

      for (const item of section.items) {
        if (item.question && (!item.question.option || item.question.option.length === 0)) {
          warnings.push(`Question "${item.question.stem}" has no options`)
        }

        if (item.questionGroup) {
          for (const question of item.questionGroup.questions) {
            if (!question.option || question.option.length === 0) {
              warnings.push(`Question "${question.stem}" in group has no options`)
            }
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  async getAssessmentPaperForAttempt(id: number, userId: number): Promise<AssessmentPaperBase> {
    // Validate access first
    await this.validateAssessmentPaperAccess(id, userId)

    // Get assessment without correct answers for security
    const assessment = await this.assessmentPaperRepo.getAssessmentForAttempt(id)
    if (!assessment) {
      throw new NotFoundException(`Assessment paper with ID ${id} not found`)
    }

    return assessment
  }

  async checkUserEnrollment(assessmentId: number, userId: number): Promise<boolean> {
    return this.assessmentPaperRepo.getUserAccess(assessmentId, userId)
  }
}
