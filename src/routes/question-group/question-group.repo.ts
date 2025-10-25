import { Injectable } from '@nestjs/common'
import { QuestionGroupTypeType } from 'src/shared/constants/enum.constant'
import { PrismaService } from 'src/shared/services/prisma.service'

@Injectable()
export class QuestionGroupRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Helper function to transform question data from many-to-many relation
  private transformQuestions(questionGroupQuestions: any[]) {
    return questionGroupQuestions.map((qgq) => ({
      id: qgq.question.id,
      stem: qgq.question.stem,
      type: qgq.question.type,
      level: qgq.question.level,
      difficulty: qgq.question.difficulty,
      order: qgq.order,
      score: qgq.score,
    }))
  }

  async create(data: any): Promise<any> {
    const group = await this.prisma.questionGroup.create({
      data,
    })

    return {
      id: group.id,
      type: group.type,
      title: group.title,
      passage: group.passage,
      mediaId: group.mediaId,
      order: group.order,
      metadata: group.metadata,
      createdAt: group.createdAt,
      questions: [],
      media: null,
      questionsCount: 0,
    }
  }

  async createWithQuestions(groupData: any, questionIds: number[] = []): Promise<any> {
    const group = await this.prisma.questionGroup.create({
      data: {
        ...groupData,
      },
    })

    // Create many-to-many relations if questionIds provided
    if (questionIds.length > 0) {
      await this.prisma.questionGroupQuestion.createMany({
        data: questionIds.map((questionId, index) => ({
          groupId: group.id,
          questionId,
          order: index + 1,
        })),
      })
    }

    // Fetch the complete group with questions
    const groupWithQuestions = await this.prisma.questionGroup.findUnique({
      where: { id: group.id },
      include: {
        questions: {
          include: {
            question: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
        media: true,
        _count: {
          select: {
            questions: true,
          },
        },
      },
    })

    if (!groupWithQuestions) return null

    return {
      id: groupWithQuestions.id,
      type: groupWithQuestions.type,
      title: groupWithQuestions.title,
      passage: groupWithQuestions.passage,
      mediaId: groupWithQuestions.mediaId,
      order: groupWithQuestions.order,
      metadata: groupWithQuestions.metadata,
      createdAt: groupWithQuestions.createdAt,
      questions: this.transformQuestions(groupWithQuestions.questions),
      media: groupWithQuestions.media,
      questionsCount: groupWithQuestions._count.questions,
    }
  }

  async findMany(params: {
    skip?: number
    take?: number
    where?: any
    orderBy?: any
    includeQuestions?: boolean
  }): Promise<any[]> {
    const { skip, take, where, orderBy, includeQuestions = false } = params

    if (includeQuestions) {
      const groups = await this.prisma.questionGroup.findMany({
        ...(skip !== undefined && { skip }),
        ...(take !== undefined && { take }),
        where,
        orderBy,
        include: {
          questions: {
            include: {
              question: true,
            },
            orderBy: {
              order: 'asc',
            },
          },
          media: true,
          _count: {
            select: {
              questions: true,
            },
          },
        },
      })

      return groups.map((group) => ({
        id: group.id,
        type: group.type,
        title: group.title,
        passage: group.passage,
        mediaId: group.mediaId,
        order: group.order,
        metadata: group.metadata,
        createdAt: group.createdAt,
        questions: this.transformQuestions(group.questions),
        media: group.media,
        questionsCount: group._count.questions,
      }))
    }

    return await this.prisma.questionGroup.findMany({
      ...(skip !== undefined && { skip }),
      ...(take !== undefined && { take }),
      where,
      orderBy,
    })
  }

  async findManyWithStats(params: { skip?: number; take?: number; where?: any; orderBy?: any }) {
    const { skip, take, where, orderBy } = params

    return await this.prisma.questionGroup.findMany({
      skip,
      take,
      where,
      orderBy,
      include: {
        _count: {
          select: {
            questions: true,
          },
        },
        media: {
          select: {
            id: true,
            url: true,
            kind: true,
            caption: true,
          },
        },
      },
    })
  }

  async findManyWithPagination(params: { page?: number; limit?: number; where?: any; orderBy?: any }): Promise<{
    data: any[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }> {
    const { page = 1, limit = 10, where, orderBy } = params

    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      this.prisma.questionGroup.findMany({
        skip,
        take: Number(limit),
        where,
        orderBy,
        include: {
          _count: {
            select: {
              questions: true,
            },
          },
          media: {
            select: {
              id: true,
              url: true,
              kind: true,
              caption: true,
            },
          },
        },
      }),
      this.prisma.questionGroup.count({ where }),
    ])

    // Transform data to include questionsCount, hasMedia, hasPassage
    const transformedData = data.map((group) => ({
      id: group.id,
      type: group.type,
      title: group.title,
      passage: group.passage,
      mediaId: group.mediaId,
      order: group.order,
      metadata: group.metadata,
      createdAt: group.createdAt,
      questionsCount: group._count.questions,
      hasMedia: !!group.mediaId,
      hasPassage: !!group.passage,
      media: group.media,
    }))

    return {
      data: transformedData,
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

  async findUnique(where: any, includeQuestions = true): Promise<any | null> {
    if (includeQuestions) {
      const group = await this.prisma.questionGroup.findUnique({
        where,
        include: {
          questions: {
            include: {
              question: {
                include: {
                  option: {
                    select: {
                      id: true,
                      content: true,
                      mediaId: true,
                      image: {
                        select: {
                          id: true,
                          url: true,
                          kind: true,
                          sizeByte: true,
                        },
                      },
                    },
                  },
                },
              },
            },
            orderBy: {
              order: 'asc',
            },
          },
          media: true,
          _count: {
            select: {
              questions: true,
            },
          },
        },
      })

      if (!group) return null

      return group
    }

    return await this.prisma.questionGroup.findUnique({
      where,
    })
  }

  async update(where: any, data: any): Promise<any> {
    const group = await this.prisma.questionGroup.update({
      where,
      data,
    })

    // Fetch with relations
    const groupWithQuestions = await this.prisma.questionGroup.findUnique({
      where: { id: group.id },
      include: {
        questions: {
          include: {
            question: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
        media: true,
        _count: {
          select: {
            questions: true,
          },
        },
      },
    })

    if (!groupWithQuestions) return null

    return {
      id: groupWithQuestions.id,
      type: groupWithQuestions.type,
      title: groupWithQuestions.title,
      passage: groupWithQuestions.passage,
      mediaId: groupWithQuestions.mediaId,
      order: groupWithQuestions.order,
      metadata: groupWithQuestions.metadata,
      createdAt: groupWithQuestions.createdAt,
      questions: this.transformQuestions(groupWithQuestions.questions),
      media: groupWithQuestions.media,
      questionsCount: groupWithQuestions._count.questions,
    }
  }

  async updateWithQuestions(groupId: number, groupData: any, questionIds?: number[]): Promise<any> {
    return await this.prisma.$transaction(async (tx) => {
      // Update group data
      if (Object.keys(groupData).length > 0) {
        await tx.questionGroup.update({
          where: { id: groupId },
          data: groupData,
        })
      }

      // Update questions if provided
      if (questionIds !== undefined) {
        // First, delete all existing relations
        await tx.questionGroupQuestion.deleteMany({
          where: { groupId },
        })

        // Then create new relations
        if (questionIds.length > 0) {
          await tx.questionGroupQuestion.createMany({
            data: questionIds.map((questionId, index) => ({
              groupId,
              questionId,
              order: index + 1,
            })),
          })
        }
      }

      // Return updated group with questions
      const group = await tx.questionGroup.findUnique({
        where: { id: groupId },
        include: {
          questions: {
            include: {
              question: true,
            },
            orderBy: {
              order: 'asc',
            },
          },
          media: true,
          _count: {
            select: {
              questions: true,
            },
          },
        },
      })

      if (!group) return null

      return {
        id: group.id,
        type: group.type,
        title: group.title,
        passage: group.passage,
        mediaId: group.mediaId,
        order: group.order,
        metadata: group.metadata,
        createdAt: group.createdAt,
        questions: this.transformQuestions(group.questions),
        media: group.media,
        questionsCount: group._count.questions,
      }
    })
  }

  async delete(where: any): Promise<any> {
    return await this.prisma.$transaction(async (tx) => {
      // Delete all QuestionGroupQuestion relations first (cascade will handle this, but explicit is better)
      await tx.questionGroupQuestion.deleteMany({
        where: { groupId: where.id },
      })

      // Then delete the group
      return await tx.questionGroup.delete({
        where,
      })
    })
  }

  async count(where?: any): Promise<number> {
    return await this.prisma.questionGroup.count({ where })
  }

  async getStatistics(): Promise<{
    totalGroups: number
    byType: Record<string, number>
    withMedia: number
    withoutMedia: number
    withPassage: number
    withoutPassage: number
    averageQuestionsPerGroup: number
  }> {
    const [total, byType, withMedia, withoutMedia, withPassage, withoutPassage, questionCounts] = await Promise.all([
      // Total count
      this.prisma.questionGroup.count(),

      // Group by type
      this.prisma.questionGroup.groupBy({
        by: ['type'],
        _count: { _all: true },
      }),

      // With media
      this.prisma.questionGroup.count({
        where: { mediaId: { not: null } },
      }),

      // Without media
      this.prisma.questionGroup.count({
        where: { mediaId: null },
      }),

      // With passage
      this.prisma.questionGroup.count({
        where: { passage: { not: null } },
      }),

      // Without passage
      this.prisma.questionGroup.count({
        where: { passage: null },
      }),

      // Question counts for average calculation
      this.prisma.questionGroup.findMany({
        select: {
          _count: {
            select: { questions: true },
          },
        },
      }),
    ])

    const totalQuestions = questionCounts.reduce((sum, group) => sum + group._count.questions, 0)
    const averageQuestionsPerGroup = total > 0 ? totalQuestions / total : 0

    return {
      totalGroups: total,
      byType: Object.fromEntries(byType.map((item) => [item.type, item._count._all])),
      withMedia,
      withoutMedia,
      withPassage,
      withoutPassage,
      averageQuestionsPerGroup: Math.round(averageQuestionsPerGroup * 100) / 100, // Round to 2 decimal places
    }
  }

  async bulkCreate(
    groups: Array<{
      groupData: any
      questionIds: number[]
    }>,
  ): Promise<any[]> {
    return await this.prisma.$transaction(async (tx) => {
      const createdGroups: any[] = []

      for (const { groupData, questionIds } of groups) {
        const group = await tx.questionGroup.create({
          data: {
            ...groupData,
          },
        })

        // Create many-to-many relations
        if (questionIds.length > 0) {
          await tx.questionGroupQuestion.createMany({
            data: questionIds.map((questionId, index) => ({
              groupId: group.id,
              questionId,
              order: index + 1,
            })),
          })
        }

        // Fetch with questions
        const groupWithQuestions = await tx.questionGroup.findUnique({
          where: { id: group.id },
          include: {
            questions: {
              include: {
                question: true,
              },
              orderBy: {
                order: 'asc',
              },
            },
            media: true,
            _count: {
              select: {
                questions: true,
              },
            },
          },
        })

        if (groupWithQuestions) {
          createdGroups.push({
            id: groupWithQuestions.id,
            type: groupWithQuestions.type,
            title: groupWithQuestions.title,
            passage: groupWithQuestions.passage,
            mediaId: groupWithQuestions.mediaId,
            order: groupWithQuestions.order,
            metadata: groupWithQuestions.metadata,
            createdAt: groupWithQuestions.createdAt,
            questions: this.transformQuestions(groupWithQuestions.questions),
            media: groupWithQuestions.media,
            questionsCount: groupWithQuestions._count.questions,
          })
        }
      }

      return createdGroups
    })
  }

  async addQuestionsToGroup(groupId: number, questionIds: number[]): Promise<any> {
    return await this.prisma.$transaction(async (tx) => {
      // Get current max order
      const currentQuestions = await tx.questionGroupQuestion.findMany({
        where: { groupId },
        orderBy: { order: 'desc' },
        take: 1,
      })

      const startOrder = currentQuestions.length > 0 ? (currentQuestions[0].order || 0) + 1 : 1

      // Create new relations (append to existing)
      await tx.questionGroupQuestion.createMany({
        data: questionIds.map((questionId, index) => ({
          groupId,
          questionId,
          order: startOrder + index,
        })),
        skipDuplicates: true, // Skip if already exists
      })

      // Return updated group
      const group = await tx.questionGroup.findUnique({
        where: { id: groupId },
        include: {
          questions: {
            include: {
              question: true,
            },
            orderBy: {
              order: 'asc',
            },
          },
          media: true,
          _count: {
            select: {
              questions: true,
            },
          },
        },
      })

      if (!group) return null

      return {
        id: group.id,
        type: group.type,
        title: group.title,
        passage: group.passage,
        mediaId: group.mediaId,
        order: group.order,
        metadata: group.metadata,
        createdAt: group.createdAt,
        questions: this.transformQuestions(group.questions),
        media: group.media,
        questionsCount: group._count.questions,
      }
    })
  }

  async removeQuestionsFromGroup(groupId: number, questionIds: number[]): Promise<any> {
    return await this.prisma.$transaction(async (tx) => {
      // Delete specific relations
      await tx.questionGroupQuestion.deleteMany({
        where: {
          groupId,
          questionId: { in: questionIds },
        },
      })

      // Return updated group
      const group = await tx.questionGroup.findUnique({
        where: { id: groupId },
        include: {
          questions: {
            include: {
              question: true,
            },
            orderBy: {
              order: 'asc',
            },
          },
          media: true,
          _count: {
            select: {
              questions: true,
            },
          },
        },
      })

      if (!group) return null

      return {
        id: group.id,
        type: group.type,
        title: group.title,
        passage: group.passage,
        mediaId: group.mediaId,
        order: group.order,
        metadata: group.metadata,
        createdAt: group.createdAt,
        questions: this.transformQuestions(group.questions),
        media: group.media,
        questionsCount: group._count.questions,
      }
    })
  }

  async checkExists(id: number): Promise<boolean> {
    const count = await this.prisma.questionGroup.count({
      where: { id },
    })
    return count > 0
  }

  async checkMediaExists(mediaId: number): Promise<boolean> {
    const count = await this.prisma.mediaAsset.count({
      where: { id: mediaId },
    })
    return count > 0
  }

  async checkQuestionsExist(questionIds: number[]): Promise<{
    existing: number[]
    missing: number[]
  }> {
    const existingQuestions = await this.prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: { id: true },
    })

    const existing = existingQuestions.map((q) => q.id)
    const missing = questionIds.filter((id) => !existing.includes(id))

    return { existing, missing }
  }
  async getGroupsByType(type: QuestionGroupTypeType): Promise<any[]> {
    const groups = await this.prisma.questionGroup.findMany({
      where: { type: type as any },
      include: {
        questions: {
          include: {
            question: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
        media: true,
        _count: {
          select: {
            questions: true,
          },
        },
      },
    })

    return groups.map((group) => ({
      id: group.id,
      type: group.type,
      title: group.title,
      passage: group.passage,
      mediaId: group.mediaId,
      order: group.order,
      metadata: group.metadata,
      createdAt: group.createdAt,
      questions: this.transformQuestions(group.questions),
      media: group.media,
      questionsCount: group._count.questions,
    }))
  }

  async createMedia(url: string, mimeType: string, sizeByte: number, caption?: string) {
    return await this.prisma.mediaAsset.create({
      data: {
        url,
        mimeType,
        sizeByte,
        caption,
        kind: 'OTHER',
        status: 'READY',
      },
    })
  }
}
