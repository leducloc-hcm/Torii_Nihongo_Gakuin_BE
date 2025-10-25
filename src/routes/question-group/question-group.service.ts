import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { QuestionGroupRepository } from './question-group.repo'
import {
  CreateQuestionGroupDTO,
  UpdateQuestionGroupDTO,
  QueryQuestionGroupDTO,
  BulkCreateQuestionGroupsDTO,
  AddQuestionsToGroupDTO,
  RemoveQuestionsFromGroupDTO,
} from './question-group.dto'
import { QuestionGroupWhereInput, QuestionGroupOrderByInput } from './question-group.model'
import { S3Service } from 'src/shared/services/s3.service'

@Injectable()
export class QuestionGroupService {
  constructor(
    private readonly questionGroupRepository: QuestionGroupRepository,
    private readonly s3Service: S3Service,
  ) {}

  async create(
    createDto: CreateQuestionGroupDTO,
    files?: { image?: Express.Multer.File[]; audio?: Express.Multer.File[] },
  ): Promise<any> {
    const { questions, mediaId, metadata, ...groupData } = createDto

    let parsedQuestions: number[] = []
    if (questions) {
      if (Array.isArray(questions)) {
        parsedQuestions = questions.map((q) => (typeof q === 'string' ? parseInt(q, 10) : q))
      } else if (typeof questions === 'string') {
        try {
          const parsed = JSON.parse(questions)
          parsedQuestions = Array.isArray(parsed) ? parsed.map((q) => Number(q)) : [Number(questions)]
        } catch {
          parsedQuestions = [parseInt(questions, 10)]
        }
      } else {
        parsedQuestions = [questions as number]
      }
      parsedQuestions = parsedQuestions.filter((q) => !isNaN(q))
    }

    let uploadedMediaId = mediaId

    if (files?.image?.[0] || files?.audio?.[0]) {
      // Upload files to S3 and create media record
      let imageUrl: string | undefined
      let audioUrl: string | undefined

      if (files.image?.[0]) {
        const imageResult = await this.s3Service.uploadFileToS3(files.image[0], 'question-groups/images')
        imageUrl = imageResult.url
      }

      if (files.audio?.[0]) {
        const audioResult = await this.s3Service.uploadFileToS3(files.audio[0], 'question-groups/audio')
        audioUrl = audioResult.url
      }

      // Create media record in database
      if (imageUrl || audioUrl) {
        const primaryUrl = imageUrl || audioUrl!

        const media = await this.questionGroupRepository.createMedia(
          primaryUrl,
          files.image?.[0]?.mimetype || files.audio?.[0]?.mimetype || 'application/octet-stream',
          files.image?.[0]?.size || files.audio?.[0]?.size || 0,
          undefined,
        )
        uploadedMediaId = media.id
      }
    }

    if (uploadedMediaId) {
      const mediaExists = await this.questionGroupRepository.checkMediaExists(uploadedMediaId)
      if (!mediaExists) {
        throw new BadRequestException(`Media with ID ${uploadedMediaId} does not exist`)
      }
    }

    // Validate questions exist if provided
    if (parsedQuestions && parsedQuestions.length > 0) {
      const { existing, missing } = await this.questionGroupRepository.checkQuestionsExist(parsedQuestions)
      if (missing.length > 0) {
        throw new BadRequestException(`Questions with IDs [${missing.join(', ')}] do not exist`)
      }
    }

    const groupCreateData: any = {
      ...groupData,
      metadata: metadata || null,
    }

    if (uploadedMediaId) {
      groupCreateData.media = { connect: { id: uploadedMediaId } }
    }

    return this.questionGroupRepository.createWithQuestions(groupCreateData, parsedQuestions || [])
  }

