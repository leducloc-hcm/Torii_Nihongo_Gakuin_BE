import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { QuestionRepository } from './question.repo'
import { CreateQuestionDTO, UpdateQuestionDTO, QueryQuestionDTO, BulkCreateQuestionsDTO } from './question.dto'
import { QuestionWhereInput, QuestionOrderByInput, QuestionWithOptions } from './question.model'
import { JLPTLevelType, QuestionTypeType, DifficultyType } from 'src/shared/constants/enum.constant'
import { QuestionType } from 'src/shared/types/question.types'
import { S3Service } from 'src/shared/services/s3.service'

@Injectable()
export class QuestionService {
  constructor(
    private readonly questionRepository: QuestionRepository,
    private readonly s3Service: S3Service,
  ) {}

  async create(
    createDto: CreateQuestionDTO,
    files?: { image?: Express.Multer.File[]; audio?: Express.Multer.File[] },
  ): Promise<any> {
    const { mediaId, metadata, ...questionData } = createDto

    // Handle file uploads
    let uploadedMediaId = mediaId

    if (files?.image?.[0] || files?.audio?.[0]) {
      // Upload files to S3 and create media record
      let imageUrl: string | undefined
      let audioUrl: string | undefined

      if (files.image?.[0]) {
        const imageResult = await this.s3Service.uploadFileToS3(files.image[0], 'questions/images')
        imageUrl = imageResult.url
      }

      if (files.audio?.[0]) {
        const audioResult = await this.s3Service.uploadFileToS3(files.audio[0], 'questions/audio')
        audioUrl = audioResult.url
      }

      // Create media record in database
      if (imageUrl || audioUrl) {
        const primaryUrl = imageUrl || audioUrl!
        const mediaData = {
          url: primaryUrl,
          kind: imageUrl ? 'IMAGE' : 'AUDIO',
          caption: null,
          mimeType: files.image?.[0]?.mimetype || files.audio?.[0]?.mimetype,
          sizeByte: files.image?.[0]?.size || files.audio?.[0]?.size,
        }

        const media = await this.questionRepository.createMedia(mediaData)
        uploadedMediaId = media.id
      }
    }

    if (uploadedMediaId) {
      const mediaExists = await this.questionRepository.checkMediaExists(uploadedMediaId)
      if (!mediaExists) {
        throw new BadRequestException(`Media with ID ${uploadedMediaId} does not exist`)
      }
    }

    const questionCreateData: any = {
      ...questionData,
      metadata: metadata || null,
    }

    if (uploadedMediaId) {
      questionCreateData.media = { connect: { id: uploadedMediaId } }
    }

    return this.questionRepository.create(questionCreateData)
  }

