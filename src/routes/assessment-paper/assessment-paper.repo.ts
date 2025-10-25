import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../shared/services/prisma.service'
import { AssessmentPaper, JLPTLevel, Visibility, AssessmentType } from '@prisma/client'
import {
  AssessmentPaperWithRelations,
  AssessmentPaperBasic,
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
        seed: data.seed || null,
        version: data.version || 1,
        generatorVersion: data.generatorVersion || null,
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
                            media: true,
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
}
