import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../shared/services/prisma.service'
import { Prisma } from '@prisma/client'
import {
  TestPaper,
  TestPaperWithRelations,
  TestPaperBasic,
  TestPaperWithSections,
  CreateTestPaperInput,
  UpdateTestPaperInput,
  TestPaperQuery,
  JLPTLevel,
  Visibility,
} from './test-paper.model'

@Injectable()
export class TestPaperRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateTestPaperInput): Promise<TestPaper> {
    return this.prisma.testPaper.create({
      data,
    })
  }

  async findById(id: number): Promise<TestPaper | null> {
    return this.prisma.testPaper.findUnique({
      where: { id },
    })
  }

  async findByIdWithRelations(id: number): Promise<TestPaperWithRelations | null> {
    return this.prisma.testPaper.findUnique({
      where: { id },
      include: {
        blueprint: true,
        sections: {
          include: {
            items: {
              include: {
                question: true,
              },
            },
          },
          orderBy: { order: 'asc' },
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
          take: 10,
        },
      },
    })
  }

  async findByIdWithSections(id: number): Promise<TestPaperWithSections | null> {
    return this.prisma.testPaper.findUnique({
      where: { id },
      include: {
        sections: {
          include: {
            items: {
              include: {
                question: {
                  include: {
                    options: true,
                  },
                },
              },
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    })
  }

  async update(id: number, data: UpdateTestPaperInput): Promise<TestPaper> {
    return this.prisma.testPaper.update({
      where: { id },
      data,
    })
  }

  async delete(id: number): Promise<TestPaper> {
    return this.prisma.testPaper.delete({
      where: { id },
    })
  }

  async findMany(query: TestPaperQuery): Promise<{
    data: TestPaperBasic[]
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
      visibility,
      blueprintId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query

    const skip = (page - 1) * limit

    const where: Prisma.TestPaperWhereInput = {}
    if (search) {
      where.title = {
        contains: search,
        mode: 'insensitive',
      }
    }
    if (level) where.level = level
    if (visibility) where.visibility = visibility
    if (blueprintId) where.blueprintId = blueprintId

    const orderBy: Prisma.TestPaperOrderByWithRelationInput = {}
    if (sortBy && sortOrder) {
      orderBy[sortBy] = sortOrder
    }

    const [data, total] = await Promise.all([
      this.prisma.testPaper.findMany({
        skip,
        take: Number(limit),
        where,
        orderBy,
        include: {
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
      this.prisma.testPaper.count({ where }),
    ])

    return {
      data: data as TestPaperBasic[],
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

  async findByBlueprint(blueprintId: number): Promise<TestPaper[]> {
    return this.prisma.testPaper.findMany({
      where: { blueprintId },
      orderBy: { version: 'desc' },
    })
  }

  async findByLevel(level: JLPTLevel): Promise<TestPaper[]> {
    return this.prisma.testPaper.findMany({
      where: { level },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findPublicTests(level?: JLPTLevel): Promise<TestPaper[]> {
    return this.prisma.testPaper.findMany({
      where: {
        visibility: 'PUBLIC',
        ...(level && { level }),
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  // ===== Bulk Operations =====
  async bulkDelete(ids: number[]): Promise<{ count: number }> {
    return this.prisma.testPaper.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    })
  }

  async bulkUpdateVisibility(ids: number[], visibility: Visibility): Promise<{ count: number }> {
    return this.prisma.testPaper.updateMany({
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
      visibility?: Visibility
      includeAttempts?: boolean
    },
  ): Promise<TestPaper> {
    const original = await this.findByIdWithSections(id)
    if (!original) {
      throw new Error('Test paper not found')
    }

    const clonedPaper = await this.prisma.testPaper.create({
      data: {
        title: data.title || `${original.title} (Copy)`,
        level: data.level || original.level,
        visibility: data.visibility || 'PRIVATE',
        blueprintId: original.blueprintId,
        blueprintSnapshot: original.blueprintSnapshot as any,
        seed: original.seed,
        version: 1,
        generatorVersion: original.generatorVersion,
        generatorMeta: original.generatorMeta as any,
      },
    })

    for (const section of original.sections) {
      const clonedSection = await this.prisma.testSection.create({
        data: {
          testId: clonedPaper.id,
          title: section.title,
          type: section.type,
          order: section.order,
        },
      })

      for (const item of section.items) {
        await this.prisma.testItem.create({
          data: {
            sectionId: clonedSection.id,
            questionId: item.questionId,
            order: item.order,
          },
        })
      }
    }

    return clonedPaper
  }

  async getStatistics(id: number): Promise<any> {
    const stats = await this.prisma.testAttempt.aggregate({
      where: {
        testId: id,
        submittedAt: { not: null },
      },
      _count: { id: true },
      _avg: { score: true },
      _max: { score: true },
      _min: { score: true },
    })

    const totalAttempts = await this.prisma.testAttempt.count({
      where: { testId: id },
    })

    const completionTimeStats = await this.prisma.$queryRaw<Array<{ avg_time: number }>>`
      SELECT AVG(EXTRACT(EPOCH FROM ("submittedAt" - "startedAt"))) as avg_time
      FROM "TestAttempt" 
      WHERE "testId" = ${id} AND "submittedAt" IS NOT NULL
    `

    return {
      totalAttempts,
      completedAttempts: stats._count.id || 0,
      averageScore: stats._avg.score || 0,
      highestScore: stats._max.score || 0,
      lowestScore: stats._min.score || 0,
      averageCompletionTime: completionTimeStats[0]?.avg_time || 0,
    }
  }

  async searchByContent(searchTerm: string, limit: number = 20): Promise<TestPaper[]> {
    return this.prisma.testPaper.findMany({
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
    })
  }

  async exists(id: number): Promise<boolean> {
    const count = await this.prisma.testPaper.count({
      where: { id },
    })
    return count > 0
  }

  async existsByIds(ids: number[]): Promise<number[]> {
    const papers = await this.prisma.testPaper.findMany({
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
    const count = await this.prisma.testPaper.count({
      where: {
        title,
        ...(excludeId && { id: { not: excludeId } }),
      },
    })
    return count > 0
  }

  async getLatestVersion(blueprintId: number): Promise<TestPaper | null> {
    return this.prisma.testPaper.findFirst({
      where: { blueprintId },
      orderBy: { version: 'desc' },
    })
  }

  async getNextVersion(blueprintId: number): Promise<number> {
    const latest = await this.getLatestVersion(blueprintId)
    return latest ? latest.version + 1 : 1
  }
}
