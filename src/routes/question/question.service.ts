import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { QuestionRepository } from './question.repo'
import { CreateQuestionDTO, UpdateQuestionDTO, QueryQuestionDTO, BulkCreateQuestionsDTO } from './question.dto'
import { QuestionWhereInput, QuestionOrderByInput, QuestionWithOptions } from './question.model'
import { JLPTLevelType, QuestionTypeType, DifficultyType } from 'src/shared/constants/enum.constant'
import { QuestionType } from 'src/shared/types/question.types'

@Injectable()
export class QuestionService {
  constructor(private readonly questionRepository: QuestionRepository) {}

  async create(createDto: CreateQuestionDTO): Promise<any> {
    const { options, mediaId, metadata, ...questionData } = createDto

    if (mediaId) {
      const mediaExists = await this.questionRepository.checkMediaExists(mediaId)
      if (!mediaExists) {
        throw new BadRequestException(`Media with ID ${mediaId} does not exist`)
      }
    }

    const correctOptions = options.filter((opt) => opt.isCorrect)
    if (correctOptions.length === 0) {
      throw new BadRequestException('At least one option must be correct')
    }

    const questionCreateData: any = {
      ...questionData,
      metadata: metadata || null,
    }

    if (mediaId) {
      questionCreateData.media = { connect: { id: mediaId } }
    }

    return this.questionRepository.createWithOptions(
      questionCreateData,
      options.map((opt, index) => ({
        content: opt.content,
        isCorrect: opt.isCorrect,
        order: opt.order ?? index,
      })),
    )
  }

  async findAll(queryDto: QueryQuestionDTO) {
    const { page, limit, type, level, difficulty, readingLength, keyword, tags, hasMedia, sortBy, sortOrder } = queryDto

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
      optionsCount: question._count?.option || 0,
      correctOptionsCount: question.option?.filter((opt) => opt.isCorrect).length || 0,
      hasMedia: !!question.mediaId,
    }))

    return {
      data: transformedQuestions,
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
    const question = await this.questionRepository.findUnique({ id }, true)
    if (!question) {
      throw new NotFoundException(`Question with ID ${id} not found`)
    }
    return question
  }

  async update(id: number, updateDto: UpdateQuestionDTO): Promise<any> {
    const exists = await this.questionRepository.checkExists(id)
    if (!exists) {
      throw new NotFoundException(`Question with ID ${id} not found`)
    }

    const { options, mediaId, ...questionData } = updateDto

    if (mediaId) {
      const mediaExists = await this.questionRepository.checkMediaExists(mediaId)
      if (!mediaExists) {
        throw new BadRequestException(`Media with ID ${mediaId} does not exist`)
      }
    }

    // Validate at least one correct option if options are provided
    if (options) {
      const correctOptions = options.filter((opt) => opt.isCorrect)
      if (correctOptions.length === 0) {
        throw new BadRequestException('At least one option must be correct')
      }

      const updateData: any = {
        ...questionData,
        metadata: questionData.metadata || null,
      }

      if (mediaId) {
        updateData.media = { connect: { id: mediaId } }
      }

      return this.questionRepository.updateWithOptions(
        id,
        updateData,
        options.map((opt, index) => ({
          content: opt.content,
          isCorrect: opt.isCorrect,
          order: opt.order ?? index,
        })),
      )
    }

    const updateData: any = {
      ...questionData,
      metadata: questionData.metadata || null,
    }

    if (mediaId) {
      updateData.media = { connect: { id: mediaId } }
    }

    return this.questionRepository.update({ id }, updateData)
  }

  async remove(id: number): Promise<QuestionType> {
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
}