  async findAll(queryDto: QueryQuestionDTO): Promise<{
    data: any[]
    pagination: {
      total: number
      page: number
      limit: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }> {
    const {
      page = 1,
      limit = 10,
      type,
      level,
      difficulty,
      readingLength,
      keyword,
      tags,
      hasMedia,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = queryDto

    if (page < 1) {
      throw new BadRequestException('Page must be greater than 0')
    }

    if (limit < 1 || limit > 100) {
      throw new BadRequestException('Limit must be between 1 and 100')
    }

    const skip = (page - 1) * limit

    const where: QuestionWhereInput = {}

    if (type !== undefined) {
      where.type = type
    }

    if (level !== undefined) {
      where.level = level
    }

    if (difficulty !== undefined) {
      where.difficulty = difficulty
    }

    // Note: readingLength filtering temporarily disabled due to Prisma type issues
    // if (readingLength !== undefined) {
    //   where.readingLength = readingLength
    // }

    if (keyword) {
      where.OR = [
        { stem: { contains: keyword, mode: 'insensitive' } },
        { passage: { contains: keyword, mode: 'insensitive' } },
        { explanation: { contains: keyword, mode: 'insensitive' } },
      ]
    }

    if (tags) {
      const tagArray = tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
      if (tagArray.length > 0) {
        where.tags = {
          hasEvery: tagArray,
        }
      }
    }

    if (hasMedia !== undefined) {
      where.mediaId = hasMedia ? { not: null } : null
    }

    // Build order by clause
    const orderBy: QuestionOrderByInput = {}
    if (sortBy && sortOrder) {
      orderBy[sortBy] = sortOrder
    }

    try {
      const [questions, total] = await Promise.all([
        this.questionRepository.findManyWithStats({
          skip,
          take: limit,
          where,
          orderBy,
        }),
        this.questionRepository.count(where),
      ])

      // Transform questions to include stats
      const transformedQuestions = questions.map((question) => ({
        ...question,
        correctOptionsCount: question.option?.filter((opt) => opt.isCorrect).length || 0,
        hasMedia: !!question.mediaId,
      }))

      return {
        data: transformedQuestions,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      }
    } catch (error) {
      throw new BadRequestException(
        `Failed to fetch questions: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  async findOne(id: number): Promise<any> {
    const question = await this.questionRepository.findUnique({ id }, true)
    if (!question) {
      throw new NotFoundException(`Question with ID ${id} not found`)
    }
    return question
  }

  async update(
    id: number,
    updateDto: UpdateQuestionDTO,
    files?: { image?: Express.Multer.File[]; audio?: Express.Multer.File[] },
  ): Promise<any> {
    const exists = await this.questionRepository.checkExists(id)
    if (!exists) {
      throw new NotFoundException(`Question with ID ${id} not found`)
    }

    const { mediaId, ...questionData } = updateDto

    // Handle file uploads
    let updatedMediaId = mediaId

    if (files?.image?.[0] || files?.audio?.[0]) {
      // Upload files to S3 and create media record
      let imageUrl: string | undefined
      let audioUrl: string | undefined

      if (files.image?.[0]) {
        const imageResult = await this.s3Service.uploadFileToS3(files.image[0], 'questions/images')
        imageUrl = imageResult.url
      }

      if (files.audio?.[0]) {
        const audioResult = await this.s3Service.uploadFileToS3(files.audio[0], 'questions/audio')
        audioUrl = audioResult.url
      }

      // Create media record in database
      if (imageUrl || audioUrl) {
        const primaryUrl = imageUrl || audioUrl!
        const mediaData = {
          url: primaryUrl,
          kind: imageUrl ? 'IMAGE' : 'AUDIO',
          caption: null,
          mimeType: files.image?.[0]?.mimetype || files.audio?.[0]?.mimetype,
          sizeByte: files.image?.[0]?.size || files.audio?.[0]?.size,
        }

        const media = await this.questionRepository.createMedia(mediaData)
        updatedMediaId = media.id
      }
    }

    if (updatedMediaId) {
      const mediaExists = await this.questionRepository.checkMediaExists(updatedMediaId)
      if (!mediaExists) {
        throw new BadRequestException(`Media with ID ${updatedMediaId} does not exist`)
      }
    }

    const updateData: any = {
      ...questionData,
      metadata: questionData.metadata || null,
    }

    if (updatedMediaId) {
      updateData.media = { connect: { id: updatedMediaId } }
    }

    return this.questionRepository.update({ id }, updateData)
  }

  async remove(id: number): Promise<any> {
    const exists = await this.questionRepository.checkExists(id)
    if (!exists) {
      throw new NotFoundException(`Question with ID ${id} not found`)
    }

    return this.questionRepository.delete({ id })
  }

  async getStatistics() {
    return this.questionRepository.getStatistics()
  }

  async bulkCreate(bulkCreateDto: BulkCreateQuestionsDTO) {
    const { questions } = bulkCreateDto

    for (const question of questions) {
      if (question.mediaId) {
        const mediaExists = await this.questionRepository.checkMediaExists(question.mediaId)
        if (!mediaExists) {
          throw new BadRequestException(`Media with ID ${question.mediaId} does not exist`)
        }
      }

      const correctOptions = question.options.filter((opt) => opt.isCorrect)
      if (correctOptions.length === 0) {
        throw new BadRequestException('At least one option must be correct for each question')
      }
    }

    const questionsData = questions.map((question) => {
      const { options, mediaId, metadata, ...questionData } = question

      const questionCreateData: any = {
        ...questionData,
        metadata: metadata || null,
      }

      if (mediaId) {
        questionCreateData.media = { connect: { id: mediaId } }
      }

      return {
        questionData: questionCreateData,
        options: options.map((opt, index) => ({
          content: opt.content,
          isCorrect: opt.isCorrect,
          order: opt.order ?? index,
        })),
      }
    })

    return this.questionRepository.bulkCreate(questionsData)
  }

  async findByType(type: QuestionTypeType, queryDto: Omit<QueryQuestionDTO, 'type'>) {
    const queryWithType = { ...queryDto, type }
    return this.findAll(queryWithType as any)
  }

  async findByLevel(level: JLPTLevelType, queryDto: Omit<QueryQuestionDTO, 'level'>) {
    const queryWithLevel = { ...queryDto, level }
    return this.findAll(queryWithLevel)
  }

  async findByDifficulty(difficulty: DifficultyType, queryDto: Omit<QueryQuestionDTO, 'difficulty'>) {
    const queryWithDifficulty = { ...queryDto, difficulty }
    return this.findAll(queryWithDifficulty)
  }

  // Additional helper methods for consistency with test-section pattern
  async getQuestionsByFilters(filters: {
    type?: QuestionTypeType
    level?: JLPTLevelType
    difficulty?: DifficultyType
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: string
  }) {
    const result = await this.questionRepository.findByFilters(filters as any)

    const transformedData = result.data.map((question) => ({
      ...question,
      optionsCount: question._count?.option || 0,
      correctOptionsCount: question.option?.filter((opt: any) => opt.isCorrect).length || 0,
      hasMedia: !!question.mediaId,
    }))

    return {
      data: transformedData,
      pagination: {
        total: result.total,
        page: filters.page || 1,
        limit: filters.limit || 10,
        totalPages: Math.ceil(result.total / (filters.limit || 10)),
        hasNext: (filters.page || 1) * (filters.limit || 10) < result.total,
        hasPrev: (filters.page || 1) > 1,
      },
    }
  }
}
