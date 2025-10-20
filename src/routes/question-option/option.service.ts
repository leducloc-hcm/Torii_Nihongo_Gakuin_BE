import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common'
import { OptionRepository } from './option.repo'
import { CreateOptionDTO, UpdateOptionDTO, QueryOptionDTO, BulkCreateOptionsDTO, ReorderOptionsDTO } from './option.dto'
import { OptionWhereInput, OptionOrderByInput } from './option.model'
import { OptionType } from 'src/shared/types/question.types'

@Injectable()
export class OptionService {
  constructor(private readonly optionRepository: OptionRepository) {}

  async create(questionId: number, createDto: CreateOptionDTO): Promise<any> {
    // Validate question exists
    const questionExists = await this.optionRepository.checkQuestionExists(questionId)
    if (!questionExists) {
      throw new NotFoundException(`Question with ID ${questionId} not found`)
    }

    // Get next order if not provided
    const order = createDto.order ?? (await this.optionRepository.getNextOrder(questionId))

    // Check if this will be a correct option and validate business rules
    if (createDto.isCorrect) {
      // Allow multiple correct options - no validation needed
    } else {
      // If this is not correct, ensure at least one correct option exists or will exist
      const { hasCorrectOption } = await this.optionRepository.validateCorrectOptions(questionId)
      if (!hasCorrectOption) {
        // This is fine - they might add correct options later
        // Or this might be the first option and they'll mark another as correct
      }
    }

    return this.optionRepository.create({
      questionId,
      content: createDto.content,
      isCorrect: createDto.isCorrect,
      order,
    })
  }

  async findByQuestion(questionId: number, queryDto: QueryOptionDTO) {
    const questionExists = await this.optionRepository.checkQuestionExists(questionId)
    if (!questionExists) {
      throw new NotFoundException(`Question with ID ${questionId} not found`)
    }

    const { page, limit, isCorrect, sortBy, sortOrder } = queryDto
    const skip = (page - 1) * limit

    // Build where clause
    const where: OptionWhereInput = { questionId }

    if (isCorrect !== undefined) {
      where.isCorrect = isCorrect
    }

    // Build order by clause
    const orderBy: OptionOrderByInput = {}
    if (sortBy && sortOrder) {
      orderBy[sortBy] = sortOrder
    }

    const [options, total] = await Promise.all([
      this.optionRepository.findMany({
        skip,
        take: limit,
        where,
        orderBy,
        includeQuestion: true,
      }),
      this.optionRepository.count(where),
    ])

    return {
      data: options,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    }
  }

  async findOne(id: number): Promise<any> {
    const option = await this.optionRepository.findUnique({ id }, true)
    if (!option) {
      throw new NotFoundException(`Option with ID ${id} not found`)
    }
    return option
  }

  async update(id: number, updateDto: UpdateOptionDTO): Promise<any> {
    // Check if option exists
    const existingOption = await this.optionRepository.findUnique({ id }, false)
    if (!existingOption) {
      throw new NotFoundException(`Option with ID ${id} not found`)
    }

    // If updating isCorrect to false, validate at least one correct option will remain
    if (updateDto.isCorrect === false) {
      const { correctCount } = await this.optionRepository.validateCorrectOptions(existingOption.questionId, id)

      if (correctCount === 0) {
        throw new BadRequestException('Cannot set option to incorrect. At least one correct option must remain.')
      }
    }

    return this.optionRepository.update({ id }, updateDto)
  }

  async remove(id: number): Promise<OptionType> {
    // Check if option exists
    const existingOption = await this.optionRepository.findUnique({ id }, false)
    if (!existingOption) {
      throw new NotFoundException(`Option with ID ${id} not found`)
    }

    // If this is a correct option, validate at least one correct option will remain
    if (existingOption.isCorrect) {
      const { correctCount } = await this.optionRepository.validateCorrectOptions(existingOption.questionId, id)

      if (correctCount === 0) {
        throw new BadRequestException('Cannot delete this option. At least one correct option must remain.')
      }
    }

    // Check minimum options (at least 2 options per question)
    const { total } = await this.optionRepository.getOptionsByQuestion(existingOption.questionId)
    if (total <= 2) {
      throw new BadRequestException('Cannot delete option. Each question must have at least 2 options.')
    }

    return this.optionRepository.delete({ id })
  }

  async bulkCreate(questionId: number, bulkCreateDto: BulkCreateOptionsDTO) {
    // Validate question exists
    const questionExists = await this.optionRepository.checkQuestionExists(questionId)
    if (!questionExists) {
      throw new NotFoundException(`Question with ID ${questionId} not found`)
    }

    const { options } = bulkCreateDto

    // Validate at least one correct option
    const correctOptions = options.filter((opt) => opt.isCorrect)
    if (correctOptions.length === 0) {
      throw new BadRequestException('At least one option must be correct')
    }

    // Assign orders if not provided
    let nextOrder = await this.optionRepository.getNextOrder(questionId)
    const optionsWithOrder = options.map((option) => ({
      content: option.content ?? '',
      isCorrect: option.isCorrect,
      order: option.order ?? nextOrder++,
    }))

    return this.optionRepository.bulkCreate(questionId, optionsWithOrder)
  }

  async reorderOptions(questionId: number, reorderDto: ReorderOptionsDTO) {
    // Validate question exists
    const questionExists = await this.optionRepository.checkQuestionExists(questionId)
    if (!questionExists) {
      throw new NotFoundException(`Question with ID ${questionId} not found`)
    }

    const { options } = reorderDto

    // Validate all options belong to the question
    const existingOptions = await this.optionRepository.findByQuestionId(questionId)
    const existingIds = existingOptions.map((opt) => opt.id)

    for (const option of options) {
      if (!existingIds.includes(option.id)) {
        throw new BadRequestException(`Option with ID ${option.id} does not belong to question ${questionId}`)
      }
    }

    await this.optionRepository.bulkUpdateOrder(options)

    // Return updated options
    return this.optionRepository.findByQuestionId(questionId)
  }

  async getQuestionOptions(questionId: number) {
    // Validate question exists
    const questionExists = await this.optionRepository.checkQuestionExists(questionId)
    if (!questionExists) {
      throw new NotFoundException(`Question with ID ${questionId} not found`)
    }

    return this.optionRepository.getOptionsByQuestion(questionId)
  }

  async deleteAllByQuestion(questionId: number): Promise<void> {
    // Validate question exists
    const questionExists = await this.optionRepository.checkQuestionExists(questionId)
    if (!questionExists) {
      throw new NotFoundException(`Question with ID ${questionId} not found`)
    }

    await this.optionRepository.deleteByQuestionId(questionId)
  }
}