  async findAll(queryDto: QueryQuestionGroupDTO) {
    const { page, limit, type, hasMedia, hasPassage, keyword, sortBy, sortOrder } = queryDto

    const where: any = {}

    if (type !== undefined) {
      where.type = type
    }

    if (hasMedia !== undefined) {
      where.mediaId = hasMedia ? { not: null } : null
    }

    if (hasPassage !== undefined) {
      where.passage = hasPassage ? { not: null } : null
    }

    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: 'insensitive' } },
        { passage: { contains: keyword, mode: 'insensitive' } },
      ]
    }

    const orderBy: any = {}
    if (sortBy && sortOrder) {
      orderBy[sortBy] = sortOrder
    }

    return this.questionGroupRepository.findManyWithPagination({
      page,
      limit,
      where,
      orderBy,
    })
  }

  async findOne(id: number): Promise<any> {
    const group = await this.questionGroupRepository.findUnique({ id }, true)
    if (!group) {
      throw new NotFoundException(`Question Group with ID ${id} not found`)
    }
    return group
  }

  async update(
    id: number,
    updateDto: UpdateQuestionGroupDTO,
    files?: { image?: Express.Multer.File[]; audio?: Express.Multer.File[] },
  ): Promise<any> {
    const exists = await this.questionGroupRepository.checkExists(id)
    if (!exists) {
      throw new NotFoundException(`Question Group with ID ${id} not found`)
    }

    const { questions, mediaId, ...groupData } = updateDto

    // Parse questions - handle form-data where questions might be string or string[]
    let parsedQuestions: number[] | undefined
    if (questions) {
      if (Array.isArray(questions)) {
        // If array, convert each element to number
        parsedQuestions = questions.map((q) => (typeof q === 'string' ? parseInt(q, 10) : q))
      } else if (typeof questions === 'string') {
        // If single string, try to parse as JSON array first, otherwise convert to number
        try {
          const parsed = JSON.parse(questions)
          parsedQuestions = Array.isArray(parsed) ? parsed.map((q) => Number(q)) : [Number(questions)]
        } catch {
          parsedQuestions = [parseInt(questions, 10)]
        }
      } else {
        parsedQuestions = [questions as number]
      }
      // Filter out NaN values
      parsedQuestions = parsedQuestions.filter((q) => !isNaN(q))
    }

    // Handle file uploads
    let updatedMediaId = mediaId

    if (files?.image?.[0] || files?.audio?.[0]) {
      // Upload files to S3 and create media record
      let imageUrl: string | undefined
      let audioUrl: string | undefined

      if (files.image?.[0]) {
        const imageResult = await this.s3Service.uploadFileToS3(files.image[0], 'question-groups/images')
        imageUrl = imageResult.url
      }

      if (files.audio?.[0]) {
        const audioResult = await this.s3Service.uploadFileToS3(files.audio[0], 'question-groups/audio')
        audioUrl = audioResult.url
      }

      // Create media record in database
      if (imageUrl || audioUrl) {
        const primaryUrl = imageUrl || audioUrl!

        const media = await this.questionGroupRepository.createMedia(
          primaryUrl,
          files.image?.[0]?.mimetype || files.audio?.[0]?.mimetype || 'application/octet-stream',
          files.image?.[0]?.size || files.audio?.[0]?.size || 0,
          undefined,
        )
        updatedMediaId = media.id
      }
    }

    if (updatedMediaId) {
      const mediaExists = await this.questionGroupRepository.checkMediaExists(updatedMediaId)
      if (!mediaExists) {
        throw new BadRequestException(`Media with ID ${updatedMediaId} does not exist`)
      }
    }

    // Validate questions exist if provided
    if (parsedQuestions && parsedQuestions.length > 0) {
      const { existing, missing } = await this.questionGroupRepository.checkQuestionsExist(parsedQuestions)
      if (missing.length > 0) {
        throw new BadRequestException(`Questions with IDs [${missing.join(', ')}] do not exist`)
      }
    }

    const updateData: any = {
      ...groupData,
      metadata: groupData.metadata || null,
    }

    if (updatedMediaId) {
      updateData.media = { connect: { id: updatedMediaId } }
    }

    return this.questionGroupRepository.updateWithQuestions(id, updateData, parsedQuestions)
  }

  async remove(id: number): Promise<any> {
    const exists = await this.questionGroupRepository.checkExists(id)
    if (!exists) {
      throw new NotFoundException(`Question Group with ID ${id} not found`)
    }

    return this.questionGroupRepository.delete({ id })
  }

  async getStatistics() {
    return this.questionGroupRepository.getStatistics()
  }

  async bulkCreate(bulkCreateDto: BulkCreateQuestionGroupsDTO) {
    const { groups } = bulkCreateDto

    for (const group of groups) {
      if (group.mediaId) {
        const mediaExists = await this.questionGroupRepository.checkMediaExists(group.mediaId)
        if (!mediaExists) {
          throw new BadRequestException(`Media with ID ${group.mediaId} does not exist`)
        }
      }

      if (group.questions && group.questions.length > 0) {
        const { existing, missing } = await this.questionGroupRepository.checkQuestionsExist(group.questions)
        if (missing.length > 0) {
          throw new BadRequestException(`Questions with IDs [${missing.join(', ')}] do not exist`)
        }
      }
    }

    const groupsData = groups.map((group) => {
      const { questions, mediaId, metadata, ...groupData } = group

      const groupCreateData: any = {
        ...groupData,
        metadata: metadata || null,
      }

      if (mediaId) {
        groupCreateData.media = { connect: { id: mediaId } }
      }

      return {
        groupData: groupCreateData,
        questionIds: questions || [],
      }
    })

    return this.questionGroupRepository.bulkCreate(groupsData)
  }

  async findByType(type: string, queryDto: Omit<QueryQuestionGroupDTO, 'type'>) {
    const queryWithType = { ...queryDto, type: type as any }
    return this.findAll(queryWithType)
  }

  async addQuestionsToGroup(groupId: number, addDto: AddQuestionsToGroupDTO): Promise<any> {
    const exists = await this.questionGroupRepository.checkExists(groupId)
    if (!exists) {
      throw new NotFoundException(`Question Group with ID ${groupId} not found`)
    }

    const { questionIds } = addDto

    // Validate questions exist
    const { existing, missing } = await this.questionGroupRepository.checkQuestionsExist(questionIds)
    if (missing.length > 0) {
      throw new BadRequestException(`Questions with IDs [${missing.join(', ')}] do not exist`)
    }

    return this.questionGroupRepository.addQuestionsToGroup(groupId, questionIds)
  }

  async removeQuestionsFromGroup(groupId: number, removeDto: RemoveQuestionsFromGroupDTO): Promise<any> {
    const exists = await this.questionGroupRepository.checkExists(groupId)
    if (!exists) {
      throw new NotFoundException(`Question Group with ID ${groupId} not found`)
    }

    const { questionIds } = removeDto

    return this.questionGroupRepository.removeQuestionsFromGroup(groupId, questionIds)
  }

  async getGroupQuestions(groupId: number): Promise<any> {
    const group = await this.questionGroupRepository.findUnique({ id: groupId }, true)
    if (!group) {
      throw new NotFoundException(`Question Group with ID ${groupId} not found`)
    }

    return {
      group: {
        id: group.id,
        type: group.type,
        title: group.title,
      },
      questions: group.questions || [],
      questionsCount: group.questions?.length || 0,
    }
  }
}
