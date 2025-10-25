import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../shared/services/prisma.service'
import { AssessmentPaper, JLPTLevel, Visibility, AssessmentType } from '@prisma/client'
import {
  AssessmentPaperWithRelations,
  AssessmentPaperBasic,
  AssessmentPaperWithSections,
  CreateAssessmentPaperInput,
  UpdateAssessmentPaperInput,
  AssessmentPaperQuery,
} from './assessment-paper.model'

@Injectable()
export class AssessmentPaperRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAssessmentPaperInput): Promise<AssessmentPaper> {
    return await this.prisma.assessmentPaper.create({
      data: {
        title: data.title,
        level: data.level,
        type: data.type,
        visibility: data.visibility || 'PRIVATE',
        createdBy: data.createdBy,
        scoreProfileId: data.scoreProfileId,
        blueprintId: data.blueprintId || null,
        blueprintSnapshot: data.blueprintSnapshot || null,
        seed: data.seed || null,
        version: data.version || 1,
        generatorVersion: data.generatorVersion || null,
        generatorMeta: data.generatorMeta || null,
      },
    })
  }

  async findById(id: number): Promise<AssessmentPaper | null> {
    return await this.prisma.assessmentPaper.findUnique({
      where: { id },
      include: {
        scoreProfile: {
          select: {
            id: true,
            name: true,
            level: true,
            maxTotal: true,
            mappings: true,
          },
        },
        sections: {
          include: {
            items: {
              include: {
                question: {
                  include: {
                    option: true,
                  },
                },
                questionGroup: {
                  include: {
                    media: true,
                    questions: {
                      include: {
                        question: {
                          include: {
                            option: {
                              select: {
                                id: true,
                                content: true,
                                mediaId: true,
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })
  }

  async findByIdWithRelations(id: number): Promise<AssessmentPaperWithRelations | null> {
    return (await this.prisma.assessmentPaper.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        scoreProfile: {
          select: {
            id: true,
            name: true,
            level: true,
            maxTotal: true,
            mappings: true,
          },
        },
        blueprint: {
          select: {
            id: true,
            level: true,
            totalQuestions: true,
          },
        },
        sections: {
          include: {
            items: {
              include: {
                question: {
                  include: {
                    option: {
                      select: {
                        id: true,
                        content: true,
                        mediaId: true,
                        order: true,
                        isCorrect: false, // Hide correct answers for security
                      },
                    },
                    media: true,
                  },
                },
                questionGroup: {
                  include: {
                    media: true,
                    questions: {
                      include: {
                        question: {
                          include: {
                            option: {
                              select: {
                                id: true,
                                content: true,
                                mediaId: true,
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              orderBy: { order: 'asc' },
            },
          },
        },
        attempts: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { startedAt: 'desc' },
          take: 10, // Limit recent attempts
        },
      },
    })) as AssessmentPaperWithRelations | null
  }

  async findByIdWithSections(id: number): Promise<AssessmentPaperWithSections | null> {
    return (await this.prisma.assessmentPaper.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        scoreProfile: {
          select: {
            id: true,
            name: true,
            level: true,
          },
        },
        sections: {
          include: {
            items: {
              include: {
                question: {
                  include: {
                    option: true,
                  },
                },
                questionGroup: {
                  include: {
                    media: true,
                    questions: {
                      include: {
                        question: {
                          include: {
                            option: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    })) as AssessmentPaperWithSections
  }

  async update(id: number, data: UpdateAssessmentPaperInput): Promise<AssessmentPaper> {
    return await this.prisma.assessmentPaper.update({
      where: { id },
      data,
    })
  }

  async delete(id: number): Promise<AssessmentPaper> {
    return await this.prisma.assessmentPaper.delete({
      where: { id },
    })
  }

  async findMany(query: AssessmentPaperQuery): Promise<{
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
    const {
      page = 1,
      limit = 20,
      search,
      level,
      type,
      visibility,
      createdBy,
      lessonId,
      blueprintId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query

    const skip = (page - 1) * limit

    const where: any = {}
    if (search) {
      where.title = {
        contains: search,
        mode: 'insensitive',
      }
    }
    if (level) where.level = level
    if (type) where.type = type
    if (visibility) where.visibility = visibility
    if (createdBy) where.createdBy = createdBy
    if (lessonId) where.lessonId = lessonId
    if (blueprintId) where.blueprintId = blueprintId

    const orderBy: any = {}
    if (sortBy && sortOrder) {
      orderBy[sortBy] = sortOrder
    }

    const [data, total] = await Promise.all([
      this.prisma.assessmentPaper.findMany({
        skip,
        take: Number(limit),
        where,
        orderBy,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          scoreProfile: {
            select: {
              id: true,
              name: true,
              level: true,
            },
          },
          blueprint: {
            select: {
              id: true,
              level: true,
            },
          },
          _count: {
            select: {
              sections: true,
              attempts: true,
            },
          },
        },
      }),
      this.prisma.assessmentPaper.count({ where }),
    ])

    return {
      data: data as AssessmentPaperBasic[],
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

  async findByBlueprint(blueprintId: number): Promise<AssessmentPaper[]> {
    return await this.prisma.assessmentPaper.findMany({
      where: { blueprintId },
      orderBy: { version: 'desc' },
    })
  }

  async findByLevel(level: JLPTLevel): Promise<AssessmentPaper[]> {
    return await this.prisma.assessmentPaper.findMany({
      where: { level },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findByCreator(createdBy: number): Promise<AssessmentPaper[]> {
    return await this.prisma.assessmentPaper.findMany({
      where: { createdBy },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findPublicAssessments(level?: JLPTLevel, type?: AssessmentType): Promise<AssessmentPaper[]> {
    return await this.prisma.assessmentPaper.findMany({
      where: {
        visibility: 'PUBLIC',
        ...(level && { level }),
        ...(type && { type }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            sections: true,
            attempts: true,
          },
        },
      },
    })
  }

  // ===== Bulk Operations =====
  async bulkDelete(ids: number[]): Promise<{ count: number }> {
    return await this.prisma.assessmentPaper.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    })
  }

  async bulkUpdateVisibility(ids: number[], visibility: Visibility): Promise<{ count: number }> {
    return await this.prisma.assessmentPaper.updateMany({
      where: {
        id: {
          in: ids,
        },
      },
      data: { visibility },
    })
  }

  async clone(
    id: number,
    data: {
      title?: string
      level?: JLPTLevel
      type?: AssessmentType
      visibility?: Visibility
      createdBy: number
      scoreProfileId?: number
      includeAttempts?: boolean
    },
  ): Promise<AssessmentPaper> {
    const original = await this.findByIdWithSections(id)
    if (!original) {
      throw new Error('Assessment paper not found')
    }

    const clonedPaper = await this.prisma.assessmentPaper.create({
      data: {
        title: data.title || `${original.title} (Copy)`,
        level: data.level || original.level,
        type: data.type || original.type,
        visibility: data.visibility || 'PRIVATE',
        createdBy: data.createdBy,
        scoreProfileId: data.scoreProfileId || original.scoreProfileId,
        blueprintId: original.blueprintId,
        blueprintSnapshot: original.blueprintSnapshot as any,
        seed: original.seed,
        version: 1,
        generatorVersion: original.generatorVersion,
        generatorMeta: original.generatorMeta as any,
      },
    })

    // Clone sections and items
    for (const section of original.sections) {
      const clonedSection = await this.prisma.assessmentSection.create({
        data: {
          assessmentId: clonedPaper.id,
          title: section.title,
          type: section.type,
        },
      })

      for (const item of section.items) {
        await this.prisma.assessmentItem.create({
          data: {
            sectionId: clonedSection.id,
            questionId: item.questionId,
            questionGroupId: item.questionGroupId,
            order: item.order,
          },
        })
      }
    }

    return clonedPaper
  }

  async getStatistics(id: number): Promise<any> {
    const stats = await this.prisma.assessmentAttempt.aggregate({
      where: {
        assessmentId: id,
        submittedAt: { not: null },
      },
      _count: { id: true },
      _avg: { score: true, earnedScore: true },
      _max: { score: true, earnedScore: true },
      _min: { score: true, earnedScore: true },
    })

    const totalAttempts = await this.prisma.assessmentAttempt.count({
      where: { assessmentId: id },
    })

    // Calculate completion time using raw query
    const completionTimeStats = await this.prisma.$queryRaw<Array<{ avg_time: number }>>`
      SELECT AVG(EXTRACT(EPOCH FROM ("submittedAt" - "startedAt"))) as avg_time
      FROM "AssessmentAttempt" 
      WHERE "assessmentId" = ${id} AND "submittedAt" IS NOT NULL
    `

    return {
      totalAttempts,
      completedAttempts: stats._count.id || 0,
      averageScore: stats._avg.score || 0,
      highestScore: stats._max.score || 0,
      lowestScore: stats._min.score || 0,
      averageEarnedScore: stats._avg.earnedScore || 0,
      highestEarnedScore: stats._max.earnedScore || 0,
      lowestEarnedScore: stats._min.earnedScore || 0,
      averageCompletionTime: completionTimeStats[0]?.avg_time || 0,
    }
  }

  async searchByContent(searchTerm: string, limit: number = 20): Promise<AssessmentPaper[]> {
    return await this.prisma.assessmentPaper.findMany({
      where: {
        OR: [
          {
            title: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
          {
            sections: {
              some: {
                title: {
                  contains: searchTerm,
                  mode: 'insensitive',
                },
              },
            },
          },
        ],
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            sections: true,
            attempts: true,
          },
        },
      },
    })
  }

  async exists(id: number): Promise<boolean> {
    const count = await this.prisma.assessmentPaper.count({
      where: { id },
    })
    return count > 0
  }

  async existsByIds(ids: number[]): Promise<number[]> {
    const papers = await this.prisma.assessmentPaper.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: { id: true },
    })
    return papers.map((p) => p.id)
  }

  async getTitleExists(title: string, excludeId?: number): Promise<boolean> {
    const count = await this.prisma.assessmentPaper.count({
      where: {
        title,
        ...(excludeId && { id: { not: excludeId } }),
      },
    })
    return count > 0
  }

  async getLatestVersion(blueprintId: number): Promise<AssessmentPaper | null> {
    return await this.prisma.assessmentPaper.findFirst({
      where: { blueprintId },
      orderBy: { version: 'desc' },
    })
  }

  async getNextVersion(blueprintId: number): Promise<number> {
    const latest = await this.getLatestVersion(blueprintId)
    return latest ? latest.version + 1 : 1
  }

  async getUserAccess(assessmentId: number, userId: number): Promise<boolean> {
    const assessment = await this.prisma.assessmentPaper.findUnique({
      where: { id: assessmentId },
      select: {
        visibility: true,
        createdBy: true,
      },
    })

    if (!assessment) return false

    if (assessment.visibility === 'PUBLIC') return true

    if (assessment.createdBy === userId) return true

    return false
  }

  async getAssessmentForAttempt(id: number): Promise<AssessmentPaper | null> {
    return await this.prisma.assessmentPaper.findUnique({
      where: { id },
      include: {
        sections: {
          include: {
            items: {
              include: {
                question: {
                  include: {
                    option: {
                      select: {
                        id: true,
                        content: true,
                        mediaId: true,
                        order: true,
                        // Don't include isCorrect for security
                      },
                    },
                    media: true,
                  },
                },
                questionGroup: {
                  include: {
                    media: true,
                    questions: {
                      include: {
                        question: {
                          include: {
                            option: {
                              select: {
                                id: true,
                                content: true,
                                mediaId: true,
                                order: true,
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    })
  }
}
