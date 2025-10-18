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

@Injectable()
export class QuestionGroupService {
  constructor(private readonly questionGroupRepository: QuestionGroupRepository) {}

  async create(createDto: CreateQuestionGroupDTO): Promise<any> {
    const { questions, mediaId, metadata, ...groupData } = createDto

    if (mediaId) {
      const mediaExists = await this.questionGroupRepository.checkMediaExists(mediaId)
      if (!mediaExists) {
        throw new BadRequestException(`Media with ID ${mediaId} does not exist`)
      }
    }

    // Validate questions exist if provided
    if (questions && questions.length > 0) {
      const { existing, missing } = await this.questionGroupRepository.checkQuestionsExist(questions)
      if (missing.length > 0) {
        throw new BadRequestException(`Questions with IDs [${missing.join(', ')}] do not exist`)
      }
    }

    const groupCreateData: any = {
      ...groupData,
      metadata: metadata || null,
    }

    if (mediaId) {
      groupCreateData.media = { connect: { id: mediaId } }
    }

    return this.questionGroupRepository.createWithQuestions(groupCreateData, questions || [])
  }

  async findAll(queryDto: QueryQuestionGroupDTO) {
    const { page, limit, type, hasMedia, hasPassage, keyword, sortBy, sortOrder } = queryDto

    const skip = (page - 1) * limit

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

    // Build order by clause
    const orderBy: any = {}
    if (sortBy && sortOrder) {
      orderBy[sortBy] = sortOrder
    }

    const [groups, total] = await Promise.all([
      this.questionGroupRepository.findManyWithStats({
        skip,
        take: limit,
        where,
        orderBy,
      }),
      this.questionGroupRepository.count(where),
    ])

    // Transform groups to include stats
    const transformedGroups = groups.map((group) => ({
      ...group,
      questionsCount: group._count?.questions || 0,
      hasMedia: !!group.mediaId,
      hasPassage: !!group.passage,
    }))

    return {
      data: transformedGroups,
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
    const group = await this.questionGroupRepository.findUnique({ id }, true)
    if (!group) {
      throw new NotFoundException(`Question Group with ID ${id} not found`)
    }
    return group
  }

  async update(id: number, updateDto: UpdateQuestionGroupDTO): Promise<any> {
    const exists = await this.questionGroupRepository.checkExists(id)
    if (!exists) {
      throw new NotFoundException(`Question Group with ID ${id} not found`)
    }

    const { questions, mediaId, ...groupData } = updateDto

    if (mediaId) {
      const mediaExists = await this.questionGroupRepository.checkMediaExists(mediaId)
      if (!mediaExists) {
        throw new BadRequestException(`Media with ID ${mediaId} does not exist`)
      }
    }

    // Validate questions exist if provided
    if (questions && questions.length > 0) {
      const { existing, missing } = await this.questionGroupRepository.checkQuestionsExist(questions)
      if (missing.length > 0) {
        throw new BadRequestException(`Questions with IDs [${missing.join(', ')}] do not exist`)
      }
    }

    const updateData: any = {
      ...groupData,
      metadata: groupData.metadata || null,
    }

    if (mediaId) {
      updateData.media = { connect: { id: mediaId } }
    }

    return this.questionGroupRepository.updateWithQuestions(id, updateData, questions)
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
