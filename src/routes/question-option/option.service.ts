import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common'
import { OptionRepository } from './option.repo'
import { CreateOptionDTO, UpdateOptionDTO, QueryOptionDTO, BulkCreateOptionsDTO, ReorderOptionsDTO } from './option.dto'
import { OptionWhereInput, OptionOrderByInput } from './option.model'
import { OptionType } from 'src/shared/types/question.types'
import { S3Service } from 'src/shared/services/s3.service'

@Injectable()
export class OptionService {
  constructor(
    private readonly optionRepository: OptionRepository,
    private readonly s3Service: S3Service,
  ) {}

  async create(
    questionId: number,
    createDto: CreateOptionDTO,
    files?: { image?: Express.Multer.File[]; audio?: Express.Multer.File[] },
  ): Promise<any> {
    // 1️⃣ Kiểm tra câu hỏi tồn tại
    const questionExists = await this.optionRepository.checkQuestionExists(questionId)
    if (!questionExists) {
      throw new NotFoundException(`Question with ID ${questionId} not found`)
    }

    // 2️⃣ Convert kiểu dữ liệu (fix lỗi "Expected Boolean, provided String")
    const isCorrect =
      String(createDto.isCorrect).toLowerCase() === 'true' || createDto.isCorrect === true ? true : false
    const order = createDto.order ? Number(createDto.order) : await this.optionRepository.getNextOrder(questionId)

    // 3️⃣ Upload file nếu có
    let uploadedMediaId = createDto.mediaId
    if (files?.image?.[0] || files?.audio?.[0]) {
      let imageUrl: string | undefined
      let audioUrl: string | undefined

      if (files.image?.[0]) {
        const imageResult = await this.s3Service.uploadFileToS3(files.image[0], 'options/images')
        imageUrl = imageResult.url
      }

      if (files.audio?.[0]) {
        const audioResult = await this.s3Service.uploadFileToS3(files.audio[0], 'options/audio')
        audioUrl = audioResult.url
      }

      if (imageUrl || audioUrl) {
        const primaryUrl = imageUrl || audioUrl!
        const media = await this.optionRepository.createMedia(
          primaryUrl,
          files.image?.[0]?.mimetype || files.audio?.[0]?.mimetype || 'application/octet-stream',
          files.image?.[0]?.size || files.audio?.[0]?.size || 0,
          undefined,
        )
        uploadedMediaId = media.id
      }
    }

    // 4️⃣ Chuẩn bị dữ liệu
    const optionData: any = {
      questionId,
      content: createDto.content,
      isCorrect,
      order,
    }

    if (uploadedMediaId) {
      optionData.mediaId = uploadedMediaId
    }

    // 5️⃣ Gọi repository tạo record
    return this.optionRepository.create(optionData)
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

  async update(
    id: number,
    updateDto: UpdateOptionDTO,
    files?: { image?: Express.Multer.File[]; audio?: Express.Multer.File[] },
  ): Promise<any> {
    // Check if option exists
    const existingOption = await this.optionRepository.findUnique({ id }, false)
    if (!existingOption) {
      throw new NotFoundException(`Option with ID ${id} not found`)
    }

    // Handle file uploads
    let uploadedMediaId = updateDto.mediaId

    if (files?.image?.[0] || files?.audio?.[0]) {
      // Upload files to S3 and create media record
      let imageUrl: string | undefined
      let audioUrl: string | undefined

      if (files.image?.[0]) {
        const imageResult = await this.s3Service.uploadFileToS3(files.image[0], 'options/images')
        imageUrl = imageResult.url
      }

      if (files.audio?.[0]) {
        const audioResult = await this.s3Service.uploadFileToS3(files.audio[0], 'options/audio')
        audioUrl = audioResult.url
      }

      // Create media record in database
      if (imageUrl || audioUrl) {
        const primaryUrl = imageUrl || audioUrl!

        const media = await this.optionRepository.createMedia(
          primaryUrl,
          files.image?.[0]?.mimetype || files.audio?.[0]?.mimetype || 'application/octet-stream',
          files.image?.[0]?.size || files.audio?.[0]?.size || 0,
          undefined,
        )
        uploadedMediaId = media.id
      }
    }

    // If updating isCorrect to false, validate at least one correct option will remain
    if (updateDto.isCorrect === false) {
      const { correctCount } = await this.optionRepository.validateCorrectOptions(existingOption.questionId, id)

      if (correctCount === 0) {
        throw new BadRequestException('Cannot set option to incorrect. At least one correct option must remain.')
      }
    }

    const updateData = { ...updateDto }
    if (uploadedMediaId) {
      updateData.mediaId = uploadedMediaId
    }

    return this.optionRepository.update({ id }, updateData)
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
