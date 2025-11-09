import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { S3Service } from 'src/shared/services/s3.service'
import {
  AddQuestionsToGroupDTO,
  BulkCreateQuestionGroupsDTO,
  CreateQuestionGroupDTO,
  QueryQuestionGroupDTO,
  RemoveQuestionsFromGroupDTO,
  UpdateQuestionGroupDTO,
} from './question-group.dto'
import { QuestionGroupRepository } from './question-group.repo'

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
      let imageUrl: string | undefined
      let audioUrl: string | undefined
      let imageFile: Express.Multer.File | undefined
      let audioFile: Express.Multer.File | undefined

      if (files.image?.[0]) {
        const imageResult = await this.s3Service.uploadFileToS3(files.image[0], 'question-groups/images')
        imageUrl = imageResult.url
        imageFile = files.image[0]
      }

      if (files.audio?.[0]) {
        const audioResult = await this.s3Service.uploadFileToS3(files.audio[0], 'question-groups/audio')
        audioUrl = audioResult.url
        audioFile = files.audio[0]
      }
      if (imageUrl || audioUrl) {
        const primaryUrl = imageUrl || audioUrl!
        const primaryKind = imageUrl ? 'IMAGE' : 'AUDIO'

        const mediaMeta: any = {}
        if (imageUrl && audioUrl) {
          mediaMeta.hasMultiple = true
          mediaMeta.image = {
            url: imageUrl,
            mimeType: imageFile?.mimetype,
            sizeByte: imageFile?.size,
          }
          mediaMeta.audio = {
            url: audioUrl,
            mimeType: audioFile?.mimetype,
            sizeByte: audioFile?.size,
          }
        }

        const media = await this.questionGroupRepository.createMedia(
          primaryUrl,
          imageFile?.mimetype || audioFile?.mimetype || 'application/octet-stream',
          imageFile?.size || audioFile?.size || 0,
          undefined,
          primaryKind,
          Object.keys(mediaMeta).length > 0 ? mediaMeta : undefined,
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
    const group = await this.questionGroupRepository.findUnique({ id })
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

    const isUsed = await this.questionGroupRepository.isQuestionGroupUsed(id)
    if (isUsed) {
      throw new BadRequestException(
        'Cannot update this question group as it is already used in assessments or quizzes. Please create a new version instead using the clone endpoint.',
      )
    }

    const { questions, mediaId, ...groupData } = updateDto

    let parsedQuestions: number[] | undefined
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

    // Handle file uploads
    let updatedMediaId = mediaId

    if (files?.image?.[0] || files?.audio?.[0]) {
      // Upload files to S3 and create media record
      let imageUrl: string | undefined
      let audioUrl: string | undefined
      let imageFile: Express.Multer.File | undefined
      let audioFile: Express.Multer.File | undefined

      if (files.image?.[0]) {
        const imageResult = await this.s3Service.uploadFileToS3(files.image[0], 'question-groups/images')
        imageUrl = imageResult.url
        imageFile = files.image[0]
      }

      if (files.audio?.[0]) {
        const audioResult = await this.s3Service.uploadFileToS3(files.audio[0], 'question-groups/audio')
        audioUrl = audioResult.url
        audioFile = files.audio[0]
      }

      // Create media record in database with both files info
      if (imageUrl || audioUrl) {
        // Primary URL is image if available, otherwise audio
        const primaryUrl = imageUrl || audioUrl!
        const primaryKind = imageUrl ? 'IMAGE' : 'AUDIO'

        // Build metadata to store info about both files
        const mediaMeta: any = {}
        if (imageUrl && audioUrl) {
          // Both files uploaded
          mediaMeta.hasMultiple = true
          mediaMeta.image = {
            url: imageUrl,
            mimeType: imageFile?.mimetype,
            sizeByte: imageFile?.size,
          }
          mediaMeta.audio = {
            url: audioUrl,
            mimeType: audioFile?.mimetype,
            sizeByte: audioFile?.size,
          }
        }

        const media = await this.questionGroupRepository.createMedia(
          primaryUrl,
          imageFile?.mimetype || audioFile?.mimetype || 'application/octet-stream',
          imageFile?.size || audioFile?.size || 0,
          undefined,
          primaryKind,
          Object.keys(mediaMeta).length > 0 ? mediaMeta : undefined,
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

    // Check if question group is used in any assessment or quiz
    const isUsed = await this.questionGroupRepository.isQuestionGroupUsed(id)
    if (isUsed) {
      throw new BadRequestException(
        'Cannot delete this question group as it is already used in assessments or quizzes. Question groups in use are protected from deletion.',
      )
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

  // ============= VERSIONING METHODS =============

  /**
   * Clone a question group to create a new version with optional modifications
   */
  async cloneQuestionGroup(
    id: number,
    modifications?: {
      type?: string
      title?: string | null
      passage?: string | null
      mediaId?: number | null
      order?: number | null
      metadata?: any
      questionIds?: number[]
    },
  ): Promise<any> {
    const exists = await this.questionGroupRepository.checkExists(id)
    if (!exists) {
      throw new NotFoundException(`Question Group with ID ${id} not found`)
    }

    // Validate mediaId if provided
    if (modifications?.mediaId) {
      const mediaExists = await this.questionGroupRepository.checkMediaExists(modifications.mediaId)
      if (!mediaExists) {
        throw new BadRequestException(`Media with ID ${modifications.mediaId} does not exist`)
      }
    }

    // Validate questionIds if provided
    if (modifications?.questionIds && modifications.questionIds.length > 0) {
      const { existing, missing } = await this.questionGroupRepository.checkQuestionsExist(modifications.questionIds)
      if (missing.length > 0) {
        throw new BadRequestException(`Questions with IDs [${missing.join(', ')}] do not exist`)
      }
    }

    return this.questionGroupRepository.cloneQuestionGroup(id, modifications)
  }

  /**
   * Get all versions of a question group by UUID
   */
  async getQuestionGroupVersions(uuid: string): Promise<any[]> {
    const versions = await this.questionGroupRepository.findVersionsByUuid(uuid)
    if (!versions || versions.length === 0) {
      throw new NotFoundException(`No question groups found with UUID ${uuid}`)
    }

    return versions
  }

  /**
   * Get a specific version of a question group
   */
  async getQuestionGroupByVersion(uuid: string, version: number): Promise<any> {
    const group = await this.questionGroupRepository.findByUuidAndVersion(uuid, version)
    if (!group) {
      throw new NotFoundException(`Question group with UUID ${uuid} and version ${version} not found`)
    }

    return group
  }

  /**
   * Check if a question group can be edited or deleted
   */
  async checkQuestionGroupUsage(id: number): Promise<{
    canEdit: boolean
    canDelete: boolean
    usageDetails: {
      inAssessments: boolean
      inQuizzes: boolean
    }
  }> {
    const exists = await this.questionGroupRepository.checkExists(id)
    if (!exists) {
      throw new NotFoundException(`Question Group with ID ${id} not found`)
    }

    const isUsed = await this.questionGroupRepository.isQuestionGroupUsed(id)

    return {
      canEdit: !isUsed,
      canDelete: !isUsed,
      usageDetails: {
        inAssessments: isUsed,
        inQuizzes: isUsed,
      },
    }
  }
}
